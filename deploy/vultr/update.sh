#!/usr/bin/env bash
# Pull the latest code and restart the API. Run as root on the server.
set -euo pipefail
git -C /opt/skillshare pull --ff-only
/opt/skillshare/backend/.venv/bin/pip install --quiet -r /opt/skillshare/backend/requirements.txt
chown -R skillshare:skillshare /opt/skillshare
systemctl restart skillshare-api
systemctl --no-pager status skillshare-api | head -5
