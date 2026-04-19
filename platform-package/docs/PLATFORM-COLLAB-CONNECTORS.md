# Platform — Collaboration & Identity Connectors (Multi-Vendor)

> Companion to `PLATFORM-MS-INTEGRATIONS.md`. Covers vendors beyond
> Microsoft that the Admin UI's **Integrations** page will expose so the
> platform can support every product (AGRC, Incident, Controls, Reporting,
> Analytics, AI Gateway) with the collaboration and identity tools
> customers already own.
>
> Status: **Draft v0.1**

---

## 1. Unified Connector Framing

All collaboration / identity connectors (Microsoft **and** non-Microsoft)
share one backend contract so the Admin UI, audit trail, Key Vault layout,
and health-probe UX are identical:

```
backend/src/connectors/
├── ms-graph-adapter.ts          (Microsoft — see MS doc)
├── google-workspace-adapter.ts  (NEW)
├── google-drive-adapter.ts      (NEW, thin wrapper over workspace adapter)
├── zoom-adapter.ts              (NEW)
├── linkedin-adapter.ts          (NEW)
├── slack-adapter.ts             (existing)
└── teams-adapter.ts             (existing webhook; superseded by ms-graph)
```

A connector implements the shared interface:

```ts
// backend/src/connectors/types.ts (NEW)
export interface PlatformConnector {
  code: string;                          // 'google_drive', 'zoom', 'linkedin', ...
  vendor: 'microsoft' | 'google' | 'zoom' | 'linkedin' | 'slack' | 'other';
  auth: 'oauth2_cc' | 'oauth2_ac' | 'api_key' | 'webhook' | 'jwt';
  requiredScopes: string[];
  healthProbe(binding: ConnectorBinding): Promise<HealthResult>;
  invoke<TIn, TOut>(op: string, binding: ConnectorBinding, payload: TIn): Promise<TOut>;
}
```

Bindings persist in the same `ms_integration_bindings` pattern introduced
in the MS doc — rename the table to **`integration_bindings`** and
generalize `ms_app_registrations` → **`oauth_app_registrations`** with a
`vendor` column. (See §4.)

---

## 2. Capability Matrix (non-Microsoft additions)

| Vendor | Surface | API | Uses In Products | Effort |
|--------|---------|-----|------------------|--------|
| **Google Workspace** | SSO (OIDC) | `accounts.google.com/o/oauth2/v2` | All (auth) | S |
| Google Workspace | SCIM / Directory provisioning | Admin SDK `admin.directory.v1` | All (user mgmt) | M |
| **Google Drive** | Evidence pull (files, shared drives) | Drive v3 | AGRC, Controls, Reporting | M |
| Google Calendar | Audit / review scheduling | Calendar v3 | AGRC, Controls | S |
| Gmail | Outbound email (OAuth2, alt to SMTP) | Gmail v1 `users.messages.send` | Notification | S |
| Google Chat | Channel / space notifications | Chat v1 | Incident, AGRC | S |
| Google Meet | Meeting links in tickets | Calendar v3 conferenceData | Incident, AGRC | S |
| **Zoom** | SSO (SAML/OIDC) | Zoom SSO | All (auth) | S |
| Zoom | Meetings create / join-link | Zoom API v2 `/users/{id}/meetings` | Incident, AGRC | S |
| Zoom | Cloud recording evidence pull | Zoom API v2 `/meetings/{id}/recordings` | AGRC (training evidence) | M |
| Zoom | Webhook events (join, leave, end) | Zoom Event Subscriptions | Incident (war-room), audit | S |
| Zoom Phone | Call-recording evidence (optional) | Zoom Phone API | AGRC | L |
| **LinkedIn** | Sign-in with LinkedIn (OIDC) | LinkedIn OAuth2 | Marketing onboarding, partner portal | S |
| LinkedIn | Profile enrichment at signup | `/v2/userinfo`, `/v2/me` | User onboarding, CRM sync | S |
| LinkedIn | Company / Page post (product announcements) | Marketing API | Marketing / content ops | M |
| LinkedIn Learning (if licensed) | Training completion evidence | LinkedIn Learning API | AGRC (awareness controls) | M |

