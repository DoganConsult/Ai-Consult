# Platform — Microsoft Integrations Design

> Design spec for adding Microsoft (Entra ID, Microsoft 365 / Graph, Azure,
> Power Platform, Defender/Purview/Intune/Sentinel) connectors to the DOS
> Platform layer. This is the source of truth that precedes any code PRs.
>
> Status: **Draft v0.1** — to be ratified by platform owners before
> implementation.

---

## 1. Goals & Non-Goals

### 1.1 Goals

1. Deliver a cohesive, tenant-scoped **Microsoft Integrations** surface in
   the Admin UI (`frontend/src/app/pages/integrations/`) that lights up real
   value in every product (AGRC, Incident, Controls, Reporting, Analytics, AI
   Gateway).
2. Add a single **MS Graph adapter** in `backend/src/connectors/` that
   supersedes the current webhook-only `teams-adapter.ts` and reuses the
   already-working Graph OAuth2 client-credentials code in
   `modules/platform/services/email/email-oauth.service.ts`.
3. Formalize **Entra ID (Azure AD)** as a first-class identity provider in
   DAuth (`platform/dauth/identity/`), supporting OIDC SSO + SCIM provisioning
   + Conditional Access signal passthrough.
4. Use the existing `m365_connections` / `m365_evidence_items` tables in
   `config/db/schemas/evidence-connectors.ts` as the persistence backbone for
   M365 evidence; introduce sibling tables only where current schema is
   insufficient (Defender, Purview, Intune, Sentinel).
5. Store all Microsoft credentials in **Azure Key Vault** via the existing
   `config/auth/keyvault.ts` wrapper — never in plain env vars, never in DB
   columns (DB stores only Key Vault secret names + non-secret metadata).
6. Every enable/disable, token refresh, sync run, and config change emits a
   DAuth audit event.

### 1.2 Non-Goals

- Replacing SMTP email overnight — OAuth2 Graph email already exists; this
  doc only re-homes its config under the new Integrations UX.
- Building customer-facing Teams/Outlook apps (bot, add-in). Those are
  follow-on product work; this spec only builds the platform plumbing they
  will consume.
- Multi-cloud parity (AWS/GCP) — separate spec.

---

## 2. Scope Matrix (what gets added, in priority order)

| # | Capability | Graph / API surface | Products that benefit | Effort |
|---|------------|---------------------|-----------------------|--------|
| 1 | Entra ID SSO (OIDC) | `login.microsoftonline.com/{tid}/v2.0` | All (auth) | S |
| 2 | Entra ID SCIM provisioning | `/scim/v2/*` (inbound to platform) | All (user mgmt) | M |
| 3 | MS Graph unified adapter | `graph.microsoft.com/v1.0` | All | S |
| 4 | Teams (Graph channels + adaptive cards) | `/teams/{id}/channels/{id}/messages` | Incident, AGRC, Controls | S |
| 5 | Outlook send (replaces SMTP where enabled) | `/users/{id}/sendMail` | Notification, AGRC | S (exists) |
| 6 | SharePoint / OneDrive evidence pull | `/sites/{id}/drive/items`, `/drives/{id}/root/children` | AGRC, Controls, Reporting | M |
| 7 | Outlook Calendar (audit / review scheduling) | `/users/{id}/calendar/events` | AGRC, Controls | S |
| 8 | Planner / To Do (remediation tasks) | `/planner/tasks`, `/me/todo/lists` | Incident, Controls | S |
| 9 | Azure Key Vault (formalize tenant binding) | `@azure/keyvault-secrets` (exists) | Platform | S |
| 10 | Azure Blob Storage backend for files | `@azure/storage-blob` | Platform (file-storage) | M |
| 11 | Azure OpenAI per-tenant deployment | already wired in `providers/azure-openai.provider.ts` | AI Gateway | S |
| 12 | Azure AI Search (RAG backend option) | `@azure/search-documents` | AI Gateway / RAG | M |
| 13 | Azure Monitor / App Insights log shipping | `@azure/monitor-opentelemetry` | Platform observability | M |
| 14 | Azure Service Bus / Event Grid outbound bus | `@azure/service-bus`, `@azure/eventgrid` | Platform events | M |
| 15 | Defender for Cloud alerts/recommendations | `/providers/Microsoft.Security/alerts` (ARM) | AGRC, Incident | M |
| 16 | Microsoft Purview (DLP, audit, classification) | Graph `/security/*`, Purview REST | AGRC | M |
| 17 | Microsoft Intune device compliance | Graph `/deviceManagement/*` | AGRC, Controls | M |
| 18 | Microsoft Sentinel incidents (two-way) | ARM `/providers/Microsoft.SecurityInsights/incidents` | Incident (MP-13) | L |
| 19 | Azure Policy / Resource Graph evidence | ARM Policy + Resource Graph | AGRC (tech controls) | M |
| 20 | Power Automate custom connector (OpenAPI) | publish our own REST → Power Platform | All (customer flows) | S |
| 21 | Power BI embedded dashboards | Power BI REST + embed token | Analytics (MP-12) | M |
| 22 | Teams Bot / Messaging Extension app | Bot Framework + Teams manifest | All (in-Teams UX) | L |

