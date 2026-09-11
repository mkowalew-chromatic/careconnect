#!/usr/bin/env bash
#
# One-time setup: install your SSH public key on the CareConnect VM.
#
# Run this in your terminal (password prompt expected once):
#   VM_USER=ubuntu VM_HOST=<vm-ip> ./deploy/setup-ssh-key.sh
#
set -euo pipefail

[[ -n "${VM_HOST:-}" && -n "${VM_USER:-}" ]] \
  || { echo "ERROR: set VM_USER and VM_HOST, e.g. VM_USER=ubuntu VM_HOST=<vm-ip> $0" >&2; exit 1; }
KEY="${SSH_KEY:-$HOME/.ssh/id_rsa.pub}"

if [[ ! -f "${KEY}" ]]; then
  echo "No key at ${KEY}. Generating one..."
  ssh-keygen -t ed25519 -f "${HOME}/.ssh/id_ed25519_careconnect" -N "" -C "careconnect@${VM_HOST}"
  KEY="${HOME}/.ssh/id_ed25519_careconnect.pub"
fi

echo "Installing $(basename "${KEY}") on ${VM_USER}@${VM_HOST}..."
echo "(Enter the VM password when prompted)"
echo ""

ssh-copy-id -i "${KEY}" "${VM_USER}@${VM_HOST}"

echo ""
echo "Testing connection..."
ssh -o BatchMode=yes "${VM_USER}@${VM_HOST}" "echo 'SSH key auth works on $(hostname)'"

echo ""
echo "Done. You can now run:"
echo "  ssh ${VM_USER}@${VM_HOST}"
echo "  VM_USER=${VM_USER} VM_HOST=${VM_HOST} ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env"
