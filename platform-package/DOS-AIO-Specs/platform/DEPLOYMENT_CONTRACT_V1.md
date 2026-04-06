# DEPLOYMENT_CONTRACT_V1 — Master Deployment Contract for the DOS Platform

> **Version:** 1.0  
> **Date:** 2026-04-05  
> **Authority:** Global Platform Operating Constitution (GPOC-v1.0), AGENTS.md Patch 0  
> **Owner:** DOS Platform Team  
> **References:** `AGENTS.md` (Patch 0 Common Enforcement Standard), `DOS-AIO.md`, `platform/sdkdeployment-guideline.md`

---

## 1. Ownership Model

The DOS deployment model enforces a strict 3-layer ownership hierarchy. Each layer is independently deployable, independently removable (except Platform itself), and must not leak concerns into adjacent layers.

### Layer 1 — Platform (DOS + DAuth)

The foundational runtime. Provides identity, tenancy, RBAC, audit, workflow, AI runtime, billing, integrations, and the shared frontend shell. The platform operates with **zero product knowledge**. It exposes neutral hooks for product registration but never references a specific product by name in its core logic.

### Layer 2 — Product (Shahin-AI)

The first flagship product built on the platform. Shahin-AI registers itself via product manifest and hook contracts. The platform continues to function if Shahin-AI is removed entirely. No platform service, migration, seed, route, or UI component may import from or depend on Shahin-AI code paths.

### Layer 3 — Module (47 modules)

Each module is a removable vertical slice owned by a product. Modules register via module manifests and are activated through the product's module activation list. Removing a module must not break the parent product or any unrelated module.

**Governing laws (AGENTS.md Patch 0 Section 4):**

- Law 2 — One canonical owner per concern
- Law 5 — Generic lifecycle engine (modules use shared engine, not per-domain copies)
- Law 15 — Product removable principle

---

## 2. Platform Deployment Package

### 2.1 Runtime Services

| Concern | Owner |
|---|---|
| Identity and authentication | DAuth |
| Sessions, MFA, tokens | DAuth |
| Workspace and tenant management | DOS |
| RBAC (roles, permissions, access profiles) | DAuth |
| Audit logging | DAuth (authz audit) + DOS (platform audit) |
| File management | DOS |
| Workflow engine | DOS |
| Reports engine | DOS |
| AI runtime and provider gateway | DOS |
| Billing and subscriptions | DOS |
| Integration connectors | DOS |
| Admin surfaces | DOS |
| Shared shell, settings, notifications (frontend) | DOS |

### 2.2 DB Ownership (Platform Schema)

The platform schema owns these tables exclusively. No product or module may write DDL against them.

```
users, workspaces, workspace_members, roles, permissions,
audit_logs, notifications, files, workflows, tasks, reports,
ai_runs, subscriptions, integrations
```

### 2.3 Backend Unit

- Platform API routes only (`/api/platform/*`, `/api/auth/*`, `/api/admin/*`)
- Platform services (identity, tenant, RBAC, audit, files, workflow, reports, AI, billing, integrations)
- Platform registries (product registry, module registry, permission registry, event registry)
- Platform event bus (shared event infrastructure, platform-level event handlers)
- Platform health, metrics, and logging endpoints
- Platform config loaders (environment, deployment, tenant)
- Platform bootstrap orchestration (startup sequence, readiness gates)

### 2.4 Frontend Unit

- Shell (app chrome, navigation frame, layout system)
- Dashboard core (widget host, dashboard engine)
- Settings surfaces (tenant settings, workspace settings, user preferences)
- Files management UI
- Notifications center
- Admin panels (platform admin, tenant admin)
- Reports viewer

### 2.5 Config Pack

| Config Category | Contents |
|---|---|
| Environment | Runtime mode (development/staging/production), base URLs, region, logging level |
| Deployment | DB connection, storage provider, queue/cache provider, TLS config, offline/air-gapped flags |
| Tenant/Workspace | Tenant-specific overrides loaded at runtime |
| Product enablement | Neutral product hooks (enabled/disabled flags per product slug) |
| Feature toggles | Neutral feature flags (no product-specific semantics in platform config) |
| Secrets | Provider key references (vault paths or env var names, never plaintext) |
| Storage/Runtime | Object storage mode (local/S3/GCS/Azure), logging mode, runtime mode |
| Queue/Cache | Queue provider (Redis/SQS/RabbitMQ), cache provider (Redis/memory) |
| DB mode | Shared DB vs separate DB per tenant |

