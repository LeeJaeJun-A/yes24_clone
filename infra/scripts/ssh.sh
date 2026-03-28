#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform"

cd "$TF_DIR"

IP=$(terraform output -raw instance_public_ip 2>/dev/null)
KEY_FILE=$(terraform output -raw ssh_key_file 2>/dev/null)

if [ -z "$IP" ]; then
  echo "No instance found. Run deploy.sh first."
  exit 1
fi

if [ -f "$KEY_FILE" ]; then
  ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$IP" "$@"
else
  echo "SSH key not found at: $KEY_FILE"
  echo "Try: ssh ec2-user@$IP"
fi