Tiers 1–9 form the **first release**. 10–14 form the **infra release**.
15–22 form the **security/evidence release**.

---

## 3. Architecture

```
                    ┌─────────────────────────────────────────────────┐
Admin UI            │ pages/integrations/microsoft/*  (Angular/PrimeNG)│
(Angular)           └──────────────┬──────────────────────────────────┘
                                   │  REST (/api/v1/platform/integrations/ms/*)
                                   ▼
                    ┌─────────────────────────────────────────────────┐
Backend             │ modules/platform/services/integrations/microsoft│
(Express/TS)        │   ├─ ms-integrations.controller.ts              │
                    │   ├─ ms-integrations.service.ts (registry)      │
                    │   └─ ms-oauth.service.ts (app-reg mgmt)         │
                    └──────────────┬──────────────────────────────────┘
                                   │
                 ┌─────────────────┼────────────────────────────────┐
                 ▼                 ▼                                ▼
      connectors/ms-graph-  connectors/azure-*   platform/dauth/identity/
      adapter.ts            adapter.ts           entra-id.provider.ts
      (Graph v1.0)          (ARM/Key Vault/      (OIDC + SCIM)
                            Blob/AI Search)
                 │                 │                                │
                 ▼                 ▼                                ▼
          MS Graph API        Azure ARM /                 login.microsoftonline
          graph.microsoft.com Data plane SDKs             .com / SCIM endpoints
```

Key design rules:

- **One OAuth2 token cache per (tenant_id, connector_id, scope-set)**,
  reusing the `TokenManager` pattern from `email-oauth.service.ts`. Extract
  into `platform/dos/security/services/ms-token-manager.service.ts`.
- **All secrets** → Key Vault. DB rows reference Key Vault secret names
  (e.g., `secret_name: 'tenant-7f3…-entra-client-secret'`), never the secret
  itself. For on-prem without Key Vault, fall back to the existing
  encrypted-at-rest `credentials_encrypted` column (already in the schema).
- **Feature-flag every connector** behind `config-boundary.ts` entries:
  `MS_ENTRA_SSO_ENABLED`, `MS_GRAPH_ENABLED`, `MS_DEFENDER_ENABLED`, …
- **Per-tenant opt-in**: a tenant can enable any subset; global admins can
  mark any connector as "platform-forced" (charter/compliance).

---

## 4. Data Model

### 4.1 Reuse (no migration needed)

- `tenant_{id}.m365_connections` — extend `scopes` default + add optional
  columns (see §4.3) rather than new table.
- `tenant_{id}.m365_evidence_items` — already covers SharePoint / OneDrive /
  Teams / Compliance / Security sources.
