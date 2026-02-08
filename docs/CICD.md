# CI/CD Configuration — bills.bio

Automated deployment for frontend and backend using GitHub Actions.

---

## Overview

Two workflows automate deployments:

1. **Frontend** (`.github/workflows/deploy.yml`) — Deploys Next.js app to S3 + CloudFront
2. **Backend** (`.github/workflows/deploy-agent.yml`) — Deploys Python agent to EC2

Both trigger on push to `main` (path-filtered) and support manual dispatch.

---

## Prerequisites

### 1. AWS Infrastructure

Deploy these stacks first (see `docs/DEPLOYMENT_GUIDE.md`):

- **EC2 agent stack** (`bills-bio-agent`) — EC2 instance + ALB + target group
- **S3 stack** (`bills-bio-s3`) — S3 bucket + CloudFront distribution
- **SSM parameters** — Agent secrets at `/bills-bio/agent/` (OPENAI_API_KEY, etc.)

### 2. GitHub Secrets

Add these secrets in **GitHub → Settings → Secrets and variables → Actions**:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

The IAM user needs:
- **CloudFormation**: Read stack outputs for `bills-bio-s3` and `bills-bio-agent`
- **S3**: `s3:PutObject`, `s3:DeleteObject` on the static bucket
- **CloudFront**: `cloudfront:CreateInvalidation` on the distribution
- **EC2**: `ec2:DescribeInstances` to find the agent instance
- **ELB**: `elbv2:DescribeTargetGroups`, `elbv2:RegisterTargets`
- **SSM**: `ssm:SendCommand`, `ssm:GetCommandInvocation` for the agent instance

