#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3010}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "$expected_status" ]; then
    echo "  PASS  $name ($status)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (got $status, expected $expected_status)"
    FAIL=$((FAIL + 1))
  fi
}

check_json() {
  local name="$1"
  local url="$2"
  local field="$3"

  body=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "{}")
  if echo "$body" | grep -q "$field"; then
    echo "  PASS  $name (field '$field' present)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (field '$field' missing in response)"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════"
echo "  DOS Platform R1.5 — Production Smoke"
echo "  Target: $BASE_URL"
echo "═══════════════════════════════════════════"
echo ""

echo "── Core Health ─────────────────────────────"
check "GET /api/health"             "$BASE_URL/api/health"           200
check "GET /api/health/live"        "$BASE_URL/api/health/live"      200
check "GET /api/health/ready"       "$BASE_URL/api/health/ready"     200
check "GET /api/metrics"            "$BASE_URL/api/metrics"          200
check "GET /api/nonexistent"        "$BASE_URL/api/nonexistent"      404

echo ""
echo "── Auth Endpoints ──────────────────────────"
check "POST /api/auth/login (no body)"  "$BASE_URL/api/auth/login"   400
check "GET /api/auth/userinfo"          "$BASE_URL/api/auth/userinfo" 401

echo ""
echo "── Platform Admin (auth required) ──────────"
check "GET /api/platform/admin/overview"         "$BASE_URL/api/platform/admin/overview"          401
check "GET /api/platform/admin/governance-matrix" "$BASE_URL/api/platform/admin/governance-matrix" 401
check "GET /api/platform/admin/access-profiles"  "$BASE_URL/api/platform/admin/access-profiles"   401
check "GET /api/platform/admin/permissions"      "$BASE_URL/api/platform/admin/permissions"       401
check "GET /api/platform/admin/products"         "$BASE_URL/api/platform/admin/products"          401
check "GET /api/platform/admin/modules"          "$BASE_URL/api/platform/admin/modules"           401
check "GET /api/platform/admin/feature-flags"    "$BASE_URL/api/platform/admin/feature-flags"     401
check "GET /api/platform/admin/platform-config"  "$BASE_URL/api/platform/admin/platform-config"   401

echo ""
echo "── Frontend Static Serving ─────────────────"
check "GET / (frontend SPA)"       "$BASE_URL/"                      200

echo ""
echo "── Health Response Body ────────────────────"
check_json "Health has status"    "$BASE_URL/api/health"  "status"
check_json "Health has version"   "$BASE_URL/api/health"  "version"

echo ""
echo "═══════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