- `tenant_{id}.iam_connections` / `iam_identities` — already supports
  `iam_type='azure_ad'` for Entra. Reuse.
- `tenant_{id}.siem_connections` — already supports `siem_type='sentinel'`.
  Reuse for Sentinel.
- `tenant_{id}.connector_configs` + `connector_executions` — generic log.

### 4.2 New tables (migration `0NN_ms_integrations.sql`)

```sql
-- Central per-tenant Microsoft app registration
CREATE TABLE "${schema}".ms_app_registrations (
  registration_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_azure_id     VARCHAR(100) NOT NULL,
  app_client_id       VARCHAR(100) NOT NULL,
  secret_name_kv      VARCHAR(255) NOT NULL,      -- Key Vault secret name
  redirect_uris       TEXT[] NOT NULL DEFAULT '{}',
  consented_scopes    TEXT[] NOT NULL DEFAULT '{}',
  auth_mode           VARCHAR(20) NOT NULL CHECK (auth_mode IN ('client_credentials','auth_code','on_behalf_of')),
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','revoked','error')),
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_azure_id, app_client_id)
);

-- One row per enabled connector, pointing at an app registration
CREATE TABLE "${schema}".ms_integration_bindings (
  binding_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id     UUID NOT NULL REFERENCES "${schema}".ms_app_registrations(registration_id) ON DELETE CASCADE,
  connector_code      VARCHAR(40) NOT NULL,       -- 'entra_sso','graph_outlook','graph_sharepoint',
                                                  -- 'defender','purview','intune','sentinel',
                                                  -- 'azure_blob','azure_ai_search', ...
  enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  config              JSONB NOT NULL DEFAULT '{}',-- connector-specific (site IDs, subscription IDs, etc.)
  health_status       VARCHAR(20) NOT NULL DEFAULT 'unknown'
                      CHECK (health_status IN ('unknown','healthy','degraded','failed')),
  last_health_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (registration_id, connector_code)
);
CREATE INDEX idx_ms_bindings_connector ON "${schema}".ms_integration_bindings(connector_code, enabled);

-- Defender / Intune / Purview evidence staging (only if not absorbed by m365_evidence_items)
CREATE TABLE "${schema}".ms_security_findings (
  finding_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  binding_id          UUID NOT NULL REFERENCES "${schema}".ms_integration_bindings(binding_id) ON DELETE CASCADE,
  source              VARCHAR(30) NOT NULL CHECK (source IN ('defender','purview','intune','sentinel','azure_policy')),
  external_id         VARCHAR(255) NOT NULL,
  severity            VARCHAR(20) NOT NULL DEFAULT 'medium',
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  resource_id         VARCHAR(500),
  linked_control_ids  TEXT[] DEFAULT '{}',
  linked_incident_id  UUID,
  raw_data            JSONB DEFAULT '{}',
  status              VARCHAR(20) NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','linked','dismissed','false_positive','resolved')),
  first_detected_at   TIMESTAMPTZ DEFAULT NOW(),
  last_detected_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (binding_id, source, external_id)
);
CREATE INDEX idx_ms_sec_findings_source ON "${schema}".ms_security_findings(source, status, severity);
```

### 4.3 Column additions to existing `m365_connections`

```sql
ALTER TABLE "${schema}".m365_connections
  ADD COLUMN IF NOT EXISTS binding_id UUID
    REFERENCES "${schema}".ms_integration_bindings(binding_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS graph_api_version VARCHAR(10) NOT NULL DEFAULT 'v1.0';
```

---

## 5. Auth & Secrets

### 5.1 App Registration Requirements

Per tenant the customer creates **one** Entra ID app registration. The
platform supports two modes:

- **Client credentials** (service-to-service, daemon): used for SCIM push,
  scheduled SharePoint pulls, Defender/Sentinel ingestion, outbound email.
