# Platform Enrichment Plan — What the DOS Platform Should Offer to Products and End Users

> Grounded in a deep read of the actual `platform-package` codebase.
> References real files and services; does not invent capabilities.
> Status: **Draft v0.1** — supersedes ad-hoc integration docs as the umbrella
> roadmap. The connector work in `PLATFORM-MS-INTEGRATIONS.md` and
> `PLATFORM-COLLAB-CONNECTORS.md` is **Pillar 2** inside this plan.

---

## 0. Context (what exists today, by code)

The platform is already substantial. Evidence from the tree:

- **DOS core exports** — `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dos/index.ts:1-546` publishes a single canonical surface covering provisioning, events (bus, DLQ, tracing, subscriptions), lifecycle, modules (entitlement, dependency, health, definition), products (entitlement, registry, composition), observability (logger, health, metrics, telemetry), foundation (org hierarchy, team builder, responsibility suggest), tenancy (tenant, status, boundary, config), workspace (state, provisioning, profile runtime), shell, settings, feature flags, contracts catalog, agents, lifecycle checkpoints/transitions.
- **DAuth** — full identity stack in `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dauth/` with `identity/`, `access/`, `sod/`, `mfa/`, `delegation/`, `session/`, `scope/`, `authority/`, `lifecycle-auth/`, `middleware/`, `policies/`.
- **Admin low-code surface** — `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dos/admin/lowcode/` ships `schema-designer.routes.ts`, `dynamic-endpoints.routes.ts`, `page-catalog.routes.ts`, `plugins.routes.ts`, `approvals.routes.ts`, `workflows.routes.ts`, `ai-agent-graphs.routes.ts`.
- **Integrations base** — `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dos/integrations/` has skeletons for `admin/`, `contracts/`, `credentials/`, `diagnostics/`, `events/`, `health/`, `inbound/`, `mapping/`, `outbound/`, `quarantine/`, `registry/`, `retries/`, `sync/`, plus a working `webhook.service.ts`.
- **Connectors (thin today)** — only two files in `@/root/Ai-Consult-Microservices/platform-package/backend/src/connectors/`: `slack-adapter.ts`, `teams-adapter.ts` (webhook-only).
- **Notifications** — `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dos/notifications/` has `email.service.ts` (22 KB), `webhooks/`, `nudge/` — but no multi-channel router.
- **AI Gateway** — `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dos/ai-gateway/` is small (`gateway.service.ts` ~4 KB, `graph-store.service.ts`, `vector-store.service.ts`, `ml-bridge.service.ts`).
- **Agents platform** — mature: `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dos/agents/` includes registry, tasks, tools, memory, context, policies, approvals, output validator, health, events, diagnostics, admin, scheduling, handoff, lifecycle, runtime — all exported in `dos/index.ts:481-521`.
- **Workflows engine** — `@/root/Ai-Consult-Microservices/platform-package/backend/src/platform/dos/workflows/` has `engine/`, `orchestration/`, `approvals/`, `actions/`, `events/`, `lifecycle/`, `modes/`, `integration/`, `contracts/`.
- **Evidence-connector schemas** (persistence-ready, no adapters) — `@/root/Ai-Consult-Microservices/platform-package/backend/src/config/db/schemas/evidence-connectors.ts:1-460` defines SIEM, CMDB, IAM, ITSM, **M365**, and Vuln-Scanner connection/event/sync tables per tenant.
- **Platform module** — the feature-rich modules live in `@/root/Ai-Consult-Microservices/platform-package/backend/src/modules/platform/` (527 items), with `services/` (193 items), `routes/` (155 items), `jobs/` (69 items), and a `platform-decomposition.manifest.ts` (~23 KB).
- **Products registered today** — only scaffolds: `@/root/Ai-Consult-Microservices/platform-package/backend/src/products/` holds `dogan-consult/`, `erp/`, `sbg/`; per `@/root/Ai-Consult-Microservices/platform-package/docs/ARCHITECTURE.md:33-35` the platform is product-neutral.
- **Charter** — quality rules in `@/root/Ai-Consult-Microservices/PLATFORM-CHARTER.md:59-74` lock no-mocks/no-stubs, 500-LOC file cap, AGPL/BSL/SSPL-free, product-neutral core.

