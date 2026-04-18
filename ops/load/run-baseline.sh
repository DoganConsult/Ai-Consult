#!/usr/bin/env bash
# Dogan AI OS - k6 baseline runner. Records summary JSON for trend tracking.
set -euo pipefail

OUT_DIR="${OUT_DIR:-/var/log/dogan-ai-os/load}"
install -d -m 0755 "$OUT_DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
SUMMARY="${OUT_DIR}/baseline-${STAMP}.json"

BASE_URL="${BASE_URL:-http://127.0.0.1:3100}" \
TOKEN="${TOKEN:-}" \
k6 run \
  --summary-export="$SUMMARY" \
  --tag commit="${GIT_COMMIT:-unknown}" \
  /root/Ai-Consult-Microservices/ops/load/baseline.k6.js

echo "wrote $SUMMARY"