- **Authorization code + PKCE** (delegated): used for SSO, and per-user
  actions (Calendar, To Do, OneDrive "my files").

### 5.2 Minimum Graph Scopes (per connector)

| Connector | Application permissions | Delegated permissions |
|-----------|------------------------|-----------------------|
| Entra SSO | — | `openid profile email User.Read` |
| SCIM | `User.ReadWrite.All`, `Group.ReadWrite.All` | — |
| Outlook send | `Mail.Send` | — |
| Outlook read (evidence) | `Mail.Read` | — |
| SharePoint evidence | `Sites.Read.All`, `Files.Read.All` | — |
| OneDrive (per-user) | — | `Files.Read`, `Files.Read.All` |
| Teams channel post | `ChannelMessage.Send`, `Team.ReadBasic.All` | — |
| Calendar | — | `Calendars.ReadWrite` |
| Planner / To Do | — | `Tasks.ReadWrite`, `Group.ReadWrite.All` |
| Defender / Sentinel | `SecurityEvents.Read.All`, `SecurityAlert.Read.All` | — |
| Purview | `InformationProtectionPolicy.Read.All`, `AuditLog.Read.All` | — |
| Intune | `DeviceManagementManagedDevices.Read.All` | — |

For ARM-scoped connectors (Azure Policy, Sentinel, Defender management
plane) the same app registration also needs an **Azure RBAC** role
assignment (`Reader` or `Security Reader` at subscription scope).

### 5.3 Key Vault Layout

Naming convention (flat, one vault per environment):

```
{env}-{tenantShortId}-{purpose}
```

Examples:

```
prod-7f3c9b-entra-client-secret
prod-7f3c9b-graph-mail-refresh-token
prod-7f3c9b-azure-blob-sas
prod-7f3c9b-sentinel-arm-client-secret
```

Access policy: the platform's managed identity gets `Get`, `Set`, `List`;
customer admins never see secrets, only the metadata that they exist.

### 5.4 Audit events (DAuth)

Every binding create/update/delete, token acquisition failure, health flip,
and sync run emits a `dauth.audit` event with fields
`{ actor_user_id, tenant_id, connector_code, event_type, outcome, details }`.

---

## 6. Backend Module Layout

```
backend/src/
├── connectors/
│   ├── ms-graph-adapter.ts                  (NEW — Graph v1.0 client)
│   ├── azure-arm-adapter.ts                 (NEW — Defender/Sentinel/Policy)
│   ├── azure-blob-adapter.ts                (NEW — file-storage provider)
│   ├── azure-ai-search-adapter.ts           (NEW — RAG backend)
│   └── teams-adapter.ts                     (KEEP as legacy webhook fallback)
├── modules/platform/services/integrations/microsoft/
│   ├── ms-integrations.controller.ts        (NEW — REST surface)
│   ├── ms-integrations.service.ts           (NEW — binding registry)
│   ├── ms-oauth.service.ts                  (NEW — app-reg CRUD + consent URL)
│   ├── ms-health.service.ts                 (NEW — per-binding health probe)
│   └── jobs/
│       ├── sharepoint-evidence-sync.job.ts
│       ├── defender-findings-sync.job.ts
│       ├── sentinel-incident-sync.job.ts
│       └── intune-compliance-sync.job.ts
├── platform/dauth/identity/
│   ├── entra-id.provider.ts                 (NEW — OIDC IdP plug-in)
│   └── scim/
│       ├── scim.controller.ts               (NEW — /scim/v2/Users + /Groups)
│       └── scim.service.ts
└── platform/dos/security/services/
    └── ms-token-manager.service.ts          (NEW — extracted from email-oauth)
```

---

## 7. REST Surface (Admin UI contract)

Base path: `/api/v1/platform/integrations/ms`

