#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/dos-platform/backups}"

echo "═══════════════════════════════════════════"
echo "  DOS Platform R1.5 — Restore"
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

if [ -f "$BACKUP_PATH/manifest.json" ]; then
  echo "Backup manifest:"
  cat "$BACKUP_PATH/manifest.json"
  echo ""
fi

read -p "Proceed with restore from $TIMESTAMP? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "[1/3] Restoring application dist..."
if [ -f "$BACKUP_PATH/dist.tar.gz" ]; then
  cd "$ROOT_DIR/backend"
  rm -rf dist/
  tar xzf "$BACKUP_PATH/dist.tar.gz"
  echo "  dist/ restored"
else
  echo "  SKIP: No dist backup found."
fi

echo "[2/3] Restoring database..."
if [ -f "$BACKUP_PATH/db.sql.gz" ]; then
  if [ -n "${DATABASE_URL:-}" ]; then
    echo "  WARNING: This will overwrite the current database."
    read -p "  Continue? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      gunzip -c "$BACKUP_PATH/db.sql.gz" | psql "$DATABASE_URL"
      echo "  Database restored."
    else
      echo "  Database restore skipped."
    fi
  else
    echo "  SKIP: DATABASE_URL not set."
  fi
else
  echo "  SKIP: No database backup found."
fi

echo "[3/3] Restoring config..."
if [ -f "$BACKUP_PATH/env.backup" ]; then
  cp "$BACKUP_PATH/env.backup" "$ROOT_DIR/backend/.env"
  echo "  .env restored"
fi

echo ""
echo "RESTORE COMPLETE — restart the platform service to apply"
echo "═══════════════════════════════════════════"
