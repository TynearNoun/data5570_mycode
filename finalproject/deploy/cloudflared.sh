#!/bin/bash
# Open an HTTPS address for the Django API that is already on port 8000.
# Amazon Linux has no apt. Ubuntu can use the Cloudflare package repo.
set -euo pipefail

TARGET="${CLOUDFLARED_TARGET:-http://127.0.0.1:8000}"

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    return
  fi
  if command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
    local tmp
    tmp="$(mktemp)"
    curl -fsSL -o "$tmp" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    sudo install -m 755 "$tmp" /usr/local/bin/cloudflared
    rm -f "$tmp"
    return
  fi
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
    sudo apt-get update
    sudo apt-get install -y cloudflared
    return
  fi
  echo "cloudflared is not installed, and this system is not apt or dnf." >&2
  exit 1
}

install_cloudflared

if [ "${1:-}" = "--service" ]; then
  sudo tee /etc/systemd/system/cloudflared-quick.service >/dev/null <<EOF
[Unit]
Description=HTTPS tunnel to the Daily Challenge API
After=network-online.target rally-api.service
Wants=network-online.target

[Service]
ExecStart=$(command -v cloudflared) tunnel --url ${TARGET} --no-autoupdate
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable cloudflared-quick
  sudo systemctl restart cloudflared-quick
  echo "The HTTPS address is in the service log. It changes if this service restarts."
  echo "journalctl -u cloudflared-quick -o cat | grep -o 'https://[-a-z0-9]*\\.trycloudflare.com'"
  exit 0
fi

echo "Leave this running. Copy the https://....trycloudflare.com address it prints."
echo "The Django API is that address plus /api/health/"
exec cloudflared tunnel --url "$TARGET" --no-autoupdate