All are opt-in per tenant and behind feature flags
(`GOOGLE_WORKSPACE_ENABLED`, `ZOOM_ENABLED`, `LINKEDIN_ENABLED`).

---

## 3. Auth Details

### 3.1 Google Workspace

- **App registration**: customer creates a Google Cloud project, enables
  Admin SDK / Drive / Gmail / Calendar / Chat APIs, creates an **OAuth 2.0
  client** (web) *and* a **service account** with **domain-wide
  delegation** for daemon flows.
- **Client credentials equivalent**: JWT-signed service-account token →
  impersonation of an admin user via `sub` claim. We store the service-
  account JSON key in Key Vault (`{env}-{tenantShortId}-google-sa-json`).
- **OIDC SSO**: standard `openid profile email`. Validate `hd` (hosted
  domain) against the tenant's registered Workspace domain.
- **SCIM**: Google Workspace can push via SCIM 2.0 to our existing
  `/scim/v2/*` endpoint — zero new code beyond a tenant-scoped bearer token.

Minimum scopes:

```
openid profile email
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/admin.directory.group.readonly
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/chat.messages
```

### 3.2 Zoom

- Two app types supported:
  - **Server-to-Server OAuth** (recommended for daemon flows: meeting
    creation, recordings pull). Account ID + client ID + secret → `POST
    /oauth/token` with `grant_type=account_credentials`.
  - **OAuth 2.0 user app** for delegated actions (user-scoped meeting
    creation from a user's own account).
- Secrets in Key Vault: `{env}-{tenantShortId}-zoom-s2s-secret`.
- Webhooks: validate `x-zm-signature` HMAC; store `ZOOM_WEBHOOK_SECRET_TOKEN`
  in Key Vault.
- Scopes (server-to-server minimum):
  `meeting:read:admin meeting:write:admin recording:read:admin user:read:admin webinar:read:admin report:read:admin`

### 3.3 LinkedIn

- **OIDC Sign-In with LinkedIn**: `openid profile email w_member_social`
  (only the first three for plain auth). No service-account equivalent —
  all actions are user-delegated.
- **Marketing API**: requires partner-program approval; gated behind a
  feature flag and surfaced only to tenants that supply an approved app.
- Store client secret in Key Vault; tokens are short-lived (60d), implement
  refresh flow in `ms-token-manager` (renamed — see §5).
- Scopes:
  `openid profile email` (SSO), `w_member_social r_organization_social rw_organization_admin` (Page posts).

---

## 4. Schema Deltas (supersedes MS doc §4.2 names)

Rename and broaden the two tables introduced in the MS doc:

```sql
-- Generalized replacement for ms_app_registrations
CREATE TABLE "${schema}".oauth_app_registrations (
  registration_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor              VARCHAR(20) NOT NULL
                      CHECK (vendor IN ('microsoft','google','zoom','linkedin','slack','other')),
  external_tenant_id  VARCHAR(200),        -- Azure tenant id / Google domain / Zoom account id / LI org
  app_client_id       VARCHAR(200) NOT NULL,
  secret_name_kv      VARCHAR(255) NOT NULL,
  extra_secret_names  JSONB DEFAULT '{}',   -- {"google_sa_json":"...","zoom_webhook":"..."}
  redirect_uris       TEXT[] NOT NULL DEFAULT '{}',
  consented_scopes    TEXT[] NOT NULL DEFAULT '{}',
  auth_mode           VARCHAR(20) NOT NULL
                      CHECK (auth_mode IN ('client_credentials','auth_code','on_behalf_of','service_account_jwt','s2s_oauth')),
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','revoked','error')),
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor, external_tenant_id, app_client_id)
);

-- Generalized replacement for ms_integration_bindings
CREATE TABLE "${schema}".integration_bindings (
  binding_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id     UUID NOT NULL REFERENCES "${schema}".oauth_app_registrations(registration_id) ON DELETE CASCADE,
  vendor              VARCHAR(20) NOT NULL,   -- denormalized for fast UI queries
  connector_code      VARCHAR(40) NOT NULL,   -- 'google_drive','zoom_meetings','linkedin_sso', ...
  enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  config              JSONB NOT NULL DEFAULT '{}',
  health_status       VARCHAR(20) NOT NULL DEFAULT 'unknown'
                      CHECK (health_status IN ('unknown','healthy','degraded','failed')),
  last_health_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (registration_id, connector_code)
);
CREATE INDEX idx_bindings_vendor ON "${schema}".integration_bindings(vendor, connector_code, enabled);
```

Evidence tables that already exist are reused vendor-agnostically:

- Google Drive / Gmail / Chat evidence → `m365_evidence_items` renamed to
  **`collab_evidence_items`** with a `vendor` column (migration only, same
  shape).
- Zoom recordings → new rows in `collab_evidence_items` with
  `source_type='zoom_recording'`.

(Rename applies only if not yet shipped; if `m365_evidence_items` is live,
add a peer table `collab_evidence_items` and migrate forward.)

---

## 5. Shared Token Manager

Rename `ms-token-manager.service.ts` (proposed in MS doc) →
**`oauth-token-manager.service.ts`** with pluggable vendor strategies:

```
platform/dos/security/services/oauth-token-manager.service.ts
platform/dos/security/services/token-strategies/
    microsoft.strategy.ts
    google-sa.strategy.ts        (JWT-bearer → token)
    google-user.strategy.ts      (auth-code + refresh)
    zoom-s2s.strategy.ts
    zoom-user.strategy.ts
    linkedin.strategy.ts
```

All strategies share caching, refresh, Key Vault secret resolution, audit,
and retry-with-backoff.

---

## 6. REST Surface (Admin UI)

Base path generalized from MS-only to all vendors:

```
/api/v1/platform/integrations/registrations           (vendor=…)
/api/v1/platform/integrations/bindings                (vendor=…, connector_code=…)
/api/v1/platform/integrations/connectors              (catalog: name, vendor, scopes, UI hints)
/api/v1/platform/integrations/oauth/consent-url       (vendor=…)
/api/v1/platform/integrations/oauth/callback          (handles all vendors via `state.vendor`)
```

SCIM stays at `/scim/v2/*` but now accepts Google Workspace in addition to
Entra; isolation via the per-tenant bearer token issued at binding time.

---

## 7. Admin UI

Update the page introduced in MS doc §8 from "Microsoft Integrations" to
**"Integrations"** with vendor tabs:

```
frontend/src/app/pages/integrations/
├── integrations.component.ts          (tab host)
├── microsoft/ …                       (MS doc §8)
├── google/
│   ├── google-integrations.component.ts
│   ├── google-app-wizard.component.ts (OAuth client + service-account JSON upload)
│   ├── drive-picker.component.ts      (shared-drive selector for evidence)
│   └── services/google-integrations.api.ts
├── zoom/
│   ├── zoom-integrations.component.ts
│   ├── zoom-app-wizard.component.ts   (S2S OAuth account-id/client-id/secret + webhook token)
│   └── services/zoom-integrations.api.ts
├── linkedin/
│   ├── linkedin-integrations.component.ts
│   ├── linkedin-app-wizard.component.ts
│   └── services/linkedin-integrations.api.ts
└── shared/
    ├── connector-card.component.ts
    ├── health-chip.component.ts
    └── oauth-consent-button.component.ts
```

Capability-card sections per vendor:

- **Google Workspace**: SSO, SCIM, Drive, Calendar, Gmail, Chat, Meet.
- **Zoom**: SSO, Meetings, Recordings, Webhooks, Phone (optional).
- **LinkedIn**: Sign-in, Profile enrichment, Page posting, Learning (if licensed).

---

## 8. Product-Level Use Cases (what end users get)

- **AGRC / Controls**: pull training completion from Google Drive,
  LinkedIn Learning, Zoom recordings; attach as evidence on awareness &
  training controls.
- **Incident (MP-13)**: one-click "Create war-room": Zoom meeting + Google
  Chat / Teams channel + calendar invite to responders, links persisted on
  the incident.
- **Reporting / Analytics (MP-11/12)**: export scheduled PDFs to a Google
  Drive shared folder or SharePoint site per tenant policy.
- **Notification**: tenant picks default email channel (Graph / Gmail /
  SMTP) and default chat channel (Teams / Slack / Google Chat) per event
  class (incident.high, approval.pending, etc.).
- **User onboarding**: Sign in with LinkedIn or Google for partner/consult
  tenants; Entra / Google Workspace SSO for enterprise.

---

## 9. Security & Compliance Notes

- Google service-account JSON keys are the single highest-value secret —
  **must** go to Key Vault; on-prem fallback uses AES-256-GCM with the
  platform DEK and is logged as a compliance deviation.
- LinkedIn tokens are **user** tokens and expire in 60 days — refresh flow
  is mandatory; if refresh fails, disable the binding and raise a DAuth
  audit event, never silently drop.
- Zoom webhook secret tokens MUST be validated on every event;
  non-matching HMAC → 401 and audit event `zoom.webhook.signature_invalid`.
- Honor tenant residency: Google data-region selection (EU vs US), Zoom
  data-center preference, LinkedIn regional endpoints — surface these in
  the binding config UI.
- Every Sign-In-with-LinkedIn / Google / Zoom login follows the same DAuth
  step-up policy as Entra: high-risk modules require MFA or re-auth
  regardless of IdP.

---

## 10. Rollout (folded into MS rollout)

Extend the MS rollout from `PLATFORM-MS-INTEGRATIONS.md` §11:

| Release | Additions |
|---------|-----------|
| **R1** | Rename tables to vendor-agnostic names; connector interface in place; Microsoft + **Google SSO** ship together. |
| **R2** | Google Drive / Calendar / Gmail / Chat; **Zoom meetings + webhooks**. |
| **R3** | LinkedIn Sign-in + profile enrichment; Zoom recordings → evidence. |
| **R4** | LinkedIn Page posting + Learning evidence; Google Meet deep links. |

---

## 11. Open Questions (non-MS specific)

1. Do we want **Sign-in with LinkedIn** for any platform tenant, or only
   for a dedicated "partner portal" product? Impacts risk posture (LinkedIn
   has no enterprise IdP guarantees).
2. Zoom Phone: high value for AGRC call-evidence, but significant scope —
   defer to R5?
3. Google Workspace service-account JSON storage: require Key Vault (block
   onboarding if unavailable) or allow encrypted fallback for on-prem?
4. Do we sync Google Groups → platform roles via SCIM out of the box, or
   leave group-role mapping manual?
5. Shared "notification router" (picks Teams vs Slack vs Google Chat per
   event class) — ship in R2 or split into its own spec?

---

## 12. File Touch List (delta over MS doc)

New:

- `backend/src/connectors/google-workspace-adapter.ts`
- `backend/src/connectors/google-drive-adapter.ts`
- `backend/src/connectors/zoom-adapter.ts`
- `backend/src/connectors/linkedin-adapter.ts`
- `backend/src/connectors/types.ts` (shared `PlatformConnector` interface)
- `backend/src/platform/dos/security/services/oauth-token-manager.service.ts`
- `backend/src/platform/dos/security/services/token-strategies/**`
- `backend/src/platform/dauth/identity/google-workspace.provider.ts`
- `backend/src/platform/dauth/identity/linkedin.provider.ts`
- `backend/src/platform/dauth/identity/zoom-sso.provider.ts`
- `frontend/src/app/pages/integrations/{google,zoom,linkedin,shared}/**`

Modified:

- `backend/src/config/db/schemas/ms-integrations.ts` → rename file +
  contents to `integration-bindings.ts` with generalized tables in §4.
- `backend/src/connectors/slack-adapter.ts` — conform to new
  `PlatformConnector` interface (no functional change).
- `frontend/src/app/pages/integrations/integrations-infra.component.ts` —
  link to tabbed host.
