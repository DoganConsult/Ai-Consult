#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "═══════════════════════════════════════════"
echo "  DOS Platform Package R1.5 — Full Build"
echo "═══════════════════════════════════════════"

echo ""
echo "[1/6] Installing backend dependencies..."
cd "$ROOT_DIR/backend"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "[2/6] Backend typecheck..."
pnpm run typecheck || { echo "FAIL: Backend TypeScript errors found"; exit 1; }

echo "[3/6] Compiling backend..."
pnpm run build

if [ ! -f dist/server.js ]; then
  echo "FAIL: dist/server.js not found"
  exit 1
fi
echo "  ✓ Backend compiled to dist/"

echo "[4/6] Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "[5/6] Building frontend (production)..."
pnpm run build || { echo "FAIL: Frontend build failed"; exit 1; }

if [ ! -f dist/dos-platform/browser/index.html ]; then
  echo "FAIL: Frontend dist/dos-platform/browser/index.html not found"
  exit 1
fi
echo "  ✓ Frontend compiled to dist/dos-platform/"

echo "[6/6] Verifying deployment package..."
cd "$ROOT_DIR"
echo "  Backend:  $(find backend/dist -name '*.js' | wc -l) JS files"
echo "  Frontend: $(find frontend/dist -name '*.js' -o -name '*.html' -o -name '*.css' | wc -l) static files"

echo ""
echo "═══════════════════════════════════════════"
echo "  BUILD PASSED — ready for deployment"
echo ""
echo "  Start with:"
echo "    pm2 start ecosystem.config.js"
echo "  Or directly:"
echo "    cd backend && node dist/server.js"
echo "═══════════════════════════════════════════"
