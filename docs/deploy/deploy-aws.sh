#!/usr/bin/env bash
# Full AWS deploy: EC2 agent + S3/CloudFront frontend.
# Prerequisites: ACM certs for agent.bills.bio and bills.bio (us-east-1). SSM params (run agent/scripts/setup_ssm.py).
# Usage:
#   export AGENT_CERT_ARN=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID
#   export FRONTEND_CERT_ARN=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID
#   ./deploy/deploy-aws.sh
# Optional: AGENT_DOMAIN=agent.bills.bio FRONTEND_ALIASES=bills.bio,www.bills.bio AWS_REGION=us-east-1

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

AGENT_DOMAIN="${AGENT_DOMAIN:-agent.bills.bio}"
FRONTEND_ALIASES="${FRONTEND_ALIASES:-bills.bio,www.bills.bio}"
AWS_REGION="${AWS_REGION:-us-east-1}"
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/potbrownie/bills.bio.git}"
GIT_BRANCH="${GIT_BRANCH:-master}"

echo "=== Deploy region: $AWS_REGION ==="

if [ -z "$AGENT_CERT_ARN" ]; then
  echo "Error: AGENT_CERT_ARN is required (ACM cert for $AGENT_DOMAIN in $AWS_REGION)."
  echo "Create in AWS Console → Certificate Manager → Request certificate → $AGENT_DOMAIN → DNS validation."
  exit 1
fi

if [ -z "$FRONTEND_CERT_ARN" ]; then
  echo "Error: FRONTEND_CERT_ARN is required (ACM cert for $FRONTEND_ALIASES in us-east-1)."
  echo "Create in AWS Console → Certificate Manager (us-east-1) → Request → bills.bio, www.bills.bio → DNS validation."
  exit 1
fi

# 1) SSM (optional – run once with keys)
if [ -n "$OPENAI_API_KEY" ]; then
  echo "=== Creating/updating SSM parameters ==="
  (cd agent && python3 scripts/setup_ssm.py) || true
else
  echo "=== Skipping SSM (set OPENAI_API_KEY to run setup_ssm.py) ==="
fi

# 2) EC2 agent stack
echo "=== Deploying EC2 agent stack (bills-bio-agent) ==="
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --template-file deploy/ec2-agent.yaml \
  --stack-name bills-bio-agent \
  --parameter-overrides \
    GitRepoUrl="$GIT_REPO_URL" \
    GitBranch="$GIT_BRANCH" \
    AgentCertificateArn="$AGENT_CERT_ARN" \
    AgentDomainName="$AGENT_DOMAIN" \
  --capabilities CAPABILITY_NAMED_IAM

ALB_DNS=$(aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name bills-bio-agent --query 'Stacks[0].Outputs[?OutputKey==`AgentALBDNSName`].OutputValue' --output text)
ALB_ZONE=$(aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name bills-bio-agent --query 'Stacks[0].Outputs[?OutputKey==`AgentALBHostedZoneId`].OutputValue' --output text)
echo "Agent ALB: $ALB_DNS (HostedZoneId: $ALB_ZONE)"
echo "→ Create Route 53 A (alias): $AGENT_DOMAIN → $ALB_DNS (zone $ALB_ZONE)"
echo ""

# 3) Build static site
echo "=== Building Next.js static export ==="
npm run build

# 4) S3 + CloudFront (us-east-1 for CloudFront)
echo "=== Deploying S3 + CloudFront stack (bills-bio-s3) ==="
aws cloudformation deploy \
  --region us-east-1 \
  --template-file deploy/s3-cloudfront.yaml \
  --stack-name bills-bio-s3 \
  --parameter-overrides \
    AgentOriginDomain="$AGENT_DOMAIN" \
    ACMCertificateArn="$FRONTEND_CERT_ARN" \
    Aliases="$FRONTEND_ALIASES" \
  --capabilities CAPABILITY_NAMED_IAM

BUCKET=$(aws cloudformation describe-stacks --region us-east-1 --stack-name bills-bio-s3 --query 'Stacks[0].Outputs[?OutputKey==`StaticBucketName`].OutputValue' --output text)
DIST_ID=$(aws cloudformation describe-stacks --region us-east-1 --stack-name bills-bio-s3 --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)

echo "=== Uploading static site to S3 ==="
aws s3 sync out/ "s3://$BUCKET/" --delete --region us-east-1

echo "=== Invalidating CloudFront ==="
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --region us-east-1

echo ""
echo "Done. Create Route 53 A (alias) for bills.bio and www.bills.bio → CloudFront distribution ($DIST_ID)."
echo "Frontend URL (after DNS): https://bills.bio"
