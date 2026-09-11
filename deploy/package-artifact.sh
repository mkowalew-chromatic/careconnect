#!/usr/bin/env bash
#
# deploy/package-artifact.sh — build CareConnect once and package the result
# into a versioned tarball for CI to ship, unchanged, to every environment.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

OUTPUT_DIR="${1:-${PROJECT_ROOT}/artifacts}"
CONFIG_FILE="${2:-}"
if [[ -z "${CONFIG_FILE}" || ! -f "${CONFIG_FILE}" ]]; then
  echo "usage: deploy/package-artifact.sh [output-dir] <config-file>" >&2
  echo "The config file selects DEPLOY_MODE (baked into the frontend bundles), so it must be given explicitly." >&2
  exit 1
fi

echo "==> Building (via build-production.sh)..."
bash "${SCRIPT_DIR}/build-production.sh" "${CONFIG_FILE}"

# build-production.sh sources CONFIG_FILE in its own process, so DEPLOY_MODE
# does not propagate back here — source it again so it's in scope for the
# MANIFEST.json below.
# shellcheck disable=SC1090
source "${CONFIG_FILE}"

VERSION="$(cd "${PROJECT_ROOT}" && node -p "require('./apps/api/package.json').version")"
GIT_SHA="$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD)"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ARTIFACT_NAME="careconnect-${VERSION}-${GIT_SHA}.tar.gz"

cat > "${PROJECT_ROOT}/MANIFEST.json" <<EOF
{"version":"${VERSION}","gitSha":"${GIT_SHA}","builtAt":"${BUILT_AT}","deployMode":"${DEPLOY_MODE}"}
EOF

mkdir -p "${OUTPUT_DIR}"

echo "==> Packaging ${ARTIFACT_NAME}..."
tar -czf "${OUTPUT_DIR}/${ARTIFACT_NAME}" \
  -C "${PROJECT_ROOT}" \
  --exclude='./.git' \
  --exclude='./data' \
  --exclude='./deploy/runtime' \
  --exclude='./artifacts' \
  .

rm -f "${PROJECT_ROOT}/MANIFEST.json"

echo "${OUTPUT_DIR}/${ARTIFACT_NAME}"
