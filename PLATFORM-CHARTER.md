# Dogan AI OS — Platform Charter (locked decisions before completing the 4 pillars)

This file records the decisions agreed before we continue completing the four pillars (DAuth, DOS, DSOC, DNOC). It is the source of truth. Any change must come through a PR that updates this file in the same commit.

## 1. Positioning
- **Dogan AI OS = the platform plane.** It is **not sellable**. It is the substrate.
- Customers buy **Products** (e.g. `consult`, `sbg`, `lab`) and **Modules** (e.g. `consult.notes`, `consult.crm`).
- The OS itself is composed of exactly four pillars: **DAuth + DOS + DSOC + DNOC**.
- Branding is at the OS level; commercial offers are at the Product/Module level.

## 2. The four pillars (folder-separated)
```
src/
  DOS/        # Operating System: kernel, lifecycle, product loader, module registry, gateway core
  DAuth/      # Identity + Authorization: Keycloak verification, OpenFGA checks, JWT, claims
  DSOC/       # Security Operations: audit ingest, anomaly hooks, evidence trail
  DNOC/       # Network/Reliability Operations: readiness, metrics, health, capacity
  composer/   # Single composer process that mounts all four pillars into one Fastify app
```
Future-proof: every pillar is its own workspace package with its own Fastify plugin so it can be split into a dedicated service later without code changes.

## 3. Locked technology stack
| Layer | Locked choice |
|---|---|
| Runtime | Node 24 LTS, TypeScript strict |
| API | Fastify 5 + TypeBox + TypeSpec |
| DI | tsyringe |
| DB access | Kysely + node-postgres, raw SQL migrations (graphile-migrate-style, sha256-tracked) |
| Database | PostgreSQL 18 (master), pgvector, pgvectorscale, pgai, pgmq |
| Cache | Valkey 8 (Redis-compatible, BSD) |
| Object storage | MinIO (sidecar only, AGPL — never forked) |
| Identity | Keycloak (OIDC/SAML/LDAP) |
| Authorization | OpenFGA (relationship-based) |
| Workflows | Temporal |
| Jobs | Graphile Worker |
| LLM gateway | LiteLLM; local models via Ollama |
| RAG | LlamaIndex.TS |
| Prompts | Langfuse (export to git) |
| Guardrails | LLM Guard (tenant-facing AI only) |
| Gateway | Caddy 2 (Phase-2: Ory Oathkeeper) |
| Observability | Prometheus + Alertmanager + OTel + Jaeger + Perses + VictoriaLogs |
| Repo | pnpm workspace + Nx OSS + Changesets + Verdaccio |
| Frontend | Angular 21 + PrimeNG + Sakai-NG + Native Federation + Transloco + ngx-formly |
| Billing | Custom PG18 ledger (v1) + OpenMeter; Kill Bill later |
| Supply chain | Syft + Grype + Cosign + sops/age (OpenBao later) |
| Backup | pgBackRest + Barman, dual engine, restore drill mandatory |

## 4. Tenant isolation (locked)
- `platform.tenants.isolation_mode ∈ {shared_db, dedicated_db, dedicated_cluster}`.
- Default: `shared_db` with **schema-per-product + RLS-per-tenant**.
- Optional per-tenant: `dedicated_db` (same PG18 cluster, separate DB) or `dedicated_cluster`.
- DB roles:
  - `dogan_owner`: owns schemas/tables, no runtime traffic.
  - `dogan_app`: **NOSUPERUSER NOBYPASSRLS**, app traffic only.
  - Per-product roles granted only on their own schema.
- Every tenant-scoped query runs inside `withTenant()` which sets `app.tenant_id` and `app.user_id` via `SET LOCAL`.
- RLS on every tenant-scoped table is `ENABLE` + `FORCE`.

## 5. Quality gates (non-negotiable, enforced in CI + pre-commit)
1. **No file > 500 LOC** (`tools/quality/check.mjs` R1).
2. **No mocks, stubs, simulations, placeholders, dummies, TODO/FIXME/XXX/HACK, "not implemented", "coming soon", "WIP", "deferred", "temp/tempfix" in committed source under `src/`, `packages/`, `services/`, `products/`, `migrations/`** (R2).
3. **Only enterprise production-grade code**: build clean, typecheck clean, tests passing, migrations forward-only + sha256-tracked, every public route authn+authz+validated+tenant-scoped, no secrets in repo, every dependency license-reviewed (no AGPL/BSL/SSPL in core), every runtime has a healthcheck.
4. **No deferred work.** Either complete or do not merge.
5. **Honesty.** Never log success on failure; never return 200 on partial failure; never silently swallow errors.

Enforcement:
- `pnpm run quality` (R1+R2 scan)
- `pnpm -r run typecheck`
- `pnpm -r run build`
- `pnpm -r run test`
- `pnpm run verify` runs all of the above
- `tools/quality/pre-commit.sh` blocks bad commits locally
- `.github/workflows/ci.yml` blocks bad PRs in CI
- Rule file: `.zencoder/rules/quality.md` (alwaysApply)

## 6. What must be DONE in the platform before any new product is accepted
DOS:
- [x] Kernel build, config schema, telemetry, structured errors, RLS-safe DB wrapper, product loader from manifest, semver gate.
- [x] Composer process mounts all four pillars into one Fastify app.