Example IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks"
      ],
      "Resource": [
        "arn:aws:cloudformation:us-east-1:ACCOUNT_ID:stack/bills-bio-s3/*",
        "arn:aws:cloudformation:us-east-1:ACCOUNT_ID:stack/bills-bio-agent/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::bills-bio-static-*",
        "arn:aws:s3:::bills-bio-static-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elbv2:DescribeTargetGroups",
        "elbv2:RegisterTargets"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation"
      ],
      "Resource": [
        "arn:aws:ec2:us-east-1:ACCOUNT_ID:instance/*",
        "arn:aws:ssm:us-east-1::document/AWS-RunShellScript",
        "arn:aws:ssm:us-east-1:ACCOUNT_ID:*"
      ]
    }
  ]
}
```

---

## Frontend Deployment

**Workflow**: `.github/workflows/deploy.yml`

### Trigger

- **Automatic**: Push to `main` when `apps/web/**` changes
- **Manual**: GitHub Actions → Deploy frontend → Run workflow

### Process

1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. Build Next.js app (`npm run build`)
5. Configure AWS credentials
6. Get S3 bucket and CloudFront distribution ID from `bills-bio-s3` stack
7. Sync `out/` to S3 (`aws s3 sync --delete`)
8. Invalidate CloudFront cache (`/*`)

### ⚠️ Critical Issue: Frontend Requires Node.js Server

**The current frontend deployment workflow is BROKEN and will not work.**

The app has extensive API routes (`/api/analytics`, `/api/billing`, `/api/blog`, `/api/conversations`, `/api/profiles`, `/api/tracking`, etc.) that require a Node.js server.

The current CloudFormation stack (`bills-bio-s3`) only supports:
- Static files from S3
- `/api/chat*` proxied to the agent backend

**All other API routes will fail with 404/403 errors.**

### Solutions

**Option 1: Deploy to Vercel (Recommended)**

Vercel provides zero-config Next.js deployment with all features working:

```bash
cd apps/web
vercel --prod
```

See `docs/VERCEL_DEPLOYMENT.md` for full setup guide. This replaces the S3 + CloudFront frontend entirely.

**Option 2: Deploy Next.js Server to EC2**

Create a new EC2 instance or container to run the Next.js server:

1. Build: `npm run build` (creates `.next/`)
2. Start: `npm run start` (runs Next.js server on port 3000)
3. Update CloudFront to proxy all `/api/*` to the Next.js origin
4. Serve static assets (`/_next/static/*`) from CloudFront cache

**Option 3: Refactor Frontend to Be Truly Static**

Move all backend logic to the Python agent and remove all `/api/*` routes except `/api/chat*`. This is a large refactoring effort.

### Current State

The `.github/workflows/deploy.yml` workflow is currently **non-functional** and should not be used until one of the above solutions is implemented.

### Verification

After deployment:
- Visit `https://bills.bio` (or your domain)
- Check CloudFront distribution in AWS Console
- Check S3 bucket contents

---

## Backend Deployment

**Workflow**: `.github/workflows/deploy-agent.yml`

### Trigger

- **Automatic**: Push to `main` when `apps/agent/**` changes
- **Manual**: GitHub Actions → Deploy agent → Run workflow

### Process

1. Checkout code
2. Configure AWS credentials
3. Get deployment resources:
   - EC2 instance ID from `bills-bio-agent` stack
   - Target group ARN
   - S3 bucket from `bills-bio-s3` stack
   - SSM parameter prefix (default: `/bills-bio/agent/`)
4. Verify all resources exist (fail early if missing)
5. Package `apps/agent/` into `agent.zip`
6. Upload to `s3://BUCKET/deploy/agent.zip`
7. Use SSM Send Command to run on EC2 instance:
   - Download zip from S3
   - Extract to `/tmp/agent-extract/agent`
   - Build Docker image (`docker build -t bills-agent`)
   - Stop and remove old container
   - Fetch SSM parameters to `/tmp/agent.env` (host fetches, not container)
   - Verify `OPENAI_API_KEY` exists (fail if missing)
   - Run new container with `--env-file /tmp/agent.env`
   - Test health endpoint (`http://127.0.0.1:8000/health`)
8. Wait for SSM command to complete (up to 3 minutes)
9. Register instance with target group (ensures ALB sees it as healthy)

### SSM Parameters Required

The agent **must** have `OPENAI_API_KEY` in SSM at `/bills-bio/agent/`.

To set up (from your local machine, once per environment):

```bash
cd apps/agent
cp .env.example .env
# Edit .env: set OPENAI_API_KEY=sk-...
python3 scripts/setup_ssm.py --env-file .env
```

Optional: `SERPER_API_KEY` for web search.

### Verification

After deployment:
- Check GitHub Actions log for SSM command output
- Visit `https://agent.bills.bio/health` → `{"status":"ok"}`
- Check ALB target group: EC2 → Target Groups → bills-bio → Targets tab (should be **healthy**)
- Test chat: `curl -X POST https://agent.bills.bio/chat -H "Content-Type: application/json" -d '{"message":"Hello"}'`

### Troubleshooting

**503 Service Unavailable:**
- ALB has no healthy targets
- Check target group health in AWS Console
- SSH/SSM to instance: `sudo docker logs agent`, `curl http://localhost:8000/health`

**SSM command fails:**
- Check GitHub Actions log for error output
- Common causes: missing SSM parameters, Docker build failure, app crash

**"OPENAI_API_KEY not in SSM":**
- Run `cd apps/agent && python3 scripts/setup_ssm.py --env-file .env` locally
- Redeploy (re-run workflow or push again)

---

## Manual Deployment (Fallback)

If GitHub Actions fails or you need to deploy quickly:

### Frontend

```bash
npm ci
npm run build
BUCKET=$(aws cloudformation describe-stacks --stack-name bills-bio-s3 --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`StaticBucketName`].OutputValue' --output text)
DIST_ID=$(aws cloudformation describe-stacks --stack-name bills-bio-s3 --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)
aws s3 sync out/ "s3://$BUCKET/" --delete --region us-east-1
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --region us-east-1
```

### Backend

```bash
./docs/deploy/fix-agent-on-ec2.sh
```

---

## Workflow Comparison

| Feature | Frontend | Backend |
|---------|----------|---------|
| Workflow file | `.github/workflows/deploy.yml` | `.github/workflows/deploy-agent.yml` |
| Trigger paths | `apps/web/**` | `apps/agent/**` |
| Deploy target | S3 + CloudFront | EC2 (Docker) |
| Deploy time | ~2-3 minutes | ~3-5 minutes |
| Zero downtime | Yes (CloudFront cache) | No (container restart) |
| Secrets required | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Same + SSM parameters |
| Verification | Visit site | `curl https://agent.bills.bio/health` |

---

## Best Practices

1. **Test locally first** — Always test changes locally before pushing to `main`
2. **Monitor deployments** — Check GitHub Actions logs for errors
3. **Verify health** — After backend deploy, check agent health endpoint
4. **Rollback** — If deploy fails, revert commit and push (triggers auto-deploy of previous version)
5. **SSM parameters** — Keep SSM secrets up to date; never commit `.env` files
6. **Path filters** — Workflows only run when relevant files change (reduces AWS costs)

---

## Next Steps

- **Add staging environment** — Create separate stacks (`bills-bio-agent-staging`, etc.) and workflows for testing
- **Add tests** — Run unit tests before deployment
- **Add notifications** — Slack/email alerts on deployment success/failure
- **Add preview deployments** — Deploy PRs to temporary environments
- **Monitor costs** — Set up AWS Budgets alerts for S3, CloudFront, EC2 usage

---

## References

- Main deployment guide: `docs/DEPLOYMENT_GUIDE.md`
- Agent architecture: `docs/AGENT_ARCHITECTURE.md`
- Manual deploy script: `docs/deploy/fix-agent-on-ec2.sh`
- CloudFormation templates: `docs/deploy/*.yaml`
