#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform"
REGION="${AWS_REGION:-ap-northeast-2}"

echo "============================================"
echo "  YES24 Clone - AWS Destroy"
echo "============================================"
echo ""

cd "$TF_DIR"

# Show what will be destroyed
echo "The following resources will be destroyed:"
terraform state list 2>/dev/null | sed 's/^/  - /' || echo "  (no state found)"
echo ""

read -p "Are you sure? This will destroy ALL resources. (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Destroying infrastructure..."
terraform destroy -auto-approve -var="region=$REGION"

# Clean up generated key file
if [ -f "yes24-clone-key.pem" ]; then
  rm -f yes24-clone-key.pem
  echo "Removed SSH key file."
fi

echo ""
echo "============================================"
echo "  All AWS resources destroyed."
echo "============================================"
