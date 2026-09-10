#!/usr/bin/env bash
#
# CareConnect production build — used by install.sh on Ubuntu VMs.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

_ENV_DEPLOY_MODE="${DEPLOY_MODE:-}"

# shellcheck source=deploy/careconnect.env.example
source "${1:-${SCRIPT_DIR}/careconnect.env.example}"

[[ -n "${_ENV_DEPLOY_MODE}" ]] && DEPLOY_MODE="${_ENV_DEPLOY_MODE}"

cd "${PROJECT_ROOT}"

export CI=true

if [[ "${DEPLOY_MODE}" == "path" ]]; then
  export VITE_EHR_BASE="${EHR_BASE_PATH:-/ehr/}"
  export VITE_PORTAL_BASE="${PORTAL_BASE_PATH:-/}"
else
  export VITE_EHR_BASE="/"
  export VITE_PORTAL_BASE="/"
fi

if [[ ! -f package-lock.json ]]; then
  echo "ERROR: package-lock.json missing — run npm install locally and commit the lockfile." >&2
  exit 1
fi

echo "==> Installing npm dependencies (including dev, for build)..."
npm ci --include=dev

echo "==> Building (types + design-system -> api/ehr/portal, via turbo)..."
echo "    EHR base: ${VITE_EHR_BASE} · Portal base: ${VITE_PORTAL_BASE}"
NODE_ENV=production npm run build

# Verify all expected artifacts exist
for artifact in \
  packages/types/dist/index.js \
  packages/design-system/dist/index.js \
  apps/api/dist/index.js \
  apps/ehr/dist/index.html \
  apps/portal/dist/index.html
do
  [[ -f "${artifact}" ]] || { echo "ERROR: Build artifact missing: ${artifact}" >&2; exit 1; }
done

echo "==> Pruning devDependencies (keep production runtime only)..."
npm prune --omit=dev

echo "==> Build complete."
echo "    API:       ${PROJECT_ROOT}/apps/api/dist"
echo "    EHR:       ${PROJECT_ROOT}/apps/ehr/dist"
echo "    Portal:    ${PROJECT_ROOT}/apps/portal/dist"
