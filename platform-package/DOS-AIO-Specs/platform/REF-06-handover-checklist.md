# REF-06 -- Handover Acceptance Checklist

> **Platform:** Dogan-AI-OS (DOS) / Shahin-AI AGRC
> **Date:** 2026-04-05

---

## 1. Pre-Handover Gates

All items must be verified before handover can proceed. Any unchecked item blocks handover (Law 14: No PASS with missing required items).

### 1.1 Database and Schema

- [ ] All public-schema migrations applied successfully
- [ ] 244 public tables verified via `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'` (239 pre-session-9 + 5 new)
- [ ] Master seed data loaded (config_definitions >= 26, regulatory_frameworks >= 32, onboarding_questions >= 94)
- [ ] Rollback SQL tested in staging environment
- [ ] No orphaned or partial migration states in `schema_migrations` table

### 1.2 Tenant Provisioning

- [ ] First tenant provisioned end-to-end (53/53 steps completed)
- [ ] Tenant schema created with correct naming: `tenant_{uuid}`
- [ ] Tenant-schema tables verified via `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'tenant_...'`
- [ ] Provisioning job status is `completed` (no `failed` steps)
- [ ] Post-seed validations passed (step 37)
- [ ] Workspace activated (step 38)
- [ ] Access snapshot emitted (step 53)

### 1.3 Runtime Infrastructure

- [ ] PM2 process running: `pm2 status` shows `dos-backend` online (2 cluster instances)
- [ ] Health endpoint returns 200: `curl http://localhost:3000/api/health`
- [ ] Readiness probe returns 200: `curl http://localhost:3000/api/health/ready`
- [ ] Liveness probe returns 200: `curl http://localhost:3000/api/health/live`
- [ ] Database connectivity confirmed via readiness probe (`database: connected`)
- [ ] Redis connectivity confirmed (or memory fallback active)
- [ ] PM2 log files present at `/opt/shahin-grc/logs/pm2-out.log` and `pm2-error.log`

### 1.4 Authentication Flow

- [ ] User registration works: `POST /api/auth/register`
- [ ] User login works: `POST /api/auth/login` returns JWT
- [ ] Token refresh works: `POST /api/auth/refresh`
- [ ] Session validation works: `GET /api/auth/userinfo` with Bearer token
- [ ] Rate limiting active: auth routes limited to 60 req/min

### 1.5 Onboarding Flow

- [ ] Onboarding session creation works
- [ ] All 18 stages navigable in sequence
- [ ] Question bank loads for each stage (94 total questions)
- [ ] Lookup tables resolve correctly (countries, cities, sectors, timezones)
- [ ] Dependent lookups work (city depends on country, sub-sector depends on sector)
- [ ] Regulatory framework resolution works based on sector + jurisdiction
- [ ] Review/confirmation stage displays all collected answers
- [ ] Provisioning triggers from approved session

### 1.6 Backend Tests

- [ ] Onboarding module tests pass
- [ ] No critical test failures in core platform services

---

## 2. Minimum Viable Handover Items

All documents must be present and reviewed before sign-off.

| # | Document | File | Status |
|---|----------|------|--------|
| REF-01 | Migration Audit Report | `DOS-AIO-Specs/REF-01-migration-audit.md` | - [ ] Present and reviewed |
| REF-02 | Provisioning Evidence | `DOS-AIO-Specs/REF-02-first-tenant-provisioning.md` | - [ ] Present and reviewed (live proof: PENDING) |
| REF-03 | Onboarding Flow | `DOS-AIO-Specs/REF-03-onboarding-flow.md` | - [ ] Present and reviewed |
| REF-04 | Roles and Responsibility Matrix | `DOS-AIO-Specs/REF-04-roles-responsibility-matrix.md` | - [ ] Present and reviewed |
| REF-05 | Seed Data Catalog | `DOS-AIO-Specs/REF-05-seed-data-catalog.md` | - [ ] Present and reviewed |
| REF-06 | Handover Checklist | `DOS-AIO-Specs/REF-06-handover-checklist.md` | - [ ] Present and reviewed |
| REF-07 | Runtime Operations Runbook | `DOS-AIO-Specs/REF-07-runtime-operations-runbook.md` | - [ ] Present and reviewed |

