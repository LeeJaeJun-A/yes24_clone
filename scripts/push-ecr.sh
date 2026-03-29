#!/bin/bash
# Push Docker images to ECR
# Usage: ./scripts/push-ecr.sh <aws-region> <account-id>
# Or set env vars: AWS_REGION, AWS_ACCOUNT_ID
set -euo pipefail

REGION="${AWS_REGION:-${1:-ap-northeast-2}}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-${2:-}}"
PROJECT="yes24-clone"

if [ -z "$ACCOUNT_ID" ]; then
  echo "Getting AWS account ID..."
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
fi

ECR_BACKEND="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$PROJECT/backend"
ECR_FRONTEND="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$PROJECT/frontend"

echo "=== ECR Push ==="
echo "Region:   $REGION"
echo "Account:  $ACCOUNT_ID"
echo "Backend:  $ECR_BACKEND"
echo "Frontend: $ECR_FRONTEND"
echo ""

# ECR login
echo "Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Build & push backend
echo ""
echo "Building backend..."
docker build -t "$ECR_BACKEND:latest" ./backend
echo "Pushing backend..."
docker push "$ECR_BACKEND:latest"

# Build & push frontend
echo ""
echo "Building frontend..."
docker build -t "$ECR_FRONTEND:latest" ./frontend
echo "Pushing frontend..."
docker push "$ECR_FRONTEND:latest"

echo ""
echo "✅ Done! Images pushed to ECR."
echo ""
echo "Next steps:"
echo "  cd infra/terraform"
echo "  cp terraform.tfvars.example terraform.tfvars  # fill in secrets"
echo "  terraform init && terraform apply"