### 2.6 Deployment Actions (ordered)

```
1. Load environment profile
2. Load deployment profile
3. Migrate platform schema (run platform migrations)
4. Seed platform roles, permissions, and module registry
5. Start platform services
6. Register product hooks if enabled (neutral — do not assume Shahin exists)
7. Expose health and readiness endpoints
8. Expose admin and settings surfaces
9. NEVER assume Shahin-AI or any specific product exists
```

---

## 3. Product Deployment Package

Shahin-AI is the first flagship product. This section defines its deployment contract. All future products follow the same structure.

### 3.1 Runtime Contents

- Product manifest (`shahin-ai.product.manifest.ts`)
- Product defaults (default settings, thresholds, scoring weights)
- Product onboarding presets (step sequences, welcome flows, seed data)
- Product module activation list (which of the 47 modules this product enables)
- Product navigation registration (routes, menu items, breadcrumbs)
- Product branding (logo, color overrides, display name)
- Product AI seed registration (pre-trained prompts, agent catalogs, tool registrations)
- Product-specific workflows and reports
- Product domain feature flags

### 3.2 DB Ownership (Product Schema — separate from platform)

```
regulators, frameworks, controls, control_mappings, policies,
evidence_items, risks, risk_treatments, assessments, findings,
exceptions, qiyas_scores
```

These tables live in a product-owned schema. Platform migrations never touch them. Product migrations never touch platform tables.

### 3.3 Backend Unit

- `/api/shahin/*` namespace (all product routes under this prefix)
- Product registrars (register modules, routes, nav, AI seeds with platform registries)
- Product bootstrap hooks (called by platform after platform readiness)
- Product navigation and module registration logic
- Product-owned AI catalogs and seed providers
- Product-level jobs and scheduled reports

### 3.4 Frontend Unit

```
features/products/shahin/
  dashboard/
  governance/
  risk/
  compliance/
  evidence/
  policies/
  assessments/
  issues/
  exceptions/
  qiyas/
```

### 3.5 Config Pack

| Config | Description |
|---|---|
| Product enabled/disabled | Master toggle for the entire product |
| Enabled modules | List of module slugs activated for this product |
| Product defaults | Default scoring, thresholds, display settings |
| Product onboarding presets | Step definitions, seed data for new tenants |
| Product-specific workflows | Workflow templates owned by the product |
| Product AI/provider allowlists | Which AI providers and models this product permits |
| Product-level report packs | Report templates bundled with the product |

### 3.6 Deployment Actions (ordered)

```
1. Validate platform is present and healthy (readiness gate)
2. Load product manifest
3. Register product modules with platform module registry
4. Run product schema migrations (product schema only)
5. Seed product lookup and reference data (idempotent)
6. Register product routes, navigation, and reports with platform
7. Register product AI seed providers with platform AI registry
8. Activate product dashboards and widgets
9. Keep platform fully reusable if this product is removed
```

---

## 4. Module Deployment Package

Each module is a removable vertical slice. There are 47 modules across the product layer (see AGENTS.md Patch 0 and DOS-AIO.md for the full list and MP-01 through MP-16 for detailed specs).

### 4.1 Runtime Contents

| Component | Description |
|---|---|
| Module manifest | Slug, version, dependencies, permissions, lifecycle hooks |
| Backend routes/controllers | Module-specific API endpoints |
| Backend services | Module domain logic |
| Backend repositories | Module data access |
| Frontend pages/components | Module UI |
| Frontend routes/guards | Module routing and access control |
| Frontend i18n | Module translation keys |
| Domain entities/schemas/enums | Module data model |
| Module migrations and seeds | Module-owned DDL and seed data |
| Module permissions/policies/scopes | Module-specific access rules |
| Module events/workflows/jobs | Module event handlers, workflow definitions, background jobs |
| Module reports/widgets | Module dashboard widgets and report templates |
| Lifecycle hooks | `install`, `enable`, `disable`, `uninstall`, `bootstrap`, `cleanup` |
| Tests | Co-located `*.test.ts` files (AGENTS.md Section 14) |
| Docs | Module-level documentation |

### 4.2 Ownership Rules

A module:

- **Owns** its tables, services, routes, DTOs, UI pages, jobs, reports, and events
- **Does NOT** put logic into platform core services
- **Does NOT** modify platform or product schema
- **Does NOT** import from other modules without explicit cross-module dependency declaration in its manifest
- **Registers** with the platform through the module registry, never by direct injection

