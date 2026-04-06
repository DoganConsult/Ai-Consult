# Platform Hardening & Enhancement Roadmap

**Status:** Initial PASS achieved (100% module integration)
**Date:** 2026-04-04
**Next Review:** After Phase 7 completion

---

## How We Prove It

### Automated Verification (runs in CI)

| Tool | Location | What It Proves | When to Run |
|------|----------|---------------|-------------|
| **Integration Proof Test** | `tests/platform-core/platform/integration-proof/platform-integration-proof.test.ts` | All 47 modules × 8 criteria = 376 checkpoints pass | Every PR, every build |
| **Drift Detector** | `tools/drift-checks/module-integration-drift.ts` | No new missing artifacts, no file cap violations, no empty stubs, no ownership violations | Every PR |
| **CI Release Gate** | `tools/drift-checks/ci-release-gate.ts` | No forbidden names, no hardcoded ROLE_PERMISSIONS, no platform→product imports, migration numbering valid | Pre-merge, pre-deploy |

### CI Pipeline Integration

Add to `.github/workflows/ci.yml` or equivalent:

```yaml
- name: Integration Proof
  run: cd backend && npx vitest run src/tests/platform-core/platform/integration-proof/

- name: Drift Detection
  run: npx ts-node tools/drift-checks/module-integration-drift.ts

- name: Release Gate
  run: npx ts-node tools/drift-checks/ci-release-gate.ts
```

### Evidence Artifacts

| Evidence | Source | Retention |
|----------|--------|-----------|
| Integration score per build | Drift detector stdout | CI logs |
| Gate pass/fail per PR | Release gate stdout | CI logs |
| Module scorecard | Integration proof test results | Test reports |
| Migration count | Release gate | CI logs |

---

## How We Protect It

### Layer 1: Prevent New Gaps (CI Gates)

| Gate | Blocks Merge If | Implementation |
|------|----------------|----------------|
| Module completeness | New module missing any of 8 artifacts | integration-proof.test.ts |
| Forbidden names | Banned class names detected | ci-release-gate.ts |
| Ownership boundary | Platform imports from product | ci-release-gate.ts |
| Hardcoded permissions | New `ROLE_PERMISSIONS` constant | ci-release-gate.ts |
| File cap | Directory exceeds 15 files | module-integration-drift.ts |
| Empty stubs | `export {}` barrel files | module-integration-drift.ts |

### Layer 2: Detect Drift Over Time (Scheduled Checks)

| Check | Frequency | Tool |
|-------|-----------|------|
| Full drift scan | Daily (cron) | `module-integration-drift.ts` |
| DB schema vs code parity | Weekly | Existing `per-module-checklist.test.ts` |
| Auth system bridge diagnostics | Weekly | `auth-system-bridge.service.ts → getAuthSystemDiagnostics()` |
| Feature flag coverage | Per release | `feature-flag.service.ts → getAllFeatureFlags()` |

### Layer 3: Architectural Guardrails (Code Review Rules)

| Rule | Enforcement |
|------|-------------|
| New module must have all 8 artifacts | `integration-proof.test.ts` fails if missing |
| No new hardcoded status literals | Reviewer + future lint rule |
| No new hardcoded SLA constants | Reviewer + future lint rule |
| All routes use `requirePermission()` | Existing route-guard tests |
| All lifecycle transitions go through DAuth | `evaluateLifecycleTransition()` call required |
| No direct DB role queries outside DAuth | `role-permission-lookup.service.ts` is canonical |

---

## How We Enhance It

### Phase 7: Auth Consolidation (High Priority)

**Goal:** Eliminate dual auth system (migration 030 vs 163)

| Step | Action | Risk |
|------|--------|------|
| 7.1 | Run `getAuthSystemDiagnostics()` per tenant to measure dual_active count | None (read-only) |
| 7.2 | Migrate all `user_role_assignments` (030) → `enterprise_user_role_assignments` (163) | Medium — needs per-tenant migration script |
| 7.3 | Migrate all `role_function_permissions` (030) → `role_permissions` (163) | Medium — permission code mapping |
| 7.4 | Update `seed-rbac-data.ts` to seed only into 163 tables | Low |
| 7.5 | Remove 030 tables (soft-delete first, hard-delete after 2 release cycles) | High — must verify no direct queries remain |
| 7.6 | Remove `auth-system-bridge.service.ts` (no longer needed) | Low |
| 7.7 | Delete deprecated `/api/me/bootstrap` (sunset Sep 30, 2026) | Low |

