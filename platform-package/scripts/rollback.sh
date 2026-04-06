#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/dos-platform/backups}"

echo "═══════════════════════════════════════════"
echo "  DOS Platform R1.5 — Rollback"
echo "═══════════════════════════════════════════"

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup-timestamp>"
  echo ""
  echo "Available backups:"
  ls -1 "$BACKUP_DIR" 2>/dev/null || echo "  (no backups found in $BACKUP_DIR)"
  exit 1
fi

TIMESTAMP="$1"
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

if [ ! -d "$BACKUP_PATH" ]; then
  echo "FAIL: Backup not found at $BACKUP_PATH"
  exit 1
fi

echo "[1/5] Stopping platform service..."
if command -v pm2 &>/dev/null && pm2 describe dos-platform &>/dev/null; then
  pm2 stop dos-platform
elif command -v systemctl &>/dev/null && systemctl is-active dos-platform &>/dev/null; then
  systemctl stop dos-platform
else
  echo "WARN: No known process manager found. Stop the service manually."
fi

echo "[2/5] Restoring application code..."
if [ -f "$BACKUP_PATH/dist.tar.gz" ]; then
  cd "$ROOT_DIR/backend"
  rm -rf dist/
  tar xzf "$BACKUP_PATH/dist.tar.gz"
fi

echo "[3/5] Restoring database..."
if [ -f "$BACKUP_PATH/db.sql.gz" ]; then
  DB_NAME="${DB_NAME:-dos_platform}"
  gunzip -c "$BACKUP_PATH/db.sql.gz" | psql "$DATABASE_URL" 2>/dev/null || \
    echo "WARN: Database restore requires manual intervention. File: $BACKUP_PATH/db.sql.gz"
fi

echo "[4/5] Starting platform service..."
if command -v pm2 &>/dev/null && pm2 describe dos-platform &>/dev/null; then
  pm2 start dos-platform
elif command -v systemctl &>/dev/null; then
  systemctl start dos-platform
else
  echo "WARN: Start the service manually."
fi

echo "[5/5] Running post-rollback smoke test..."
sleep 5
bash "$SCRIPT_DIR/smoke-test.sh" || echo "WARN: Smoke tests failed after rollback"

echo ""
echo "ROLLBACK COMPLETE — verify application state"
echo "═══════════════════════════════════════════"
