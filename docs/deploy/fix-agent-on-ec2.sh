#!/usr/bin/env bash
# Deploy agent from local repo to the EC2 instance (zip → S3 → SSM run).
# Use when GitHub repo doesn't have agent/ on the branch, or to push a quick fix.
# Prerequisites: AWS CLI, instance in bills-bio-agent stack, S3 stack (bills-bio-s3) for bucket.
# Usage: ./deploy/fix-agent-on-ec2.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
AWS_REGION="${AWS_REGION:-us-east-1}"

INSTANCE_ID=$(aws ec2 describe-instances --region "$AWS_REGION" \
  --filters "Name=tag:aws:cloudformation:stack-name,Values=bills-bio-agent" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
TG_ARN=$(aws elbv2 describe-target-groups --region "$AWS_REGION" \
  --query "TargetGroups[?contains(TargetGroupName,'bills') && contains(TargetGroupName,'Agent')].TargetGroupArn" --output text | head -1)
BUCKET=$(aws cloudformation describe-stacks --region us-east-1 --stack-name bills-bio-s3 \
  --query 'Stacks[0].Outputs[?OutputKey==`StaticBucketName`].OutputValue' --output text 2>/dev/null || true)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
  echo "Error: No running EC2 instance found for stack bills-bio-agent."
  exit 1
fi
if [ -z "$TG_ARN" ]; then
  echo "Error: No target group found for bills-bio-agent."
  exit 1
fi
if [ -z "$BUCKET" ]; then
  echo "Error: Stack bills-bio-s3 not found or no StaticBucketName output. Deploy S3 stack first."
  exit 1
fi

# Use same SSM path as the stack so IAM and fix script stay in sync
SSM_PREFIX=$(aws cloudformation describe-stacks --stack-name bills-bio-agent --region "$AWS_REGION" \
  --query 'Stacks[0].Parameters[?ParameterKey==`SSMParameterPrefix`].ParameterValue' --output text 2>/dev/null | head -1)
SSM_PREFIX="${SSM_PREFIX:-/bills-bio/agent/}"
SSM_PREFIX="${SSM_PREFIX%/}/"

echo "Instance: $INSTANCE_ID"
echo "Target group: $TG_ARN"
echo "Bucket: $BUCKET"
echo "SSM path: $SSM_PREFIX (must have OPENAI_API_KEY; run: cd agent && python3 scripts/setup_ssm.py --env-file .env)"
echo "Creating agent.zip from agent/ ..."
rm -f /tmp/agent.zip
(cd "$REPO_ROOT" && zip -r -q /tmp/agent.zip agent/)
echo "Uploading to s3://$BUCKET/deploy/agent.zip ..."
aws s3 cp /tmp/agent.zip "s3://$BUCKET/deploy/agent.zip" --region us-east-1

echo "Running SSM command on instance (download, unzip, build, run) ..."
# Host (not container) fetches SSM params and passes via --env-file so container gets OPENAI_API_KEY etc.
CMD_JSON=$(cat <<EOF
{
  "commands": [
    "aws s3 cp s3://$BUCKET/deploy/agent.zip /tmp/agent.zip --region $AWS_REGION",
    "rm -rf /tmp/agent-extract && mkdir -p /tmp/agent-extract && cd /tmp/agent-extract && unzip -o -q /tmp/agent.zip",
    "cd /tmp/agent-extract/agent && docker build -t bills-agent .",
    "docker stop agent 2>/dev/null; docker rm agent 2>/dev/null; true",
    "aws ssm get-parameters-by-path --path $SSM_PREFIX --with-decryption --region $AWS_REGION --no-cli-pager --output json | python3 -c \"import json,sys; d=json.load(sys.stdin); [print(p.get('Name','').split('/')[-1]+'='+str(p.get('Value',''))) for p in d.get('Parameters',[])]\" > /tmp/agent.env",
    "grep -q '^OPENAI_API_KEY=' /tmp/agent.env || (echo 'ERROR: OPENAI_API_KEY not in SSM at $SSM_PREFIX. Run: cd agent && python3 scripts/setup_ssm.py --env-file .env' && exit 1)",
    "docker run -d --name agent --restart unless-stopped --network host -e AWS_REGION=$AWS_REGION -e AWS_DEFAULT_REGION=$AWS_REGION --env-file /tmp/agent.env bills-agent",
    "rm -f /tmp/agent.env",
    "sleep 4 && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/health"
  ]
}
EOF
)
CMD_ID=$(aws ssm send-command --instance-ids "$INSTANCE_ID" --region "$AWS_REGION" \
  --document-name "AWS-RunShellScript" \
  --parameters "$CMD_JSON" \
  --timeout-seconds 300 --output text --query 'Command.CommandId')

echo "Command ID: $CMD_ID (waiting for result)..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  sleep 15
  STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --region "$AWS_REGION" --query 'Status' --output text 2>/dev/null || echo "Unknown")
  echo "  Status: $STATUS"
  if [ "$STATUS" = "Success" ]; then
    aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --region "$AWS_REGION" --query 'StandardOutputContent' --output text
    break
  fi
  if [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Cancelled" ]; then
    aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --region "$AWS_REGION" --query '[StandardOutputContent,StandardErrorContent]' --output text
    exit 1
  fi
done

echo "Registering instance with target group..."
aws elbv2 register-targets --target-group-arn "$TG_ARN" --targets Id="$INSTANCE_ID",Port=8000 --region "$AWS_REGION" 2>/dev/null || true
echo "Done. Health checks may take 1–2 minutes. Test: https://agent.bills.bio/health"