### 4.3 Deployment Actions (ordered)

```
1. Validate parent product is enabled (precondition)
2. Load module manifest
3. Apply module migrations (module-owned tables only)
4. Seed module permissions into platform permission registry
5. Seed module reference/lookup data (idempotent)
6. Register module API routes with platform router
7. Register module UI routes and navigation with platform shell
8. Register module events, workflows, and jobs with platform engines
9. Register module dashboards and widgets
10. Expose module health and readiness
11. Support disable/uninstall cleanup (reverse of steps 3-10)
```

### 4.4 Removal Test

Deleting a module must remove:

- Its API routes
- Its UI pages and navigation entries
- Its permissions from the registry
- Its jobs, events, and workflow definitions
- Its migrations and seed data

Deleting a module must **NOT** break:

- Platform core services
- Other modules
- The parent product's ability to function (degraded but operational)
- Platform health or readiness checks

---

## 5. Config Ownership Model

Configuration is split into 4 non-overlapping buckets. Each bucket has exactly one owner and one load-time.

### Bucket 1 — Environment

**Owner:** Infrastructure/DevOps  
**Load time:** Process start  
**Contents:** Runtime mode (development/staging/production), base URLs, region, logging level, node environment

### Bucket 2 — Deployment

**Owner:** Platform operator  
**Load time:** Process start  
**Contents:** DB mode (shared vs separate), storage provider (local/S3/GCS/Azure), queue provider (Redis/SQS/RabbitMQ), cache provider (Redis/memory), TLS configuration, offline/air-gapped mode flags

### Bucket 3 — Product

**Owner:** Product layer  
**Load time:** Product bootstrap  
**Contents:** Enabled products, enabled modules per product, product defaults, product onboarding presets, AI provider allowlists, product feature flags

### Bucket 4 — Tenant/Workspace

**Owner:** Tenant admin  
**Load time:** Request time (per-tenant resolution)  
**Contents:** Branding overrides, feature entitlements, module overrides, workspace-specific settings, tenant-level feature toggles

**Rule:** A higher-numbered bucket never overrides a lower-numbered bucket's structural decisions. Tenant config cannot change DB mode. Product config cannot change runtime environment. Overrides flow downward for behavioral settings only.

---

## 6. On-Prem Profile

See `deployment/on-prem-profile.md` for the complete on-premises deployment profile, including:

- Air-gapped mode configuration
- Local storage and queue providers
- Network isolation requirements
- Certificate management
- Offline AI provider configuration
- Backup and disaster recovery procedures

---

## 7. SaaS Profile

See `deployment/saas-profile.md` for the complete SaaS deployment profile, including:

- Multi-tenant database strategy
- Cloud provider configuration (AWS/GCP/Azure)
- Auto-scaling rules
- CDN and edge configuration
- Managed queue and cache services
- SLA and uptime commitments

---

## 8. SDK Contract Release Rules

See `deployment/sdk-contract.md` for the full SDK contract specification.

**Preconditions for SDK release:** The SDK may only be published after ALL of the following contracts are frozen:

1. **API contracts freeze** — All platform API routes, request/response shapes, and error codes are stable
2. **Auth model freeze** — DAuth token format, scope resolution, permission model, and delegation chains are stable
3. **Environment/base URL rules freeze** — URL structure, versioning scheme, and environment resolution are stable
4. **Tenant/product/module boundary contracts freeze** — Registry contracts, manifest schemas, lifecycle hook signatures, and event bus contracts are stable

No SDK release may occur if any of these contracts are in draft or under active revision.

---

## 9. Install / Enable / Disable / Uninstall Lifecycle

Every module follows a 4-state lifecycle. State transitions are managed by the platform's generic lifecycle engine (Law 5).

```
 ┌───────────┐     ┌─────────┐     ┌──────────┐     ┌─────────────┐
 │ Installed │────>│ Enabled │────>│ Disabled │────>│ Uninstalled │
 └───────────┘     └─────────┘     └──────────┘     └─────────────┘
       │                                                    ^
       └────────────────────────────────────────────────────┘
```

### Installed

- Migrations applied, seeds run, permissions registered
- Module is **not** active — routes are not exposed, jobs are not scheduled
- **Precondition:** Parent product is enabled, module manifest is valid, no conflicting module version exists

### Enabled

- Routes exposed, jobs scheduled, events subscribed, UI navigation visible
- **Precondition:** Module is in `installed` state, all declared dependencies are in `enabled` state, module health check passes

