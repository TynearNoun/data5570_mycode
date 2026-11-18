#!/bin/bash
# Runs on the EC2 instance after the project archive is uploaded.
set -euo pipefail

APP_USER="$(id -un)"
APP_HOME="${HOME}/rally"

if command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y python3 python3-pip
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y python3 python3-pip
elif command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-pip
fi

mkdir -p "${APP_HOME}"
tar -xzf /tmp/rally-finalproject.tgz -C "${APP_HOME}"
cd "${APP_HOME}/djangobackend"
python3 -m venv "${APP_HOME}/.venv"
# shellcheck disable=SC1091
source "${APP_HOME}/.venv/bin/activate"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
fi
python manage.py migrate
python manage.py seed_demo

sudo tee /etc/systemd/system/rally-api.service >/dev/null <<UNIT
[Unit]
Description=Daily Challenge API
After=network.target

[Service]
User=${APP_USER}
WorkingDirectory=${APP_HOME}/djangobackend
Environment=DJANGO_DEBUG=true
Environment=ALLOWED_HOSTS=*
Environment=CORS_ALLOW_ALL_ORIGINS=true
ExecStart=${APP_HOME}/.venv/bin/python manage.py runserver 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable rally-api
sudo systemctl restart rally-api
sudo systemctl --no-pager --full status rally-api
echo "Daily Challenge API should be listening on port 8000."
