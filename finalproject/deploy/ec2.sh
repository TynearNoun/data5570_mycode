#!/bin/bash
# Deploy from Git Bash or WSL. The private key stays in Downloads.
set -euo pipefail

KEY="${RALLY_KEY:-/mnt/c/Users/tynea/Downloads/data5570finalproject.pem}"
SERVER="13.56.184.13"
USER_NAME="${RALLY_USER:-ec2-user}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE="${TMPDIR:-/tmp}/rally-finalproject.tgz"

if [ ! -f "$KEY" ]; then
  echo "The key file is not at $KEY" >&2
  echo "Set RALLY_KEY to the path of data5570finalproject.pem" >&2
  exit 1
fi

chmod 600 "$KEY" || true
tar -czf "$ARCHIVE" \
  --exclude=node_modules \
  --exclude=.venv \
  --exclude=.expo \
  --exclude=db.sqlite3 \
  --exclude=media \
  --exclude=.env \
  -C "$ROOT" .
scp -i "$KEY" -o StrictHostKeyChecking=accept-new "$ARCHIVE" "${USER_NAME}@${SERVER}:/tmp/rally-finalproject.tgz"
scp -i "$KEY" -o StrictHostKeyChecking=accept-new "$(dirname "$0")/remote-setup.sh" "${USER_NAME}@${SERVER}:/tmp/rally-remote-setup.sh"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "${USER_NAME}@${SERVER}" "bash /tmp/rally-remote-setup.sh"
echo "API: http://${SERVER}:8000/api/health/"
