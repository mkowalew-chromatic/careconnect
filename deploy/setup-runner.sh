#!/usr/bin/env bash
#
# deploy/setup-runner.sh — install a self-hosted GitHub Actions runner on a
# LAN host so the Deploy workflow can reach VMs that GitHub-hosted runners
# cannot. Run from your laptop; the runner is installed over SSH as a systemd
# service under VM_USER and labelled `careconnect-lan`, which
# .github/workflows/deploy-environment.yml selects with `runs-on`.
#
#   deploy/setup-runner.sh --config deploy/<environment>.env
#   VM_USER=<user> VM_HOST=<lan-ip> [SSH_KEY=~/.ssh/key] deploy/setup-runner.sh
#
# Requires the GitHub CLI authenticated with admin access to the repo (to mint
# a registration token) and passwordless sudo for VM_USER on the host.
# Re-running re-registers the runner (--replace) without reinstalling.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/remote.sh
source "${SCRIPT_DIR}/lib/remote.sh"

CONFIG_FILE=""
case "${1:-}" in
  --config) CONFIG_FILE="${2:-}" ;;
  -h|--help) sed -n '3,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "") ;;
  *) CONFIG_FILE="$1" ;;
esac
cc_resolve_ssh_target "${CONFIG_FILE}"

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
RUNNER_NAME="${RUNNER_NAME:-$(ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" hostname)-careconnect}"
RUNNER_DIR="${RUNNER_DIR:-actions-runner-careconnect}"
RUNNER_LABELS="${RUNNER_LABELS:-careconnect-lan}"
VERSION="$(gh api repos/actions/runner/releases/latest --jq '.tag_name' | sed 's/^v//')"

cc_log "Registering runner '${RUNNER_NAME}' (labels: ${RUNNER_LABELS}) for ${REPO} on ${SSH_TARGET}"
TOKEN="$(gh api -X POST "repos/${REPO}/actions/runners/registration-token" --jq .token)"

# The token goes over stdin into a mode-600 file the remote script consumes
# and deletes, so it never appears in a command line, process list or history.
printf '%s' "${TOKEN}" | ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" 'umask 077; cat > ~/.runner-registration-token'

ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" bash -s -- "${VERSION}" "${REPO}" "${RUNNER_NAME}" "${RUNNER_LABELS}" "${RUNNER_DIR}" <<'EOF'
set -euo pipefail
VERSION="$1" REPO="$2" RUNNER_NAME="$3" RUNNER_LABELS="$4" RUNNER_DIR="$5"
TOKEN="$(cat ~/.runner-registration-token)"; rm -f ~/.runner-registration-token
mkdir -p ~/"${RUNNER_DIR}" && cd ~/"${RUNNER_DIR}"
if [ ! -x ./config.sh ]; then
  echo "==> Downloading actions-runner ${VERSION}..."
  curl -sSL -o runner.tar.gz "https://github.com/actions/runner/releases/download/v${VERSION}/actions-runner-linux-x64-${VERSION}.tar.gz"
  tar -xzf runner.tar.gz && rm runner.tar.gz
fi
if [ -f .runner ]; then
  echo "==> Runner already configured; stopping service before re-registering..."
  sudo ./svc.sh stop >/dev/null 2>&1 || true
  sudo ./svc.sh uninstall >/dev/null 2>&1 || true
fi
echo "==> Configuring..."
./config.sh --unattended --replace \
  --url "https://github.com/${REPO}" --token "${TOKEN}" \
  --name "${RUNNER_NAME}" --labels "${RUNNER_LABELS}" --work _work \
  | grep -vi token || true
echo "==> Installing as a systemd service (user $(whoami))..."
sudo ./svc.sh install "$(whoami)" | tail -1
sudo ./svc.sh start | tail -2
EOF

cc_log "Runners registered for ${REPO}:"
gh api "repos/${REPO}/actions/runners" --jq '.runners[] | "  \(.name)  \(.status)  labels=\([.labels[].name] | join(","))"'
