#!/usr/bin/env bash
# One-shot setup of the FastAPI backend on a fresh Ubuntu 24.04 Vultr server.
# Run as root:   bash setup.sh <api-hostname>
#   <api-hostname> is where the API will live, e.g. api.yourdomain.com
#   or, with no domain, <ip-with-dashes>.sslip.io  (66.42.1.2 -> 66-42-1-2.sslip.io)
set -euo pipefail

API_HOST="${1:?Usage: bash setup.sh <api-hostname>}"
REPO="${REPO:-https://github.com/goople-tech/skillshare.git}"
APP_DIR=/opt/skillshare
BACKEND="$APP_DIR/backend"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 python3-venv python3-pip git caddy ufw

id skillshare >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin skillshare

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
fi

python3 -m venv "$BACKEND/.venv"
"$BACKEND/.venv/bin/pip" install --quiet --upgrade pip
"$BACKEND/.venv/bin/pip" install --quiet -r "$BACKEND/requirements.txt"

# Secrets live only in this file on the server. It is created once from the example and never overwritten.
if [ ! -f "$BACKEND/.env" ]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "CORS_ORIGINS=https://skillshare.app.space,http://localhost:5174" >> "$BACKEND/.env"
  echo ">>> Created $BACKEND/.env : fill in AUTH0_DOMAIN, AUTH0_AUDIENCE and GEMINI_API_KEY, then: systemctl restart skillshare-api"
fi
chown -R skillshare:skillshare "$APP_DIR"
chmod 600 "$BACKEND/.env"

cat > /etc/systemd/system/skillshare-api.service <<UNIT
[Unit]
Description=UBC Ver. FastAPI backend
After=network.target

[Service]
User=skillshare
WorkingDirectory=$BACKEND
ExecStart=$BACKEND/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

# Caddy terminates HTTPS (automatic Let's Encrypt certificate) and forwards to uvicorn.
cat > /etc/caddy/Caddyfile <<CADDY
$API_HOST {
	reverse_proxy 127.0.0.1:8000
}
CADDY

ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

systemctl daemon-reload
systemctl enable --now skillshare-api
systemctl restart caddy

echo
echo "Done. Check:  https://$API_HOST/docs"
echo "Logs:         journalctl -u skillshare-api -f"
