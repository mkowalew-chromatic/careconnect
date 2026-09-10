#!/usr/bin/env bash
#
# deploy/deploy-artifact.sh — deploy a pre-built CareConnect artifact to this VM.
# Used by CI for pre-prod/prod deploys; a human operator doing an ad-hoc
# rebuild-in-place should keep using update.sh instead.
#
# Failure-mode note: if migrations fail after the code sync below, the
# pre-deploy DB backup is restored but careconnect-api is left STOPPED
# (not restarted) — the sync already replaced /opt/careconnect with the new
# (still-broken) code, so restarting would just crash-loop on the same
# migration failure. deploy/rollback.sh is the documented recovery path.
#
set -euo pipefail

ARTIFACT_PATH="${1:?Usage: deploy-artifact.sh <artifact-tarball> [config-file]}"
CONFIG_FILE="${2:-/etc/careconnect/careconnect.env}"
INSTALL_DIR="/opt/careconnect"
WWW_ROOT="/var/www/careconnect"
BACKUP_RETENTION=5

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: Run as root: sudo deploy/deploy-artifact.sh <artifact> [config]" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${CONFIG_FILE}"
APP_USER="${APP_USER:-careconnect}"
DATA_DIR="${CARECONNECT_DATA_DIR:-/var/lib/careconnect}"

HANDLED_FAILURE=0
report_unexpected_failure() {
  if [[ "${HANDLED_FAILURE}" -eq 0 ]]; then
    echo "ERROR: Script exited unexpectedly — careconnect-api may be stopped." >&2
    echo "ERROR: Check: sudo journalctl -u careconnect-api -n 50" >&2
    echo "ERROR: To recover: sudo deploy/rollback.sh <previous-artifact-tarball> <db-backup-path> [config-file]" >&2
  fi
}

echo "==> Extracting artifact ${ARTIFACT_PATH}..."
EXTRACT_DIR="$(mktemp -d)"
trap 'rm -rf "${EXTRACT_DIR}"; report_unexpected_failure' EXIT
tar -xzf "${ARTIFACT_PATH}" -C "${EXTRACT_DIR}"
if [[ -L "${EXTRACT_DIR}/MANIFEST.json" ]]; then
  echo "ERROR: MANIFEST.json is a symlink — refusing to trust an artifact that ships a symlink for its manifest." >&2
  HANDLED_FAILURE=1
  exit 1
fi
if [[ ! -f "${EXTRACT_DIR}/MANIFEST.json" ]]; then
  echo "ERROR: MANIFEST.json missing from artifact — refusing to deploy an unversioned tarball." >&2
  HANDLED_FAILURE=1
  exit 1
fi
echo "==> Artifact manifest: $(cat "${EXTRACT_DIR}/MANIFEST.json")"

ARTIFACT_DEPLOY_MODE="$(grep -o '"deployMode":"[^"]*"' "${EXTRACT_DIR}/MANIFEST.json" | cut -d'"' -f4 || true)"
if [[ -n "${ARTIFACT_DEPLOY_MODE}" && "${ARTIFACT_DEPLOY_MODE}" != "${DEPLOY_MODE:-}" ]]; then
  echo "ERROR: Artifact was built with DEPLOY_MODE=${ARTIFACT_DEPLOY_MODE} but this environment's config specifies DEPLOY_MODE=${DEPLOY_MODE:-<unset>} — refusing to deploy a mismatched artifact." >&2
  HANDLED_FAILURE=1
  exit 1
fi

echo "==> Stopping careconnect-api..."
systemctl stop careconnect-api

echo "==> Backing up database..."
BACKUP_PATH="$(sudo -u "${APP_USER}" env CARECONNECT_DATA_DIR="${DATA_DIR}" \
  node "${INSTALL_DIR}/apps/api/dist/db/backup-cli.js")"
echo "==> Backup written to ${BACKUP_PATH}"

echo "==> Syncing new release into ${INSTALL_DIR}..."
rsync -a --delete \
  --exclude='.git' \
  --exclude='/data' \
  --exclude='/deploy/runtime' \
  "${EXTRACT_DIR}/" "${INSTALL_DIR}/"
chown -R "${APP_USER}:${APP_USER}" "${INSTALL_DIR}"

echo "==> Running database migrations..."
if ! sudo -u "${APP_USER}" env CARECONNECT_DATA_DIR="${DATA_DIR}" \
  node "${INSTALL_DIR}/apps/api/dist/db/run-migrations.js"; then
  echo "ERROR: Migration failed — database backup restored, careconnect-api left STOPPED to avoid a crash loop on the still-broken new code." >&2
  cp "${BACKUP_PATH}" "${DATA_DIR}/careconnect.db"
  chown "${APP_USER}:${APP_USER}" "${DATA_DIR}/careconnect.db"
  echo "ERROR: To recover, run: sudo deploy/rollback.sh <previous-artifact-tarball> ${BACKUP_PATH}" >&2
  HANDLED_FAILURE=1
  exit 1
fi

echo "==> Publishing static files..."
mkdir -p "${WWW_ROOT}/portal" "${WWW_ROOT}/ehr"
rsync -a --delete "${INSTALL_DIR}/apps/portal/dist/" "${WWW_ROOT}/portal/"
rsync -a --delete "${INSTALL_DIR}/apps/ehr/dist/" "${WWW_ROOT}/ehr/"
chown -R www-data:www-data "${WWW_ROOT}"

echo "==> Starting careconnect-api..."
systemctl start careconnect-api
systemctl reload nginx

echo "==> Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:5000/health 2>/dev/null | grep -q '"service"[[:space:]]*:[[:space:]]*"careconnect-api"'; then
    echo "==> Deploy complete — API healthy."
    bash "${INSTALL_DIR}/deploy/prune-backups.sh" "${DATA_DIR}" "${BACKUP_RETENTION}"
    HANDLED_FAILURE=1
    exit 0
  fi
  sleep 1
done

echo "ERROR: API health check failed after deploy — run: journalctl -u careconnect-api -n 50" >&2
HANDLED_FAILURE=1
exit 1
