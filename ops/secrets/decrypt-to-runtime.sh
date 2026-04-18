#!/usr/bin/env bash
# Decrypt ops/secrets/*.enc.env into the runtime EnvironmentFile location.
# Owned by root, mode 0600. Designed to run as a systemd ExecStartPre.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/Ai-Consult-Microservices}"
SECRETS_DIR="${REPO_DIR}/ops/secrets"
RUNTIME_DIR="${RUNTIME_DIR:-/etc/dogan-ai-os}"
AGE_KEY="${SOPS_AGE_KEY_FILE:-/etc/dogan-ai-os/age/key.txt}"

[[ -f "$AGE_KEY" ]] || { echo "missing age key: $AGE_KEY" >&2; exit 1; }
export SOPS_AGE_KEY_FILE="$AGE_KEY"

install -d -m 0700 "$RUNTIME_DIR"
for src in "$SECRETS_DIR"/*.enc.env; do
  [[ -f "$src" ]] || continue
  name=$(basename "$src" .enc.env)
  tmp=$(mktemp "${RUNTIME_DIR}/.${name}.XXXXXX")
  trap 'rm -f "$tmp"' EXIT
  /usr/local/bin/sops --input-type dotenv --output-type dotenv -d "$src" > "$tmp"
  chmod 0600 "$tmp"
  mv "$tmp" "${RUNTIME_DIR}/${name}.env"
  trap - EXIT
done