DAuth:
- [x] JWT verifier (JWKS or dev secret), OpenFGA client wired, decorated on Fastify.
- [x] DAuth pillar: `requireRelation` preHandler, `recordEvent` (auth_events + dauth_risk_scores under SET LOCAL), routes `/pillars/dauth/{health,whoami,check,auth-events}`.
- [x] RiskEngine: rule.v1 baseline + LangChain/LiteLLM AI enrichment via kernel-built-in agents.
- [x] Migration `0002_dauth.sql` applied: `user_external_ids`, `auth_events` (append-only), `dauth_risk_scores`, `role_assignments` — all FORCE-RLS, tenant-scoped.
- [x] Consult notes hardened with `requireRelation('reader'|'writer','product:consult')`.
- [x] DAuth contract tests green (tampered token, empty tid, well-formed token).
- [x] Idempotent bootstrap scripts: `tools/dauth/bootstrap-keycloak.mjs`, `tools/dauth/bootstrap-openfga.mjs`; realm spec + FGA model checked in.
- [x] Keycloak 26.5 native (Java 21) on PG18 5432, systemd `keycloak.service`, realm `dogan` + client `dogan-kernel` + audience/tid/products/roles mappers provisioned, JWKS URL wired in `/etc/dogan-ai-os/kernel.env`.
- [x] OpenFGA store `dogan-ai-os` + authorization model created; `OPENFGA_STORE_ID` + `OPENFGA_MODEL_ID` wired in env.
- [x] Composer running under pm2 as `dogan-os`; `/platform`, `/kernel/ready`, `/kernel/capabilities`, all four `/pillars/*/health` return 200; unauthenticated `/pillars/dauth/whoami` returns 401.
- [x] PG14 legacy cluster dropped; PG18 master is the only PostgreSQL on the host (5432).
- [x] Migrations `0003_dauth_events_sessions.sql` (tier model, transactional outbox, sessions, api_keys v2), `0004_dauth_org.sql` (org_units/ltree, locations, positions, user_positions, user_attributes), `0005_dauth_abac_sod.sql` (abac_policies, sod_rules, sod_violations, static-grant trigger) applied. All tables FORCE RLS, tenant-scoped.
- [x] NATS JetStream 2.10.22 native + systemd; DOGAN account (JetStream enabled); `DOGAN_EVENTS` stream (`dogan.events.>`) + durable consumer `dogan-dauth-relay` bootstrapped by composer on boot.
- [x] `@dogan/events`: NatsRuntime (connect/stream/consumer/publish/subscribe) + Outbox relay (SKIP LOCKED, dedup via NATS msgId) + subject taxonomy `dogan.events.<tenantId>.<domain>.<eventType>`.
- [x] `@dogan/authz`: AbacEvaluator (whitelisted CEL subset via jsep, no function calls, no cross-root access) + SodEvaluator (static grant + dynamic runtime); 10 tests passing.
- [x] DAuth sub-routes split to stay under the 500 LOC quality cap: `provisioning.ts` (tenants/users/roles-grant/revoke), `sessions.ts`, `api-keys.ts` (mints `dga_` tokens, sha256 hash, ip_allowlist), `abac-routes.ts` (policies + check + sod rules + preflight), `kc-events.ts` (HMAC-verified Keycloak webhook bridge → auth_events + outbox).
- [x] Transactional outbox wired: every provisioning/session/api-key/abac route enqueues events inside the same tenant transaction; `Outbox.startRelay` ships to NATS with exponential retry + dead-letter after max attempts.
- [x] Quality scan green (no file >500 LOC, no forbidden tokens). Builds green for `@dogan/{events,authz,db,config,dauth,kernel,composer}`.

DSOC:
- [x] Audit hook on every mutating verb with tenant + user + reqId.
- [x] Audit sink to `platform.audit_log` (monthly-partitioned, tier-aware retention sweep, DSOC `AuditSink` + `AlertConsumer` live, migrations `0006_dsoc_audit_alerts.sql` + `0007_dsoc_security_definer.sql` applied).

DNOC:
- [x] `/kernel/ready` (7-component aggregator: postgres+nats+keycloak+openfga+temporal+redis+litellm), `/metrics` (full Prometheus text incl. `dogan_component_up` gauges), pillar `/health`.
- [x] Wire to Prometheus scrape + Alertmanager rules (`/etc/prometheus/prometheus.yml` job `dogan-ai-os` UP; `ops/prometheus/rules/dogan-platform.yml` shipped: `DoganComponentDown`, `DoganAuthFailureBurst`, `DoganSodBlocked`, `DoganRiskCritical`, `DoganOutboxBacklog`, `DoganOutboxDeadLetter`).

Cross-cutting:
- [x] `dogan_app` role created NOSUPERUSER NOBYPASSRLS.
- [x] Two-tenant RLS isolation probe passes (`packages/kernel-testkit`).
- [x] Per-user RLS hardening for `product_consult.notes`.
- [x] Quality rules + scanner committed and green.
- [x] Dual backup engines (pgBackRest + Barman) with successful restore drill.

## 7. Versioning
- Kernel SemVer + Product SemVer + Module SemVer; no monorepo-wide version.
- Manifest `kernel.requires` (semver range) gates product load.
- `tenant_products.release_channel ∈ {stable, canary, beta, pinned}`.

## 8. Branding rule
- Public surface and commercial branding sit on **Products** and **Modules**.
- The OS pillars (DAuth/DOS/DSOC/DNOC) are operator-facing identifiers, not customer SKUs.
- Every response carries `x-powered-by: Dogan AI OS` and `x-dogan-pillars: DAuth,DOS,DSOC,DNOC`.

---

**Locked.** Any change to this charter requires a charter-update PR.
