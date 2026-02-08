# Deployment Guide — bills.bio

Step-by-step guide to deploy the bills.bio stack on AWS: **static frontend** (S3 + CloudFront) and **chat agent** (EC2 + ALB). Use this for first-time setup and as a reference for updates.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [One-time: Agent secrets (SSM)](#2-one-time-agent-secrets-ssm)
3. [One-time: EC2 agent stack](#3-one-time-ec2-agent-stack)
4. [One-time: DNS for the agent](#4-one-time-dns-for-the-agent)
5. [One-time: Frontend stack (S3 + CloudFront)](#5-one-time-frontend-stack-s3--cloudfront)
6. [One-time: DNS for the site](#6-one-time-dns-for-the-site)
7. [First-time: Upload frontend and deploy agent](#7-first-time-upload-frontend-and-deploy-agent)
8. [CI/CD: GitHub Actions (optional)](#8-cicd-github-actions-optional)
9. [Ongoing: Updating the agent](#9-ongoing-updating-the-agent)
10. [Verification and troubleshooting](#10-verification-and-troubleshooting)

---

## 1. Prerequisites

- **AWS account** with CLI configured (`aws configure` or env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
- **Domain** (e.g. `bills.bio`) — registered at Name.com, Route 53, or elsewhere.
- **Node.js 18+** and **npm** (for building the frontend).
- **Python 3.11+** (for `agent/scripts/setup_ssm.py`).
- **API keys** (for the agent):
  - **OpenAI** — required for the chat agent.
  - **Serper** (optional) — for web search; agent works without it.

**Region:** Use **us-east-1** for CloudFront and (in this guide) for the EC2 agent. If you use another region for the agent, use it consistently for the agent stack and ACM cert.

---

## 2. One-time: Agent secrets (SSM)

The agent needs `OPENAI_API_KEY` (and optionally `SERPER_API_KEY`) in AWS Systems Manager Parameter Store so the EC2 instance can pass them into the container at deploy time.

1. From the repo root:
   ```bash
   cd agent
   cp .env.example .env
   ```
2. Edit `agent/.env`: set `OPENAI_API_KEY=sk-...` and optionally `SERPER_API_KEY=...`. Do **not** commit `.env`.
3. Install boto3 if needed: `pip install boto3`
4. Upload to SSM (default path `/bills-bio/agent/`):
   ```bash
   python3 scripts/setup_ssm.py --env-file .env
   ```
   You should see: `Created/updated: /bills-bio/agent/OPENAI_API_KEY` (and SERPER if set).

5. **Optional:** Use a different path with `--prefix /your/path/`. If you do, use the same path as `SSMParameterPrefix` when deploying the EC2 stack (step 3).

---

## 3. One-time: EC2 agent stack

This creates the VPC, EC2 instance, ALB, target group, and IAM role for the agent.

1. **Request an ACM certificate** for the agent subdomain in **us-east-1** (or your chosen region):
   - AWS Console → **Certificate Manager** → **Request certificate**.
   - Domain: `agent.bills.bio` (or your agent subdomain).
   - Validation: **DNS**.
   - Add the CNAME validation record to your DNS (Name.com, Route 53, etc.). Wait until the cert status is **Issued**.

2. **Deploy the stack** (replace placeholders):
   ```bash
   aws cloudformation deploy \
     --template-file deploy/ec2-agent.yaml \
     --stack-name bills-bio-agent \
     --region us-east-1 \
     --parameter-overrides \
       GitRepoUrl=https://github.com/YOUR_USER/bills.bio.git \
       GitBranch=main \
       AgentCertificateArn=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID \
       AgentDomainName=agent.bills.bio
   ```
   - `ACCOUNT_ID`: your AWS account ID.
   - `CERT_ID`: the ACM certificate ID (from the cert ARN).
   - Optional: `InstanceType=t3.micro` to reduce cost (default is `t3.small`).

3. **Note the ALB DNS name** (needed for DNS in step 4):
   ```bash
   aws cloudformation describe-stacks --stack-name bills-bio-agent --region us-east-1 \
     --query 'Stacks[0].Outputs[?OutputKey==`AgentALBDNSName`].OutputValue' --output text
   ```

The stack does **not** run the agent container yet; the instance may have no container or an old one. You will deploy the agent app in step 7.

---

## 4. One-time: DNS for the agent

Point the agent subdomain to the ALB.

**If using Route 53 (hosted zone for your domain):**

- Create an **A record** (alias):
  - Name: `agent` (for `agent.bills.bio`).
  - Alias: **Yes** → Alias to Application Load Balancer → choose the region and the `bills-bio-agent` ALB.
  - Or use the ALB DNS name and the ALB hosted zone ID from the stack outputs.

**If using Name.com (or another registrar):**

- Create a **CNAME** record:
  - Host: `agent` (or `agent.bills.bio` depending on the UI).
  - Answer: the ALB DNS name (e.g. `bills-bio-agent-alb-123456789.us-east-1.elb.amazonaws.com`).
  - TTL: 300 (or default).

Wait a few minutes for DNS to propagate, then check: `curl -s -o /dev/null -w "%{http_code}" https://agent.bills.bio/health` (you may get 503 until the agent is deployed and healthy).

---

## 5. One-time: Frontend stack (S3 + CloudFront)

This creates the S3 bucket and CloudFront distribution. CloudFront serves the static site from S3 and sends `/api/chat*` to the agent origin.

1. **Request an ACM certificate** for the main site in **us-east-1**:
   - Domain: `bills.bio` and `www.bills.bio`.
   - Validation: **DNS**. Add the CNAME(s) to your DNS and wait until **Issued**.

2. **Deploy the stack** (use the **agent** hostname for the origin, not the ALB URL if you already set DNS):
   ```bash
   aws cloudformation deploy \
     --template-file deploy/s3-cloudfront.yaml \
     --stack-name bills-bio-s3 \
     --region us-east-1 \
     --parameter-overrides \
       AgentOriginDomain=agent.bills.bio \
       ACMCertificateArn=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/FRONTEND_CERT_ID \
       Aliases=bills.bio,www.bills.bio
   ```
   - `AgentOriginDomain`: must be the hostname the agent will be reached at (e.g. `agent.bills.bio`). CloudFront will send `/api/chat*` to `https://AgentOriginDomain/...` with path rewritten to `/chat` and `/chat/stream`.
   - If you don’t have custom domain yet, omit `ACMCertificateArn` and `Aliases`; you can add them later and update the stack.

3. **Note the outputs** (for uploads and DNS):
   ```bash
   aws cloudformation describe-stacks --stack-name bills-bio-s3 --region us-east-1 \
     --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' --output table
   ```
   You need `StaticBucketName`, `DistributionId`, and `DistributionDomainName` (e.g. `d1abc2def3.cloudfront.net`).

---

## 6. One-time: DNS for the site

Point the main domain (and www) to CloudFront.

**If using Route 53:**

- Create **A records** (alias) for `bills.bio` and `www.bills.bio` → CloudFront distribution (use the distribution domain name and CloudFront hosted zone ID).

**If using Name.com:**

- **ANAME/ALIAS** (if supported): point `bills.bio` to `DistributionDomainName` (e.g. `d1abc2def3.cloudfront.net`).
- **CNAME** for `www`: point `www.bills.bio` to `DistributionDomainName`.

CloudFront expects the exact aliases you set in the stack (`Aliases=bills.bio,www.bills.bio`). Ensure your DNS matches.

---

## 7. First-time: Upload frontend and deploy agent

**Frontend (static site):**

1. Build:
   ```bash
   npm ci
   npm run build
   ```
2. Upload to S3 and invalidate CloudFront:
   ```bash
   BUCKET=$(aws cloudformation describe-stacks --stack-name bills-bio-s3 --region us-east-1 \
     --query 'Stacks[0].Outputs[?OutputKey==`StaticBucketName`].OutputValue' --output text)
   DIST_ID=$(aws cloudformation describe-stacks --stack-name bills-bio-s3 --region us-east-1 \
     --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)
   aws s3 sync out/ "s3://$BUCKET/" --delete --region us-east-1
   aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --region us-east-1
   ```

**Agent (EC2 container):**

1. Ensure SSM has `OPENAI_API_KEY` (step 2). If not:
   ```bash
   cd agent && python3 scripts/setup_ssm.py --env-file .env && cd ..
   ```
2. Run the deploy script (from repo root):
   ```bash
   ./deploy/fix-agent-on-ec2.sh
   ```
   The script: zips `agent/`, uploads to S3, runs SSM Run Command on the EC2 instance to pull, build Docker, fetch SSM params into `/tmp/agent.env`, and run the container. It fails clearly if `OPENAI_API_KEY` is missing from SSM.

3. Wait for the script to finish and for the ALB health check to turn healthy (1–2 minutes). Then test:
   ```bash
   curl -s https://agent.bills.bio/health
   # => {"status":"ok"}
   ```

---

## 8. CI/CD: GitHub Actions (optional)

Frontend deploys on every push to `main` using the workflow in `.github/workflows/deploy.yml`.

**Setup:**

1. Create an IAM user (or use an existing one) with permissions to:
   - Read CloudFormation stack `bills-bio-s3` (to get bucket and distribution ID).
   - `s3:PutObject`, `s3:DeleteObject`, etc. on the static bucket.
   - `cloudfront:CreateInvalidation` on the distribution.

2. In GitHub: **Settings → Secrets and variables → Actions** → add:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

3. Push to `main`. The workflow will:
   - Check out code, run `npm ci` and `npm run build`.
   - Configure AWS with the secrets.
   - Get bucket and distribution ID from the `bills-bio-s3` stack.
   - Sync `out/` to S3 and create a CloudFront invalidation.

**Note:** The workflow does **not** deploy the agent. Agent updates use `./deploy/fix-agent-on-ec2.sh` (step 9).

---

## 9. Ongoing: Updating the agent

When you change code in `agent/`:

1. From the repo root:
   ```bash
   ./deploy/fix-agent-on-ec2.sh
   ```
2. The script uses the same SSM path as the stack (`/bills-bio/agent/` by default). No need to re-upload secrets unless you changed them; if you did, run `agent/scripts/setup_ssm.py --env-file .env` again from your machine, then run the script.

---

## 10. Verification and troubleshooting

**Frontend**

- **URL:** `https://bills.bio` (and `https://www.bills.bio` if configured).
- **403 / Access Denied:** Ensure the bucket has no public access and that CloudFront uses OAC and the bucket policy allows the distribution (the CloudFormation template sets this). Check that the default root object is `index.html` and that `out/` contains `index.html`.

**Agent**

- **Health:** `curl -s https://agent.bills.bio/health` → `{"status":"ok"}`.
- **503 Service Unavailable:** ALB has no healthy targets. Check:
  1. **Target group:** EC2 → Target Groups → your bills-bio target group → **Targets**. Instance should be **healthy**.
  2. **Container:** Use SSM Session Manager to connect to the EC2 instance, then:
     ```bash
     sudo docker ps -a
     sudo docker logs agent
     curl -s http://localhost:8000/health
     ```
  3. **SSM parameters:** On the instance, `OPENAI_API_KEY` must be present under the SSM path. If you get "OPENAI_API_KEY not in SSM", run `agent/scripts/setup_ssm.py --env-file .env` and redeploy with `./deploy/fix-agent-on-ec2.sh`.
- **Internal Server Error / 500:** Check agent logs (e.g. `docker logs agent`). Common causes: missing env vars, OpenAI key invalid, or Mem0/memory init failure (see `docs/AGENT_ARCHITECTURE.md`).

**Chat from the site**

- The static site calls `https://bills.bio/api/chat/stream` (same origin). CloudFront routes `/api/chat*` to the agent origin and rewrites the path to `/chat/stream`. So the agent must be healthy at `https://agent.bills.bio/chat/stream`.
- If the UI shows “Failed to get response” or similar, confirm `https://agent.bills.bio/health` returns 200, then check the browser Network tab for the `/api/chat/stream` request and the response status/body.

**Useful commands**

```bash
# Stack outputs (agent)
aws cloudformation describe-stacks --stack-name bills-bio-agent --region us-east-1 --query 'Stacks[0].Outputs'

# Stack outputs (frontend)
aws cloudformation describe-stacks --stack-name bills-bio-s3 --region us-east-1 --query 'Stacks[0].Outputs'

# SSM parameters (list only; values are secret)
aws ssm get-parameters-by-path --path /bills-bio/agent/ --region us-east-1 --query 'Parameters[*].Name' --output table
```

---

## Quick reference

| What | Command / location |
|------|--------------------|
| Agent secrets | `cd agent && python3 scripts/setup_ssm.py --env-file .env` |
| Deploy agent | `./deploy/fix-agent-on-ec2.sh` |
| Deploy frontend (manual) | `npm run build` then `aws s3 sync out/ s3://BUCKET/ --delete` and CloudFront invalidation |
| Frontend stack | `deploy/s3-cloudfront.yaml` → stack `bills-bio-s3` |
| Agent stack | `deploy/ec2-agent.yaml` → stack `bills-bio-agent` |
| More detail | `deploy/README.md`, `docs/AGENT_ARCHITECTURE.md`, `docs/SECURITY_ANALYSIS.md` |
