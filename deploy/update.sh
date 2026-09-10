#!/usr/bin/env bash
#
# Rebuild and redeploy CareConnect after pulling updates.
#
set -euo pipefail

CONFIG_FILE="${1:-/etc/careconnect/careconnect.env}"
INSTALL_DIR="/opt/careconnect"
WWW_ROOT="/var/www/careconnect"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: Run as root: sudo deploy/update.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${CONFIG_FILE}"
APP_USER="${APP_USER:-careconnect}"

echo "==> Rebuilding CareConnect..."
# Every workspace, the design system included, is private and built from source
# here, so npm needs no registry credentials on this VM.
sudo -u "${APP_USER}" env HOME="${INSTALL_DIR}" bash "${INSTALL_DIR}/deploy/build-production.sh" "${CONFIG_FILE}"

echo "==> Publishing static files..."
mkdir -p "${WWW_ROOT}/portal" "${WWW_ROOT}/ehr"
rsync -a --delete "${INSTALL_DIR}/apps/portal/dist/" "${WWW_ROOT}/portal/"
rsync -a --delete "${INSTALL_DIR}/apps/ehr/dist/" "${WWW_ROOT}/ehr/"
chown -R www-data:www-data "${WWW_ROOT}"

echo "==> Restarting services..."
systemctl restart careconnect-api
systemctl reload nginx

echo "==> Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:5000/health 2>/dev/null | grep -q '"service"[[:space:]]*:[[:space:]]*"careconnect-api"'; then
    echo "==> Update complete — API healthy."
    exit 0
  fi
  sleep 1
done

echo "WARNING: API health check failed — run: journalctl -u careconnect-api -n 50" >&2
exit 1