### Phase 8: Full DB-Driven Business Logic (Medium Priority)

**Goal:** Replace all hardcoded constants with DB lookups

| Step | What | Service to Use | Files Affected |
|------|------|---------------|----------------|
| 8.1 | Replace status literals in WHERE clauses | `isValidStatus()` from `lifecycle-definitions.service.ts` | 50+ service files |
| 8.2 | Replace SLA constants | `getSlaHours()` from `sla-defaults.service.ts` | 6 module constants files |
| 8.3 | Replace approval level arrays | DB-driven from `module_lifecycle_transitions.authority_gate` | 3 constants files |
| 8.4 | Replace retention period constants | New `module_retention_config` table | 3 job files |
| 8.5 | Replace file upload rules | New `module_file_rules` table | 6 constants files |

### Phase 9: Full DB-Driven UI (Medium Priority)

**Goal:** Navigation, KPIs, and widgets all from DB

| Step | What | Service to Use |
|------|------|---------------|
| 9.1 | Replace hardcoded `AGRC_NAV_ITEMS` | `getNavigationItems()` from `navigation-registry.service.ts` |
| 9.2 | Replace hardcoded `AGRC_ROLE_NAV_CONFIGS` | `getNavigationForPermissions()` with role-filtered query |
| 9.3 | Replace hardcoded `ALL_NAV_ITEMS` in playbook | Same navigation service |
| 9.4 | Replace hardcoded KPI definitions | New `product_kpis` table + service |
| 9.5 | Replace hardcoded widget definitions | `widget_registry` table (already exists, needs service) |
| 9.6 | Replace hardcoded feature flags | `isFeatureEnabled()` from `feature-flag.service.ts` |

### Phase 10: Observability & Monitoring (Lower Priority)

| Step | What |
|------|------|
| 10.1 | Add integration score metric to platform health endpoint |
| 10.2 | Add drift count metric (alert if > 0) |
| 10.3 | Add auth bridge diagnostics to admin dashboard |
| 10.4 | Add feature flag admin UI |
| 10.5 | Add navigation admin UI |
| 10.6 | Add SLA admin UI (per-tenant overrides) |

### Phase 11: Testing Hardening (Ongoing)

| Step | What |
|------|------|
| 11.1 | E2E test: role creation → permission assignment → route access → UI rendering |
| 11.2 | E2E test: lifecycle transition → DAuth check → workflow advance → audit log |
| 11.3 | E2E test: feature flag toggle → UI behavior change |
| 11.4 | E2E test: navigation registry change → sidebar update |
| 11.5 | Contract tests for all DB-driven services |
| 11.6 | PBT (property-based testing) for permission resolution |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-04 | Initial PASS declared at 100% integration | All 47 modules have 8/8 artifacts |
| 2026-04-04 | Auth bridge created (030↔163) | Unify dual systems without breaking existing code |
| 2026-04-04 | DB-driven services created for lifecycle, flags, nav, SLA | Law 3: data-driven, not hardcoded |
| 2026-04-04 | Drift detector + CI gates created | Automated protection against regression |
| TBD | Phase 7 auth consolidation start | After current release stabilizes |
| TBD | Phase 8 DB-driven constants migration | After Phase 7 completes |

---

## Success Metrics

| Metric | Current | Phase 7 Target | Phase 9 Target |
|--------|---------|----------------|----------------|
| Integration score | 100% (376/376) | 100% maintained | 100% maintained |
| Hardcoded ROLE_PERMISSIONS | 0 new (migrated) | 0 total | 0 total |
| Hardcoded status literals | ~50 (legacy) | ~25 (halved) | 0 |
| Hardcoded SLA values | ~15 (legacy) | ~8 (halved) | 0 |
| Auth system | dual_active | enterprise_primary | enterprise_only |
| Drift issues on main | 0 critical | 0 critical + 0 high | 0 total |
| CI gate pass rate | baseline | 100% | 100% |