```
GET    /registrations                         -> list per-tenant app registrations
POST   /registrations                         -> create (tenant_azure_id, client_id, secret)
DELETE /registrations/:id                     -> revoke

GET    /bindings                              -> list all connectors + status for current tenant
POST   /bindings                              -> enable {registration_id, connector_code, config}
PATCH  /bindings/:id                          -> update config / disable
DELETE /bindings/:id                          -> remove
POST   /bindings/:id/test                     -> run health probe

POST   /oauth/consent-url                     -> build admin-consent URL for a registration
GET    /oauth/callback                        -> (delegated) auth-code redirect handler

GET    /connectors                            -> static catalog (name, required scopes, UI hints)
```

SCIM (separate base path, required by Entra):

```
GET    /scim/v2/Users, /Users/:id
POST   /scim/v2/Users
PATCH  /scim/v2/Users/:id
DELETE /scim/v2/Users/:id
GET    /scim/v2/Groups, /Groups/:id  (plus POST/PATCH/DELETE)
GET    /scim/v2/ServiceProviderConfig
GET    /scim/v2/Schemas
GET    /scim/v2/ResourceTypes
```

---

## 8. Admin UI (Angular / PrimeNG)

Existing file: `@/root/Ai-Consult-Microservices/platform-package/frontend/src/app/pages/integrations/integrations-infra.component.ts`.

Add a sibling feature area:

```
frontend/src/app/pages/integrations/microsoft/
├── microsoft-integrations.routes.ts
├── microsoft-integrations.component.ts   (grid of capability cards)
├── app-registration-wizard.component.ts  (3-step: tenantId → clientId/secret → consent)
├── connector-card.component.ts           (toggle, health chip, “Configure”, “Test”)
├── sharepoint-sites-picker.component.ts  (for SharePoint binding config)
├── sentinel-workspace-picker.component.ts
└── services/microsoft-integrations.api.ts
```

Grouped sections on the page (matches §2):

1. **Identity & Access** — Entra ID SSO, SCIM, Conditional Access.
2. **Productivity (M365 / Graph)** — Outlook, SharePoint, OneDrive, Teams,
   Calendar, Planner / To Do.
3. **Security & Compliance Evidence** — Defender, Purview, Intune, Sentinel,
   Azure Policy.
4. **Infrastructure & AI** — Key Vault, Blob, Azure OpenAI, AI Search,
   Monitor, Service Bus.
5. **Developer / Ecosystem** — Power Automate custom connector (download
   OpenAPI), Teams app manifest download, Power BI workspace binding.

Each card shows: **enabled toggle**, **health chip** (green/amber/red),
**last sync**, **Configure** (opens side sheet), **Test** (runs probe),
**Audit log** (filtered view).

---

## 9. Observability & SLOs

- Every Graph / ARM call wrapped with the platform logger (`logger.service`)
  and an OpenTelemetry span `ms.<connector>.<operation>`.
- Metrics (Azure Monitor / Prometheus):
  - `ms_connector_requests_total{connector,outcome}`
  - `ms_connector_latency_ms_bucket{connector,operation}`
  - `ms_token_refresh_failures_total{connector}`
  - `ms_sync_records_total{connector}`
- SLOs: 99.0% success for Graph send/read, 99.5% for Entra SSO token
  issuance, p95 < 800ms for Graph user reads.

---

## 10. Security & Compliance

- No client secrets stored outside Key Vault (or `credentials_encrypted`
  fallback on-prem; AES-256-GCM with platform DEK).
- SCIM endpoint protected by a **bearer shared secret** issued per Entra
  provisioning job (rotated, revocable).
- OIDC: validate `iss`, `aud`, `nonce`, `azp`, `tid`; reject tokens where
  `tid` does not match the tenant's registered `tenant_azure_id`.
- Conditional Access: honor `amr` (authentication methods) and `acr`
  (authentication context) claims; map to platform step-up requirements for
  sensitive modules (AGRC approvals, SoD overrides).
