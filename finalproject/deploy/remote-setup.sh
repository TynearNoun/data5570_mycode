#!/bin/bash
# Runs on the EC2 instance after the project archive is uploaded.
set -euo pipefail

APP_USER="$(id -un)"
APP_HOME="${HOME}/rally"

if command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y python3 python3-pip
  # Amazon Linux 2023's python3 is 3.9. Django 5.2 needs 3.10 or newer.
  sudo dnf install -y python3.12 python3.12-pip || sudo dnf install -y python3.11 python3.11-pip
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y python3 python3-pip
  sudo yum install -y python3.11 python3.11-pip || true
elif command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-pip
fi

pick_python() {
  local candidate version
  for candidate in python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      version="$("$candidate" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
      case "$version" in
        3.9|3.8|3.7|2.*) continue ;;
      esac
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

PYTHON="$(pick_python)" || {
  echo "Django 5.2 needs Python 3.10 or newer. This instance only has Python 3.9." >&2
  exit 1
}

mkdir -p "${APP_HOME}"
tar -xzf /tmp/rally-finalproject.tgz -C "${APP_HOME}"
cd "${APP_HOME}/djangobackend"
rm -rf "${APP_HOME}/.venv"
"$PYTHON" -m venv "${APP_HOME}/.venv"
# shellcheck disable=SC1091
source "${APP_HOME}/.venv/bin/activate"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
fi
python manage.py migrate
python manage.py seed_demo

# Write the unit with Python so a Windows CRLF copy of this script cannot
# leave carriage returns in the file. systemd reports those as "Bad message".
"${APP_HOME}/.venv/bin/python" - <<PY
from pathlib import Path
Path("/tmp/rally-api.service").write_text("""[Unit]
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
""".replace("\r", ""))
PY
sudo cp /tmp/rally-api.service /etc/systemd/system/rally-api.service
sudo systemctl daemon-reload
sudo systemctl enable rally-api
sudo systemctl restart rally-api
sudo systemctl --no-pager --full status rally-api
echo "Daily Challenge API should be listening on port 8000."
