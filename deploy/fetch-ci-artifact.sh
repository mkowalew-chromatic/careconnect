#!/usr/bin/env bash
#
# deploy/fetch-ci-artifact.sh — download the artifact from the most recent
# successful "CD Pipeline" run, so a manual deploy (remote-install.sh) ships
# the exact build CI already validated, instead of rebuilding from source.
#
# Requires the GitHub CLI, authenticated with read access to this repo:
#   https://cli.github.com
#   gh auth login
#
# Usage:
#   deploy/fetch-ci-artifact.sh [output-dir]
#
# Prints the downloaded tarball's path as the last line of output, so callers
# can capture it directly: ARTIFACT="$(deploy/fetch-ci-artifact.sh)"
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

OUTPUT_DIR="${1:-${PROJECT_ROOT}/artifacts}"
ALLOW_STALE="${ALLOW_STALE:-false}"

# All progress goes to stderr so stdout carries only the final artifact path.
log() { printf '==> %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v gh >/dev/null 2>&1 \
  || die "GitHub CLI (gh) is required: https://cli.github.com — then run: gh auth login"
gh auth status >/dev/null 2>&1 \
  || die "gh is not authenticated — run: gh auth login"

log "Finding the latest successful CD Pipeline run on main..."
RUN_ID=$(gh run list --workflow cd-pipeline.yml --status success --branch main --limit 1 --json databaseId --jq '.[0].databaseId')
[[ -n "${RUN_ID}" && "${RUN_ID}" != "null" ]] \
  || die "No successful CD Pipeline run found. Push to main and wait for CI + CD Pipeline to complete, or use --build-from-source."

RUN_SHA=$(gh run view "${RUN_ID}" --json headSha --jq '.headSha')
LOCAL_SHA=$(git -C "${PROJECT_ROOT}" rev-parse HEAD)

if [[ "${RUN_SHA}" != "${LOCAL_SHA}" ]]; then
  if [[ "${ALLOW_STALE}" != "true" ]]; then
    die "Latest CD Pipeline artifact is for commit ${RUN_SHA:0:7}, but your local checkout is at ${LOCAL_SHA:0:7}.
Run 'git pull' on main and wait for CI + CD Pipeline to finish for that commit, then retry.
To deploy this older artifact anyway: ALLOW_STALE=true deploy/fetch-ci-artifact.sh
To rebuild from source instead (bypasses CI validation): remote-install.sh --build-from-source"
  fi
  log "WARNING: deploying artifact for ${RUN_SHA:0:7}, which differs from local HEAD ${LOCAL_SHA:0:7} (ALLOW_STALE=true)."
fi

mkdir -p "${OUTPUT_DIR}"
log "Downloading artifact from run ${RUN_ID} (commit ${RUN_SHA:0:7})..."
gh run download "${RUN_ID}" -n careconnect-artifact -D "${OUTPUT_DIR}" >&2

ARTIFACT_FILE=$(find "${OUTPUT_DIR}" -maxdepth 1 -name '*.tar.gz' | head -n 1)
[[ -n "${ARTIFACT_FILE}" ]] || die "Download succeeded but no .tar.gz found in ${OUTPUT_DIR}"

echo "${ARTIFACT_FILE}"