- All new routes behind DAuth middleware + RBAC role `platform.integrations.admin`.
- Data residency: for KSA-region tenants, the app registration's home
  tenant and the bound Azure OpenAI / Blob / AI Search resources MUST be in
  a KSA region; the UI surfaces region of every bound resource and blocks
  cross-region binding when `tenant.residency_lock = true`.

---

## 11. Rollout Plan

| Release | Contents | Gate |
|---------|----------|------|
| **R1 — Foundations** | `ms-app-registrations` table, `ms-token-manager`, `ms-graph-adapter`, Admin UI shell, Entra SSO provider, Outlook send moved under the new binding | Internal tenant green |
| **R2 — Productivity** | SharePoint/OneDrive evidence sync, Teams Graph channel post + adaptive cards, Calendar, Planner/To Do | One design-partner tenant green |
| **R3 — Security Evidence** | Defender, Intune, Purview, Sentinel two-way, Azure Policy | AGRC + Incident regression green |
| **R4 — Ecosystem** | Power Automate connector, Power BI embedded, Teams Bot manifest | Marketplace listing |

Each release ships behind `MS_<CAPABILITY>_ENABLED` flags and is reversible
per-tenant from the Admin UI.

---

## 12. Testing Strategy

- Vitest unit tests for every adapter using `nock` against recorded Graph
  fixtures (`backend/src/tests/fixtures/ms-graph/*.json`).
- Integration tests under `tests/` drive the REST surface end-to-end against
  a mocked Entra/Graph server.
- Smoke test in `pnpm test:smoke` covers: create registration → enable Graph
  binding → health probe green → send test email via Graph → disable.
- Contract tests for SCIM against Entra's public SCIM test harness.
- Security tests: token-scope mismatch rejection, cross-tenant `tid`
  rejection, Key Vault failure fallback.

---

## 13. Open Questions (to resolve before R1 code)

1. Do we keep the legacy `teams-adapter.ts` webhook as a no-OAuth fallback
   for customers who will not grant Graph permissions? **Proposed: yes, as
   `connector_code='teams_webhook'`.**
2. Should Entra SSO be forced-on for any tenant that has ≥1 Entra-authored
   user, or always customer-opted? **Proposed: opt-in per tenant.**
3. Where does SCIM bearer-token rotation live — DAuth or integrations
   service? **Proposed: DAuth (it mints all platform tokens).**
4. Do we expose Azure OpenAI deployment binding here or leave it in AI
   Gateway config? **Proposed: mirror it here read-only, canonical source
   remains AI Gateway.**
5. Cost attribution: do we record MS Graph call volume per tenant for
   chargeback? **Proposed: yes, emit to `agrc-metrics.service.ts`.**

---

## 14. Appendix — File Touch List (R1)

New:

- `backend/src/connectors/ms-graph-adapter.ts`
- `backend/src/platform/dos/security/services/ms-token-manager.service.ts`
- `backend/src/modules/platform/services/integrations/microsoft/**`
- `backend/src/platform/dauth/identity/entra-id.provider.ts`
- `backend/src/platform/dauth/identity/scim/**`
- `backend/src/config/db/schemas/ms-integrations.ts` (migration)
- `frontend/src/app/pages/integrations/microsoft/**`
- `docs/runbooks/ms-integrations.md`

Modified:

- `backend/src/connectors/teams-adapter.ts` — keep, re-label as legacy
  webhook fallback; route through the new adapter when a Graph binding exists.
- `backend/src/modules/platform/services/email/email-oauth.service.ts` —
  delegate token acquisition to `ms-token-manager`.
- `backend/src/config/auth/keyvault.ts` — add `getSecretBySecretName(tenantId, purpose)` helper.
- `backend/src/platform/contracts/config-boundary.ts` — add `MS_*` flags.
- `backend/src/config/db/schemas/evidence-connectors.ts` — ALTER
  `m365_connections` per §4.3.
- `frontend/src/app/pages/integrations/integrations-infra.component.ts` —
  link to the new Microsoft page.
