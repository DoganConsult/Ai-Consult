#!/usr/bin/env bash
set -euo pipefail

# DOS Platform Package R1.5 — Database Initialization
# Creates the dos_platform database with required extensions.
# Usage: ./scripts/init-db.sh [DB_USER] [DB_NAME] [DB_HOST] [DB_PORT]

DB_USER="${1:-${DB_USER:-dos_admin}}"
DB_NAME="${2:-${DB_DATABASE:-dos_platform}}"
DB_HOST="${3:-${DB_HOST:-localhost}}"
DB_PORT="${4:-${DB_PORT:-5432}}"

PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER"

echo "═══════════════════════════════════════════════"
echo " DOS Platform — Database Initialization"
echo " Domain: dogan-ai.com"
echo "═══════════════════════════════════════════════"
echo ""
echo " Target: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

echo "[1/5] Creating database '$DB_NAME' (if not exists)..."
$PSQL -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  $PSQL -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo "  ✓ Database ready"

echo "[2/5] Enabling pgvector extension..."
$PSQL -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"
echo "  ✓ pgvector enabled"

echo "[3/5] Enabling uuid-ossp extension..."
$PSQL -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
echo "  ✓ uuid-ossp enabled"

echo "[4/5] Enabling pgcrypto extension..."
$PSQL -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
echo "  ✓ pgcrypto enabled"

echo "[5/5] Enabling Apache AGE extension (if available)..."
$PSQL -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS age;" 2>/dev/null && \
  echo "  ✓ Apache AGE enabled" || \
  echo "  ⚠ Apache AGE not available (optional — graph queries disabled)"

echo ""
echo "═══════════════════════════════════════════════"
echo " Database initialization complete."
echo ""
echo " Next steps:"
echo "   1. Copy config/production.env.example to backend/.env"
echo "   2. Set DATABASE_URL=postgresql://$DB_USER:<password>@$DB_HOST:$DB_PORT/$DB_NAME"
echo "   3. Run migrations: cd backend && pnpm migrate"
echo "   4. Start server: pnpm dev"
echo "═══════════════════════════════════════════════"
