# Deployment (AWS SSM, CloudFront, Route 53, S3, EC2)

Use these when AWS credentials are configured (`aws configure` or env vars).

## Full deploy: static frontend (S3) + agent on EC2

End-to-end flow for **static Next.js in S3 + CloudFront** and **Python agent on EC2 behind ALB**.

1. **SSM (agent secrets)** — Create parameters under `/bills-bio/agent/` (see [SSM Parameter Store](#ssm-parameter-store-agent-secrets) below). Run `agent/scripts/setup_ssm.py` from the agent directory.

2. **ACM certificates** — In **us-east-1**: request a cert for your main domain (e.g. `bills.bio`, `www.bills.bio`) for the frontend. In **your chosen region** (e.g. `us-east-1`): request a cert for the agent subdomain (e.g. `agent.bills.bio`). Validate both via DNS (Route 53).

3. **Deploy agent (EC2 + ALB)** — In the same region as the agent cert:
   ```bash
   aws cloudformation deploy \
     --template-file deploy/ec2-agent.yaml \
     --stack-name bills-bio-agent \
     --parameter-overrides \
       GitRepoUrl=https://github.com/YOUR_USER/bills.bio.git \
       GitBranch=main \
       AgentCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/AGENT_CERT_ID \
       AgentDomainName=agent.bills.bio
   ```
   Get `AgentALBDNSName` and `AgentALBHostedZoneId` from stack outputs.

4. **Route 53: agent subdomain** — In your hosted zone for `bills.bio`, create an **A (alias)** record:
   - Name: `agent` (so `agent.bills.bio`)
   - Alias: Yes, target = ALB DNS name from step 3 (use the ALB’s hosted zone ID for the alias target).

5. **Deploy frontend (S3 + CloudFront)** — In **us-east-1** (for CloudFront):
   ```bash
   npm run build
   aws cloudformation deploy \
     --template-file deploy/s3-cloudfront.yaml \
     --stack-name bills-bio-s3 \
     --parameter-overrides \
       AgentOriginDomain=agent.bills.bio \
       ACMCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/FRONTEND_CERT_ID \
       Aliases=bills.bio,www.bills.bio
   ```
   Then upload the static site and invalidate:
   ```bash
   aws s3 sync out/ s3://$(aws cloudformation describe-stacks --stack-name bills-bio-s3 --query 'Stacks[0].Outputs[?OutputKey==`StaticBucketName`].OutputValue' --output text)/ --delete
   aws cloudfront create-invalidation --distribution-id $(aws cloudformation describe-stacks --stack-name bills-bio-s3 --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text) --paths "/*"
   ```

6. **Route 53: main domain** — Point `bills.bio` and `www.bills.bio` to the CloudFront distribution (see [Route 53 (domain DNS)](#route-53-domain-dns) below; use stack `bills-bio-s3` output `DistributionDomainName`).

Result: `https://bills.bio` serves the static site; `/api/chat` and `/api/chat/stream` are forwarded to the agent at `https://agent.bills.bio`.

### Quick fix deploy (push agent without GitHub)

To push the local `agent/` directory to the EC2 instance (zip → S3 → SSM run on instance):

1. **Ensure OPENAI_API_KEY is in SSM** (once per env):  
   `cd agent && python3 scripts/setup_ssm.py --env-file .env`
2. Run:  
   `./deploy/fix-agent-on-ec2.sh`

The script uses the stack’s `SSMParameterPrefix` (default `/bills-bio/agent/`), fetches parameters on the host, and runs the container with `--env-file`. If OPENAI_API_KEY is missing from SSM, the script fails with a clear error.

### If S3 + CloudFront deploy fails with EarlyValidation::PropertyValidation

CloudFormation’s pre-deployment validation can fail with a generic “PropertyValidation” message and no details in the CLI. Workarounds:

1. **Create the stack in the AWS Console** — Upload `deploy/s3-cloudfront.yaml` and create the stack there; the Console may show the exact validation error (e.g. property path and reason).
2. **Use the latest AWS CLI** — If your CLI supports it, run `aws cloudformation describe-events --change-set-name <changeset-arn>` after a failed change set to see validation details.
3. **Alternative: single-origin CloudFront** — Use `deploy/cloudfront.yaml` with `OriginDomainName` set to a host that serves both the static site and proxies `/api/chat*` to the agent (e.g. Vercel, Amplify, or your own server). Then you don’t use the S3 + two-origin template.

---

## SSM Parameter Store (agent secrets)

Create or update SSM parameters so the agent can load keys at startup with `USE_SSM=true`.

1. From the **agent** directory:
   ```bash
   cd agent
   export OPENAI_API_KEY=sk-... SERPER_API_KEY=...
   python3 scripts/setup_ssm.py
   ```
   Or from a `.env` file (do not commit it):
   ```bash
   python3 scripts/setup_ssm.py --env-file .env
   ```

2. Optional: `--prefix /bills-bio/agent/` (default), `--dry-run`, `--type SecureString` (default).

3. In production, secrets can reach the agent in two ways:

   **Option A — Host fetches SSM, container gets env file (recommended for fix script)**  
   The deploy script runs on the EC2 host (via SSM Run Command), which has the instance IAM role. The host fetches parameters with `aws ssm get-parameters-by-path`, writes `/tmp/agent.env`, and runs `docker run --env-file /tmp/agent.env`. The container never needs AWS credentials. This is what `deploy/fix-agent-on-ec2.sh` does.

   **Option B — Container loads SSM at startup (`USE_SSM=true`)**  
   Set `USE_SSM=true` and `SSM_PARAMETER_PREFIX=/bills-bio/agent/`. The agent calls SSM at startup inside the container. The container must have AWS credentials:
   - Use **host networking**: `docker run --network host` so the container can reach the instance metadata service at `169.254.169.254` and get the instance IAM role credentials.
   - Or use **bridge networking** and increase the instance metadata hop limit so the container can reach IMDS:  
     `aws ec2 modify-instance-metadata-options --instance-id <id> --http-put-response-hop-limit 2 --region <region>`  
     (IMDSv2 default hop limit is 1, which blocks containers; 2 allows one hop to the container.)

   The IAM role for the instance (or task) needs `ssm:GetParametersByPath` and `ssm:GetParameters` on the parameter path (and `kms:Decrypt` if using SecureString).

### Best practices (from engineering blogs)

We value simplicity. Here’s how our approach lines up with what companies like **Spotify**, **Uber**, **37signals/Basecamp**, and **Segment** do:

- **Single source of truth** — Store secrets in one place (e.g. SSM Parameter Store). No copies in repo or baked into images. [Uber](https://www.uber.com/en-NZ/blog/building-ubers-multi-cloud-secrets-management-platform/), [Segment/AWS](https://aws.amazon.com/blogs/mt/the-right-way-to-store-secrets-using-parameter-store/).
- **Deploy layer injects, app just reads env** — The platform (host or orchestrator) fetches secrets at container start and injects them as environment variables. The app stays agnostic: it only reads `os.environ`. No AWS SDK or IAM inside the container for secrets. [Uber](https://www.uber.com/en-NZ/blog/building-ubers-multi-cloud-secrets-management-platform/): “Heavily rely on integrations with deployment platforms to distribute secrets to containers when they’re launched. This architecture decouples the Secrets tech stack from any logic within workloads.”
- **Fewer moving parts** — Prefer one standard pattern (e.g. host fetches SSM → `--env-file`) over multiple paths (container SSM + metadata + hop limits). [37signals](https://dev.37signals.com/bringing-our-apps-back-home/): “Standard pattern for all apps … fewer moving parts.”
- **Avoid unnecessary complexity** — [37signals](https://basecamp.com/gettingreal/10.1-less-software): “Each time you increase code, software grows exponentially more complex.” For a single agent on EC2, host-fetches-SSM-then-`--env-file` is simpler than giving the container IAM and SSM bootstrap logic.

Our **fix-agent-on-ec2.sh** follows this: the host (with IAM) fetches SSM once, writes `/tmp/agent.env`, and runs `docker run --env-file /tmp/agent.env`. The container has no AWS dependency and no secrets logic—just env vars.

## CloudFront CDN

Deploy a CloudFront distribution that caches static assets and **does not** cache `/api/chat` or `/api/chat/stream`.

1. Deploy the stack (replace `your-origin.example.com` with your Next.js host, ALB DNS, or app URL without protocol):
   ```bash
   aws cloudformation deploy \
     --template-file deploy/cloudfront.yaml \
     --stack-name bills-bio-cdn \
     --parameter-overrides OriginDomainName=your-origin.example.com
   ```

2. Optional parameters:
   - `OriginPath`: e.g. empty or `/`
   - `ViewerProtocolPolicy`: `redirect-http-to-https` (default), `allow-all`, or `https-only`
   - `ACMCertificateArn`: ACM cert ARN (us-east-1) for custom domain
   - `Aliases`: comma-separated CNAMEs (e.g. `bills.bio,www.bills.bio`) when using custom domain

3. After deploy, use the distribution URL (e.g. `https://xxx.cloudfront.net`) or point your domain with Route 53 (below).

## Route 53 (domain DNS)

Use Route 53 to point your domain (e.g. bills.bio) and optional www at the CloudFront distribution. Deploy **after** CloudFront.

1. **Hosted zone**: Create a Route 53 hosted zone for your domain if you don’t have one:
   - In Route 53: **Create hosted zone** → enter domain (e.g. bills.bio) → create.
   - Note the **Hosted zone ID** (e.g. Z123...). If the domain is registered elsewhere, add the NS records from the hosted zone to your registrar so Route 53 is authoritative.

2. **ACM certificate (custom domain)**: Request an ACM certificate in **us-east-1** for your domain and www (e.g. bills.bio, www.bills.bio). Validate via DNS (Route 53 can create the validation records). Use this cert when deploying CloudFront with `ACMCertificateArn` and `Aliases=bills.bio,www.bills.bio`.

3. **Deploy Route 53 stack**: Create A (alias) records pointing to CloudFront. Use the CloudFront stack output `DistributionDomainName` (e.g. d123abc.cloudfront.net):
   ```bash
   aws cloudformation deploy \
     --template-file deploy/route53.yaml \
     --stack-name bills-bio-dns \
     --parameter-overrides \
       HostedZoneId=Z123YOUR_HOSTED_ZONE_ID \
       DomainName=bills.bio \
       CloudFrontDistributionDomainName=d123abc.cloudfront.net
   ```
   Optional: `CreateWwwRecord=false` to skip the www subdomain record.

4. **Order**: (1) Create hosted zone and optionally ACM cert → (2) Deploy CloudFront with `ACMCertificateArn` and `Aliases` if using custom domain → (3) Deploy Route 53 stack with CloudFront’s `DistributionDomainName`.

See `docs/AGENT_ARCHITECTURE.md` §10 (Key management) and §11 (CloudFront) for details.

## Agent on EC2 (optional)

Deploy the Python agent on EC2 behind an ALB (HTTPS). Used by the [full deploy](#full-deploy-static-frontend-s3--agent-on-ec2) above.

- **Template:** `deploy/ec2-agent.yaml`
- **Parameters:** `GitRepoUrl`, `GitBranch`, `AgentCertificateArn`, optional `AgentDomainName`, `InstanceType`, `SSMParameterPrefix`
- **Prerequisites:** SSM parameters under `/bills-bio/agent/` (run `agent/scripts/setup_ssm.py`). ACM cert for the agent domain in the stack’s region.
- **Outputs:** `AgentALBDNSName`, `AgentALBHostedZoneId` — create a Route 53 A (alias) for your agent subdomain to this ALB.
- **Details:** See `deploy/AWS_DEPLOYMENT_OPTIONS.md`.

### Agent returns 503 (Service Temporarily Unavailable)

The ALB returns 503 when it has **no healthy targets**. Common causes:

1. **Target not registered** — EC2 user-data runs `aws elbv2 register-targets`; if it failed (e.g. IAM not ready), the instance never joined the target group.
2. **Agent not running** — Docker build or `docker run` failed (e.g. private repo, missing SSM params, app crash). Nothing listens on port 8000, so health checks fail.
3. **Health checks failing** — ALB checks `HTTP:8000/health` every 30s. If the app is slow or crashes, the target stays unhealthy.

**Steps to debug:**

1. **Target group** — In AWS Console: **EC2 → Target Groups** → select the group for `bills-bio-agent` → **Targets** tab. Check if the instance is listed and status (healthy / unhealthy / initial).
2. **If no targets or unhealthy** — Connect to the instance via **SSM Session Manager** (EC2 → Instances → select instance → Connect → Session Manager). Then:
   ```bash
   sudo docker ps -a
   sudo docker logs agent
   curl -s http://localhost:8000/health
   sudo tail -100 /var/log/cloud-init-output.log
   ```
   Fix from there: ensure SSM parameters exist (`/bills-bio/agent/`), repo is reachable, and the container stays running.
3. **Manually register target** (if instance is running but not in target group):
   ```bash
   INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:aws:cloudformation:stack-name,Values=bills-bio-agent" "Name=instance-state-name,Values=running" --query 'Reservations[0].Instances[0].InstanceId' --output text --region us-east-1)
   TG_ARN=$(aws elbv2 describe-target-groups --names $(aws elbv2 describe-target-groups --query "TargetGroups[?contains(TargetGroupName,'bills-bio')].TargetGroupArn" --output text --region us-east-1 | head -1) --query 'TargetGroups[0].TargetGroupArn' --output text --region us-east-1 2>/dev/null || aws elbv2 describe-target-groups --region us-east-1 --query "TargetGroups[?contains(TargetGroupName,'bills-bio')].TargetGroupArn" --output text)
   aws elbv2 register-targets --target-group-arn $TG_ARN --targets Id=$INSTANCE_ID,Port=8000 --region us-east-1
   ```
