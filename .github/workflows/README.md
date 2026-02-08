# GitHub Actions Workflows

## Active Workflows

### `deploy-agent.yml` - Backend Deployment

Automatically deploys the Python FastAPI agent to AWS EC2.

**Triggers:**
- Push to `main` when `apps/agent/**` changes
- Manual workflow dispatch

**What it does:**
1. Packages agent code into zip
2. Uploads to S3
3. Uses AWS SSM to deploy to EC2 instance
4. Builds Docker image
5. Runs new container with environment variables from SSM
6. Tests health endpoint
7. Registers with ALB target group

**Prerequisites:**
- GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- AWS infrastructure deployed (see `docs/DEPLOYMENT_GUIDE.md`)
- SSM parameters configured: `/bills-bio/agent/OPENAI_API_KEY`

**Verify deployment:**
```bash
curl https://agent.bills.bio/health
```

---

## Frontend Deployment

Frontend is deployed via **Vercel**, not GitHub Actions.

**Setup:**
1. Import repository at [vercel.com/new](https://vercel.com/new)
2. Configure environment variables
3. Deploy

Vercel automatically deploys on every push to `main`.

See `DEPLOY_TO_VERCEL.md` for full instructions.

---

## Removed Workflows

- ~~`deploy.yml`~~ - Removed (frontend now uses Vercel)
  - Previous S3 static deployment didn't support API routes
  - Replaced with Vercel for full Next.js support