### 0.1 The real gap

The platform has deep, canonical **primitives**; what is missing is a
curated set of **product-consumable services** ("Platform-as-a-Service"
offerings) with stable contracts, client SDKs, Admin UI surfaces, and
docs. Products today must know too much about internals; end users see
platform primitives instead of product-level value.

---

## 1. Objective

Elevate the platform from "library of primitives" to a **"Product
Platform"** that offers 12 explicit services ("Pillars") to every product,
each with:

1. A stable **contract** registered in `platform/contracts/contract-catalog.service` and `platform/contracts/contract-registry.ts`.
2. A **client SDK** (TypeScript) that products import — no direct access
   to platform internals.
3. A **REST surface** under `/api/v1/platform/<pillar>/*` — product routes
   never touch platform tables directly.
4. An **Admin UI page** under `frontend/src/app/pages/` for tenant-admin
   configuration.
5. **Quotas + metering** emitted through the existing
   `tenant_quota_config` + `agrc-metrics.service.ts` pipeline.
6. **DAuth-scoped permissions** (`platform.<pillar>.read|write|admin`).
7. **Full audit + event-trace** via `events/event-bus.ts` +
   `events/event-tracing.service.ts`.

---

## 2. The 12 Pillars of Platform-as-a-Service

### Pillar 1 — Identity, Access & Entitlement (ready, needs consumable SDK)

**Today:** Full DAuth stack (`platform/dauth/**`), product/module
entitlement (`dos/products/product-entitlement.service.ts`,
`dos/modules/module-entitlement.service.ts`), composition
(`product-composition.service.ts`), ABAC/SoD/MFA/delegation.

**Enrichment:**
- Ship `@dogan/platform-client-identity` SDK exposing `requireScope`,
  `currentActor`, `isEntitled(productCode, moduleCode, action)`,
  `onBehalfOf()` delegation, `sodCheck(operation)`.
- Surface **one** page: `pages/admin/access` (roles, scopes, delegations,
  SoD rules, MFA posture) — already partly there in `modules/platform/routes/role-*.ts`.
- Add **JIT access** workflow (time-boxed role grants) on top of existing
  `delegation/` service — product-requestable via SDK.

### Pillar 2 — Integration Hub / Connector Marketplace

**Today:** Schemas exist (`evidence-connectors.ts`), integrations skeleton
exists (`dos/integrations/**`), only `slack-adapter.ts` and
`teams-adapter.ts` are wired.

**Enrichment:** Generalized connector framework per
`PLATFORM-COLLAB-CONNECTORS.md` (Microsoft, Google, Zoom, LinkedIn,
Slack, + existing SIEM/CMDB/IAM/ITSM/Vuln schemas). Products call a
uniform `platformConnector.invoke(code, op, payload)` and get
cross-vendor normalization. The `frontend/src/app/pages/integrations/`
page becomes the Marketplace — one enable-toggle per connector.

### Pillar 3 — Event Bus, Webhooks & Outbox (ready, needs public SDK)

**Today:** `dos/events/event-bus.ts` (44 KB), DLQ, tracing, subscription
registry, `websocket.service.ts`, `event-catalog.ts`; charter locks
NATS JetStream as the outbox transport.

**Enrichment:**
- `@dogan/platform-client-events` SDK: `publish(eventType, payload)`,
  `subscribe(eventType, handler, retryPolicy)`, `replay(correlationId)`.
- **Outbound customer webhooks**: today only `webhook.service.ts` handles
  inbound. Add `dos/events/outbound-webhook-delivery.service.ts` with
  signed HMAC, retries, DLQ, per-tenant allow-list URLs — products emit
  an event, customers receive it on their own HTTP endpoint.
- **WebSocket channels for end users**: extend `websocket.service.ts`
  with product-scoped channels (`product.consult.user.<userId>`) so UIs
  get live updates without polling.

### Pillar 4 — Workflow & Approvals Engine (ready, needs product DSL)

**Today:** Full engine in `dos/workflows/` (engine, orchestration,
approvals, lifecycle, modes, integration, actions), and the low-code
`admin/lowcode/workflows.routes.ts` + `approvals.routes.ts`.

