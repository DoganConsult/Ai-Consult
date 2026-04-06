#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/dos-platform/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

echo "═══════════════════════════════════════════"
echo "  DOS Platform R1.5 — Backup"
echo "  Target: $BACKUP_PATH"
echo "═══════════════════════════════════════════"

mkdir -p "$BACKUP_PATH"

echo "[1/4] Backing up application dist..."
if [ -d "$ROOT_DIR/backend/dist" ]; then
  cd "$ROOT_DIR/backend"
  tar czf "$BACKUP_PATH/dist.tar.gz" dist/
  echo "  dist.tar.gz created"
else
  echo "  WARN: No dist/ directory found. Skipping."
fi

echo "[2/4] Backing up database..."
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_PATH/db.sql.gz"
  echo "  db.sql.gz created ($(du -sh "$BACKUP_PATH/db.sql.gz" | cut -f1))"
else
  echo "  WARN: DATABASE_URL not set. Skipping database backup."
fi

echo "[3/4] Backing up config..."
if [ -f "$ROOT_DIR/backend/.env" ]; then
  cp "$ROOT_DIR/backend/.env" "$BACKUP_PATH/env.backup"
  echo "  env.backup created"
fi

echo "[4/4] Creating manifest..."
cat > "$BACKUP_PATH/manifest.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "platform_version": "1.5.0",
  "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
  "created_by": "$(whoami)",
  "hostname": "$(hostname)",
  "files": $(ls -1 "$BACKUP_PATH" | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null || echo '[]')
}
EOF

echo ""
echo "BACKUP COMPLETE — $BACKUP_PATH"
echo "═══════════════════════════════════════════"