---

## 3. Post-Handover Validation

These queries and checks should be executed by the receiving team within 24 hours of handover.

### 3.1 SQL Verification Queries

```sql
-- 1. Verify public schema table count
SELECT COUNT(*) AS public_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: >= 244 (239 pre-session-9 + 5 new from bootstrap/config work)

-- 2. Verify tenant exists and is active
SELECT tenant_id, org_name, status, created_at
FROM public.tenants
WHERE status = 'active';

-- 3. Verify provisioning completeness
SELECT
  pj.tenant_id,
  pj.status AS job_status,
  COUNT(*) FILTER (WHERE ps.status = 'completed') AS completed_steps,
  COUNT(*) FILTER (WHERE ps.status = 'failed') AS failed_steps,
  COUNT(*) AS total_steps
FROM public.provisioning_jobs pj
LEFT JOIN public.provisioning_steps ps ON ps.job_id = pj.id
GROUP BY pj.tenant_id, pj.status;
-- Expected: 53 completed, 0 failed

-- 4. Verify seed data presence
SELECT 'config_definitions' AS tbl, COUNT(*) FROM public.config_definitions
UNION ALL SELECT 'regulatory_frameworks', COUNT(*) FROM public.regulatory_frameworks
UNION ALL SELECT 'platform_products', COUNT(*) FROM public.platform_products
UNION ALL SELECT 'onboarding_questions', COUNT(*) FROM public.onboarding_questions;

-- 5. Verify DAuth roles seeded in tenant schema
SELECT COUNT(*) AS role_count FROM "{tenant_schema}".roles;
-- Expected: > 0

-- 6. Verify module security seeded
SELECT COUNT(*) AS permission_count FROM "{tenant_schema}".permissions;
-- Expected: > 0
```

### 3.2 Tenant Health Check Script

```bash
#!/bin/bash
# Post-handover tenant health check
BASE_URL="${1:-http://localhost:3000}"

echo "=== Platform Health ==="
curl -s "$BASE_URL/api/health" | jq .

echo ""
echo "=== Readiness Probe ==="
curl -s "$BASE_URL/api/health/ready" | jq .

echo ""
echo "=== Liveness Probe ==="
curl -s "$BASE_URL/api/health/live" | jq .

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Memory Trend ==="
curl -s "$BASE_URL/api/health/memory-trend" | jq .
```

### 3.3 Smoke Test Checklist

- [ ] Login as provisioned tenant admin
- [ ] Navigate to each enabled module hub
- [ ] Verify dashboard renders with seeded widgets
- [ ] Verify framework list matches onboarding selection
- [ ] Create one test record in any module
- [ ] Verify audit trail records the creation

---

## 4. Sign-Off Template

```
HANDOVER SIGN-OFF

Platform:       Dogan-AI-OS (DOS) / Shahin-AI AGRC
Environment:    [POC / Pilot / Production]
Date:           ____________________
Tenant ID:      ____________________
Tenant Name:    ____________________

PRE-HANDOVER GATES:
  Database & Schema:      [ ] PASS  [ ] FAIL
  Tenant Provisioning:    [ ] PASS  [ ] FAIL
  Runtime Infrastructure: [ ] PASS  [ ] FAIL
  Authentication Flow:    [ ] PASS  [ ] FAIL
  Onboarding Flow:        [ ] PASS  [ ] FAIL
  Backend Tests:          [ ] PASS  [ ] FAIL

DOCUMENTS DELIVERED:
  REF-01 through REF-07:  [ ] All present  [ ] Missing: ________

POST-HANDOVER VALIDATION:
  SQL Verification:       [ ] PASS  [ ] FAIL
  Tenant Health Check:    [ ] PASS  [ ] FAIL
  Smoke Tests:            [ ] PASS  [ ] FAIL

SIGN-OFF:

  Delivering Team:
    Name: ____________________
    Role: ____________________
    Date: ____________________
    Signature: ________________

  Receiving Team:
    Name: ____________________
    Role: ____________________
    Date: ____________________
    Signature: ________________

NOTES / EXCEPTIONS:
  ________________________________________________
  ________________________________________________
```

---

*End of REF-06*