**Enrichment:**
- `@dogan/platform-client-workflow` SDK: `startWorkflow(defId, input)`,
  `completeTask`, `requestApproval(policy)`.
- Product-authored **workflow definitions as code** with a validator that
  reuses `platform/contracts/contract-registry.ts`.
- Admin UI: "Workflow Catalog" page showing all running/defined workflows
  per tenant, pause/resume, reassign approvers (on top of the existing
  low-code workflows admin route).

### Pillar 5 — Lifecycle, State Machines & Checkpoints (ready, document it)

**Today:** `dos/lifecycle/lifecycle-engine.ts`, `lifecycle-checkpoint.service.ts`,
`lifecycle-transition-registry.service.ts`, `lifecycle-gate.middleware.ts`.

**Enrichment:**
- `@dogan/platform-client-lifecycle` SDK: declare a lifecycle in-code,
  get middleware for free, get checkpoint+restore for free.
- Already the right primitive — the gap is adoption. Ship reference
  impls on subscription, module, workspace, tenant.

### Pillar 6 — Agents & AI Gateway (mature agents, thin gateway)

**Today:** `dos/agents/**` is comprehensive (13 subservices exported in
`dos/index.ts:481-521`). `dos/ai-gateway/` is small. Provider code at
`modules/ai/services/gateway/providers/azure-openai.provider.ts`.

**Enrichment:**
- Promote `ai-gateway/` to a full Pillar: model routing (LiteLLM per
  charter §3), per-tenant model/deployment binding, prompt library +
  versioning (Langfuse per charter), RAG-as-a-service using
  `llamaindex.ts`, embeddings-as-a-service, guardrails (LLM Guard) for
  tenant-facing calls, per-tenant **cost attribution** emitting to
  `agrc-metrics.service.ts`.
- `@dogan/platform-client-ai` SDK: `ai.chat({ task, context, policy })`,
  `ai.embed(text)`, `ai.retrieve(query, corpus)`, `ai.runAgent(agentId, input)`.
- Admin UI: "AI Gateway" page — models, prompts, usage, cost, guardrails.

### Pillar 7 — Notifications Router (email exists, needs multichannel)

**Today:** `dos/notifications/email.service.ts` (22 KB) + Graph-backed
OAuth2 email in `modules/platform/services/email/email-oauth.service.ts`,
`notifications/webhooks/`, `notifications/nudge/`, plus the two legacy
chat adapters.

**Enrichment:**
- **Notification router** `dos/notifications/notification-router.service.ts`
  that, given an event class (e.g., `incident.high`, `approval.pending`),
  picks the channel (email / Teams / Slack / Google Chat / SMS / WebSocket)
  by tenant policy and user preference.
- **User preferences API**: quiet hours, channel-by-event-class, digest.
- Template registry with i18n (hooks to `backend/src/i18n/`).
- `@dogan/platform-client-notify` SDK: `notify(audience, eventClass, payload)`.

### Pillar 8 — Data Platform: Storage, Search, Vector, Graph

**Today:** `dos/storage/` is 1 file, `dos/search/` 6 items,
`ai-gateway/vector-store.service.ts`, `ai-gateway/graph-store.service.ts`.
Charter locks pgvector + pgvectorscale + AGE + MinIO.

**Enrichment (one consolidated Pillar):**
- **Object storage service**: presigned upload/download URLs, MIME
  validation, optional ClamAV scan, versioning, retention — product-
  callable via SDK, replaces ad-hoc uploads.
- **Unified search** service — hybrid keyword (PG FTS) + vector
  (pgvector) + graph (AGE) behind one `searchService.query({ text,
  filters, kind })` API. Products don't choose the store; the platform
  does.
- **Index-as-a-service**: products declare an index manifest
  (`schema/index.manifest.ts`); platform creates and maintains.
- Admin UI: "Data Platform" page — storage quotas, index health, search
  analytics.

### Pillar 9 — Document Generation & E-signature

**Today:** `dos/services/document-generation/` (8 items) — skeleton.

**Enrichment:**
- Template registry (DOCX / HTML / PDF / XLSX), Handlebars + per-tenant
  theme hooks.
- PDF render farm (Puppeteer/Chromium pool) exposed via SDK
  `doc.render(templateCode, data, { format, watermark, sign })`.
