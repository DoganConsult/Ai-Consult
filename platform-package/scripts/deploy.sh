#!/usr/bin/env bash
# Gate 10 — Mandatory backup-before-deploy.
# Runs:
#   1) backup.sh   (db + dist + env to /var/dos-platform/backups/<ts>)
#   2) build.sh    (workspace + backend + frontend + preflight)
#   3) pm2 reload  ecosystem.config.js
#   4) smoke-test against the live BFF
# On any failure after the backup completes the operator is told the exact
# backup path so they can `restore.sh <path>` to roll back.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
ECOSYSTEM="${ECOSYSTEM:-$REPO_ROOT/ecosystem.config.js}"
SMOKE_BASE="${SMOKE_BASE:-http://127.0.0.1:3010}"

echo "═══════════════════════════════════════════"
echo "  DOS Platform — Backup → Build → Deploy"
echo "═══════════════════════════════════════════"

BACKUP_DIR="${BACKUP_DIR:-/var/dos-platform/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
export BACKUP_DIR
export DEPLOY_BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

echo "[1/4] Pre-deploy backup → $DEPLOY_BACKUP_PATH"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$BACKUP_DIR" bash "$SCRIPT_DIR/backup.sh" \
  || { echo "FAIL: pre-deploy backup failed — refusing to deploy"; exit 1; }

echo ""
echo "[2/4] Building (preflight runs inside)..."
bash "$SCRIPT_DIR/build.sh" \
  || { echo "FAIL: build failed. Backup preserved at $DEPLOY_BACKUP_PATH"; exit 2; }

echo ""
echo "[3/4] Reloading pm2 services..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload "$ECOSYSTEM" --update-env \
    || { echo "FAIL: pm2 reload failed. Restore with: bash $SCRIPT_DIR/restore.sh $DEPLOY_BACKUP_PATH"; exit 3; }
else
  echo "  WARN: pm2 not on PATH — skipping reload"
fi

echo ""
echo "[4/4] Smoke test against $SMOKE_BASE"
sleep 3
bash "$SCRIPT_DIR/smoke-test.sh" "$SMOKE_BASE" \
  || { echo "FAIL: smoke test failed. Restore with: bash $SCRIPT_DIR/restore.sh $DEPLOY_BACKUP_PATH"; exit 4; }

echo ""
echo "═══════════════════════════════════════════"
echo "  DEPLOY OK — backup retained at"
echo "  $DEPLOY_BACKUP_PATH"
echo "═══════════════════════════════════════════"
