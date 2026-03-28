#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform"

cd "$TF_DIR"

IP=$(terraform output -raw instance_public_ip 2>/dev/null || echo "")

if [ -z "$IP" ]; then
  echo "No deployment found. Run deploy.sh first."
  exit 1
fi

echo "============================================"
echo "  YES24 Clone - Status"
echo "============================================"
echo ""
echo "Instance IP: $IP"
echo "Site URL:    http://$IP"
echo ""

# Health check
echo -n "Health: "
if curl -sf --connect-timeout 5 "http://$IP/healthz" 2>/dev/null; then
  echo ""
else
  echo "UNREACHABLE (instance may still be starting)"
fi

echo -n "Ready:  "
curl -sf --connect-timeout 5 "http://$IP/readyz" 2>/dev/null && echo "" || echo "NOT READY"

echo ""

# Quick page test
echo "Pages:"
for url in "/main/default.aspx" "/Product/Goods/100000001" "/Product/Category/BestSeller" "/api/v1/categories"; do
  code=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$IP$url" 2>/dev/null || echo "ERR")
  echo "  $code  $url"
done

echo ""
echo "SSH: $(terraform output -raw ssh_command 2>/dev/null)"
echo ""