- E-signature connector interface (DocuSign / Adobe Sign / local cert).
- Admin UI: "Document Templates" page — upload, preview, version.

### Pillar 10 — Billing, Metering & Entitlement

**Today:** `dos/services/billing/` (5 items), charter locks custom PG
ledger + OpenMeter.

**Enrichment:**
- **Metering ingest** — every pillar emits usage events; billing ledger
  aggregates to plan counters (API calls, AI tokens, storage GB,
  documents rendered, workflow executions).
- **Plan & entitlement** service that gates SDK calls: tenant over quota
  → 429 with structured body and upsell link.
- Invoice generator using Pillar 9 templates.
- Admin UI: "Billing" page — plan, usage, invoices, overage alerts.

### Pillar 11 — Observability for Products (platform already emits; expose to products)

**Today:** `dos/observability/**` (logger, metrics, Prometheus, health,
worker tracker, provisioning telemetry), charter locks Prometheus +
Alertmanager + OTel + Jaeger + VictoriaLogs.

**Enrichment:**
- `@dogan/platform-client-telemetry` SDK: `span(name, fn)`,
  `metric(name, value, tags)`, `log(level, msg, ctx)` — auto-tagged with
  tenant + product + user.
- **Tenant-facing observability dashboard** (not just platform-ops):
  "Your workspace health" page with top errors, latency, AI cost,
  workflow throughput. Surfaces existing metrics + OTel traces.

### Pillar 12 — Low-Code Studio (most underused asset)

**Today:** `dos/admin/lowcode/schema-designer.routes.ts`,
`dynamic-endpoints.routes.ts`, `plugins.routes.ts`, `page-catalog.routes.ts`,
`ai-agent-graphs.routes.ts`, `approvals.routes.ts`, `workflows.routes.ts`.
This is powerful; the product consumption path is undocumented.

**Enrichment:**
- "Studio" Admin UI that lets tenant admins compose custom:
  entities (schema-designer), endpoints (dynamic-endpoints), pages
  (page-catalog), plugins, agent graphs, approval chains, workflows —
  without platform code changes.
- Product consumption: a product can ship a "Studio pack" (bundle of
  schemas+endpoints+pages) as part of its manifest; platform installs at
  tenant activation.
- Publishing contract: every artifact created in Studio is versioned in
  `contract-catalog.service` and backed by an event stream.

---

## 3. Cross-Pillar Capabilities (must-haves)

1. **Client-SDK monorepo package**: `packages/platform-client/{identity,
   connectors, events, workflow, lifecycle, ai, notify, data, doc,
   billing, telemetry, studio}` — all under `pnpm-workspace.yaml`.
2. **Contract registry gating** — every pillar's public surface
   registered via `platform/contracts/contract-catalog.service.ts`;
   breaking changes blocked by
   `platform/contracts/registration-drift-validator.ts`.
3. **Ownership matrix enforcement** — reuse
   `platform/contracts/ownership-matrix.ts` so product/platform
   ownership per table is provably non-overlapping.
4. **Feature flags tied to Pillars** — each SDK call checks
   `modules/feature-flag.service.ts` so pillars can ship dark.
5. **Per-pillar DAuth scope families** — namespace
   `platform.<pillar>.<action>`; wire through
   `platform/dauth/scope/scope-registry`.
6. **Tenant quota config** — one `tenant_quota_config` row per pillar;
   reuse `getTenantQuotaConfig()` in `platform-infra.service.ts`.
7. **Charter compliance** — no file > 500 LOC, no placeholders, all
   public routes authn+authz+validated+tenant-scoped, license-clean
   (per `@/root/Ai-Consult-Microservices/PLATFORM-CHARTER.md:59-74`).

---

## 4. What End Users Get (concrete)

- **Integrations Marketplace** — a tenant admin clicks "Connect Microsoft
  Entra SSO" and the platform wires auth, SCIM, audit, quotas, and
  telemetry across every product they own.
- **One inbox, many channels** — an incident created in the Incident
  module pings the user via the channel they prefer (Teams / Gmail /
  WebSocket), honoring quiet hours and language.
- **Live workspace** — page updates without refresh (WebSocket),
  approvals land in Teams/Slack as adaptive cards, documents render on
  demand with tenant branding.