### Disabled

- Routes removed from active router, jobs paused, events unsubscribed, UI navigation hidden
- Data and migrations are **preserved** (not rolled back)
- **Precondition:** No other enabled module declares a hard dependency on this module

### Uninstalled

- Module migrations rolled back, permissions removed, seeds cleaned up
- All module data is deleted (with confirmation)
- **Precondition:** Module is in `disabled` state, data deletion confirmed by admin

---

## 10. Migration / Seed Rules

### Execution Order

```
Forward:   Platform migrations → Product migrations → Module migrations
Rollback:  Module migrations → Product migrations → Platform migrations
```

### Rules

1. Each migration file is owned by exactly one layer (platform, product, or module). Ownership is encoded in the file path.
2. Platform migrations live in `backend/migrations/master/` and `backend/migrations/tenant/`
3. Product migrations live in `backend/migrations/products/<product-slug>/`
4. Module migrations live in `backend/migrations/modules/<module-slug>/`
5. Seeds are idempotent — running a seed twice produces the same result as running it once.
6. Seeds use `INSERT ... ON CONFLICT DO NOTHING` or equivalent upsert patterns.
7. No migration may reference tables owned by a different layer.
8. Migration files are numbered sequentially within their layer and never renumbered.
9. Rollback scripts must exist for every forward migration and must be tested.

---

## 11. Readiness Gates

Deployment proceeds through a chain of readiness gates. Each gate must pass before the next layer begins registration.

### Gate 1 — Platform Readiness

- Database connection verified
- Platform schema migrations complete
- Platform seeds applied
- Core services started (identity, tenant, RBAC, audit, event bus)
- Health endpoint returns 200
- **Blocks:** Product registration

### Gate 2 — Product Readiness

- Product manifest loaded and validated
- Product schema migrations complete
- Product seeds applied
- Product routes registered
- Product health check returns 200
- **Blocks:** Module activation

### Gate 3 — Module Readiness

- Module manifest loaded and validated
- Module migrations complete
- Module permissions seeded
- Module health check returns 200
- **Blocks:** Route exposure for this module

**Failure behavior (Law 11 — Deny by default):** If any gate fails, the system does not proceed to the next layer. A failed product gate does not block other products. A failed module gate does not block other modules. Platform gate failure blocks everything.

---

## 12. Removal Guarantees

### Platform Removal

**Not possible.** The platform IS the core. Removing it removes the entire system.

### Product Removal

Removing a product (e.g., Shahin-AI) executes the following:

1. Disable all modules owned by the product
2. Uninstall all modules owned by the product (reverse order)
3. Remove product routes from platform router
4. Remove product navigation entries from platform shell
5. Remove product permissions from platform registry
6. Remove product AI seeds from platform AI registry
7. Roll back product schema migrations
8. Remove product config entries

**Guarantee:** Platform continues to operate. Other products (if any) are unaffected. Platform health checks continue to pass. Admin surfaces remain accessible.

### Module Removal

Removing a module executes the following:

1. Disable the module (remove routes, pause jobs, unsubscribe events, hide navigation)
2. Roll back module migrations
3. Remove module permissions from registry
4. Remove module workflow definitions
5. Remove module event subscriptions
6. Remove module dashboard widgets
7. Clean up module seed data

**Guarantee:** The parent product continues to operate (degraded for the removed module's functionality). The platform is unaffected. Other modules are unaffected. No dangling foreign keys, no orphaned routes, no ghost navigation entries.

---

## Appendix A — Cross-References

| Document | Location | Relevance |
|---|---|---|
| AGENTS.md | Repository root | Patch 0 enforcement standard, all 15 laws, ownership model |
| DOS-AIO.md | `DOS-AIO-Specs/DOS-AIO.md` | Full platform architecture spec |
| GPOC-v1.0 | `docs/governance/Global-Platform-Operating-Constitution.md` | Constitutional authority |
| SDK Deployment Guideline | `DOS-AIO-Specs/platform/sdkdeployment-guideline.md` | Deployment guideline source |
| On-Prem Profile | `deployment/on-prem-profile.md` | On-premises deployment details |
| SaaS Profile | `deployment/saas-profile.md` | SaaS deployment details |
| SDK Contract | `deployment/sdk-contract.md` | SDK release rules |
| Table Ownership Registry | `DOS-AIO-Specs/platform/table-ownership-registry.md` | Canonical table ownership |
