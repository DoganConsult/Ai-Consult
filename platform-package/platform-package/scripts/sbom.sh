#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${1:-$ROOT_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SBOM_FILE="$OUTPUT_DIR/sbom-dos-platform-r15-$TIMESTAMP.json"

echo "═══════════════════════════════════════════"
echo "  DOS Platform R1.5 — SBOM Generation"
echo "═══════════════════════════════════════════"

cd "$ROOT_DIR/backend"

if command -v npx &>/dev/null; then
  echo "[1/2] Generating CycloneDX SBOM..."
  npx @cyclonedx/cyclonedx-npm --output-file "$SBOM_FILE" --spec-version 1.5 2>/dev/null || {
    echo "  CycloneDX generator not available. Falling back to pnpm list."
    pnpm list --json --depth=0 > "$SBOM_FILE"
  }
else
  echo "[1/2] Generating dependency list..."
  pnpm list --json --depth=0 > "$SBOM_FILE" 2>/dev/null || \
    node -e "console.log(JSON.stringify(require('./package.json').dependencies, null, 2))" > "$SBOM_FILE"
fi

echo "[2/2] SBOM metadata..."
DEPS=$(node -e "const p = require('./package.json'); console.log(Object.keys(p.dependencies || {}).length)" 2>/dev/null || echo "?")
DEV_DEPS=$(node -e "const p = require('./package.json'); console.log(Object.keys(p.devDependencies || {}).length)" 2>/dev/null || echo "?")

echo "  Platform:     DOS Platform R1.5"
echo "  Dependencies: $DEPS production, $DEV_DEPS dev"
echo "  Output:       $SBOM_FILE"
echo "  Size:         $(du -sh "$SBOM_FILE" | cut -f1)"

echo ""
echo "SBOM GENERATED — $SBOM_FILE"
echo "═══════════════════════════════════════════"