- **"My Studio"** — power users customize forms, endpoints, approval
  flows, pages, and AI agents — without a release cycle. Products ship
  defaults; tenants extend.
- **Usage & cost clarity** — the billing page shows AI tokens,
  documents, storage, API calls per product — end users understand what
  they pay for and can upgrade in place.
- **Observability for tenants** — "Your workspace is healthy" dashboard
  surfacing errors, slow workflows, failed connectors — so customers can
  self-diagnose.

---

## 5. Roadmap (6 milestones, grounded in existing code)

| Milestone | Contents | Anchor files |
|-----------|----------|--------------|
| **M1 — SDK foundation** | `packages/platform-client/*` scaffold; Identity + Events + Telemetry SDKs; contract-registry gating. | `dos/index.ts`, `platform/contracts/contract-catalog.service.ts` |
| **M2 — Integration Hub R1** | Generalized `integration_bindings` table, `oauth-token-manager`, Microsoft Graph + Entra SSO; Admin UI "Integrations" page. | `PLATFORM-MS-INTEGRATIONS.md`, `connectors/`, `dos/integrations/`, `frontend/src/app/pages/integrations/` |
| **M3 — Notifications Router + Outbound Webhooks** | Multi-channel router, user prefs, outbound customer webhooks; Notifications SDK. | `dos/notifications/email.service.ts`, `integrations/webhook.service.ts`, `events/event-bus.ts` |
| **M4 — AI Gateway uplift** | LiteLLM routing, prompt registry, RAG service, guardrails, cost metering; AI SDK + Admin UI. | `dos/ai-gateway/**`, `modules/ai/services/gateway/**` |
| **M5 — Data Platform + Doc Generation + Billing** | Object storage service, unified search, doc render + e-sign, metering→invoice pipeline. | `dos/storage/`, `dos/search/`, `dos/services/document-generation/`, `dos/services/billing/` |
| **M6 — Studio** | Public Studio UI wrapping `admin/lowcode/*` routes; product "Studio pack" installer. | `dos/admin/lowcode/**`, `contracts/contract-catalog.service.ts` |

Each milestone is a ~2-week slice that ships behind `PILLAR_*_ENABLED`
flags and is reversible per tenant.

---

## 6. Non-goals / explicit exclusions

- Rebuilding what already works (`dos/index.ts` surface stays the
  canonical import). Enrichment means **new pillars + SDKs + UIs**, not
  rewrites.
- Introducing a second ORM or a second event bus; charter §3 is locked.
- Product-specific logic inside platform core — all product functionality
  stays under `backend/src/products/<code>/` per
  `@/root/Ai-Consult-Microservices/platform-package/docs/PRODUCT_REGISTRATION.md` and
  `@/root/Ai-Consult-Microservices/platform-package/docs/domain_integration_wiring_guide.md`.

---

## 7. Open Questions (before M1 kickoff)

1. SDK distribution: internal Verdaccio only (charter §3), or public
   npm scope for partners?
2. Do we adopt Fastify (charter §3 Phase-2) now, or keep Express for the
   platform-package this quarter and migrate after M3?
3. Studio publishing: should Studio-authored artifacts be exportable as
   a product manifest (enabling customer-authored products)?
4. Tenant-facing observability dashboard: build on existing
   `dos/observability/prometheus.service.ts` data or use embedded Perses
   (charter §3)?
5. Billing: start with custom PG ledger only (charter v1), or integrate
   OpenMeter in M5?

---

## 8. Immediate next actions (one sprint)

1. Land `packages/platform-client/identity` + `events` + `telemetry`
   scaffolds (M1).
2. Rename `ms_app_registrations` / `ms_integration_bindings` drafts from
   `PLATFORM-MS-INTEGRATIONS.md` to the generalized
   `oauth_app_registrations` / `integration_bindings` from
   `PLATFORM-COLLAB-CONNECTORS.md` (M2 groundwork).
3. Add `dos/notifications/notification-router.service.ts` stub +
   contract registration (M3 groundwork).
4. Publish this plan at `@/root/Ai-Consult-Microservices/platform-package/docs/PLATFORM-ENRICHMENT-PLAN.md`
   and link it from `docs/ARCHITECTURE.md` and
   `docs/PRODUCT_REGISTRATION.md`.
