#!/usr/bin/env bash
# Start the Django development server so it answers on the EC2 public IP.
#
# The server binds 0.0.0.0 rather than the public IP itself: a listening socket
# can only bind an address that exists on a local interface, and the public IP
# lives on the AWS edge, not on the instance's NIC. Binding 0.0.0.0 covers every
# interface, which is what makes http://$EC2_PUBLIC_IP:$PORT reachable.
set -euo pipefail

EC2_PUBLIC_IP="${DJANGO_EC2_PUBLIC_IP:-54.176.159.190}"
PORT="${DJANGO_SERVER_PORT:-8000}"

cd "$(dirname "$0")"

if [[ ! -d myvenv ]]; then
  echo "No myvenv/ found. Create it first: python3 -m venv myvenv" >&2
  exit 1
fi

source myvenv/bin/activate

export DJANGO_EC2_PUBLIC_IP="$EC2_PUBLIC_IP"
export DJANGO_SERVER_PORT="$PORT"

echo "Serving on all interfaces (0.0.0.0:$PORT)."
echo "  Public:    http://$EC2_PUBLIC_IP:$PORT/"
echo "  API:       http://$EC2_PUBLIC_IP:$PORT/api/customers/"
echo "  Admin:     http://$EC2_PUBLIC_IP:$PORT/admin/"
echo "  Local:     http://127.0.0.1:$PORT/"
echo
echo "If the public URL times out, open TCP $PORT to your IP in the instance's"
echo "EC2 security group inbound rules."
echo

cd myproject
exec python3 manage.py runserver "0.0.0.0:$PORT"
