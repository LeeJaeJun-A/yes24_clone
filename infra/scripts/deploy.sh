#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform"
REGION="${AWS_REGION:-ap-northeast-2}"

echo "============================================"
echo "  YES24 Clone - AWS Deploy"
echo "============================================"
echo ""
echo "Region: $REGION"
echo "Project: $PROJECT_DIR"
echo ""

# ─── Step 1: Terraform Init & Apply ──────────────────────
echo "[1/4] Provisioning AWS infrastructure..."
cd "$TF_DIR"

terraform init -input=false
terraform apply -auto-approve -var="region=$REGION"

# Capture outputs
ECR_BACKEND=$(terraform output -raw ecr_backend)
ECR_FRONTEND=$(terraform output -raw ecr_frontend)
INSTANCE_IP=$(terraform output -raw instance_public_ip)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo ""
echo "  ECR Backend:  $ECR_BACKEND"
echo "  ECR Frontend: $ECR_FRONTEND"
echo "  Instance IP:  $INSTANCE_IP"
echo ""

# ─── Step 2: Build & Push Docker Images ──────────────────
echo "[2/4] Building Docker images..."
cd "$PROJECT_DIR"

# ECR Login
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Build for linux/amd64 (EC2 target)
echo "  Building backend..."
docker build --platform linux/amd64 -t "$ECR_BACKEND:latest" ./backend

echo "  Building frontend..."
docker build --platform linux/amd64 -t "$ECR_FRONTEND:latest" ./frontend

# ─── Step 3: Push to ECR ─────────────────────────────────
echo "[3/4] Pushing images to ECR..."
docker push "$ECR_BACKEND:latest"
docker push "$ECR_FRONTEND:latest"

# ─── Step 4: Wait for EC2 setup ──────────────────────────
echo "[4/4] Waiting for EC2 instance to complete setup..."
echo "  (The instance is running user-data which installs Docker,"
echo "   pulls images, starts services, and seeds data."
echo "   This typically takes 5-8 minutes.)"
echo ""

# Wait for instance to pass status checks
aws ec2 wait instance-status-ok \
  --instance-ids "$(cd "$TF_DIR" && terraform output -raw instance_id)" \
  --region "$REGION" 2>/dev/null || true

# Poll for health endpoint
echo "  Polling health endpoint..."
for i in $(seq 1 60); do
  if curl -sf --connect-timeout 3 "http://$INSTANCE_IP/healthz" > /dev/null 2>&1; then
    echo ""
    echo "============================================"
    echo "  Deployment Complete!"
    echo "============================================"
    echo ""
    echo "  Site URL:  http://$INSTANCE_IP"
    echo "  Health:    http://$INSTANCE_IP/healthz"
    echo "  API Docs:  http://$INSTANCE_IP/api/swagger"
    echo ""
    cd "$TF_DIR"
    echo "  SSH:       $(terraform output -raw ssh_command)"
    echo ""
    echo "  To destroy: ./infra/scripts/destroy.sh"
    echo "============================================"
    exit 0
  fi
  echo "  Attempt $i/60 - not ready yet, waiting 15s..."
  sleep 15
done

echo ""
echo "WARNING: Health check timed out after 15 minutes."
echo "The instance may still be starting. Check manually:"
echo "  ssh into the instance and run: tail -f /var/log/user-data.log"
echo "  Site URL: http://$INSTANCE_IP"
