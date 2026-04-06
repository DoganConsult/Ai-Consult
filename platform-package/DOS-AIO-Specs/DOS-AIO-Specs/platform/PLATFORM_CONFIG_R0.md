# Platform Configuration Separation — Release 0

> Source: `platform/sdkdeployment-guideline.md`
> Owner: DOS Platform Team
> Status: R0 — Initial Separation

---

## 1. Environment Config Bucket

**Owner:** DevOps

Contains runtime-level settings that vary per environment but never contain secrets.

| Field | Example Values |
|-------|---------------|
| Runtime mode | `development` / `staging` / `production` |
| Base URLs | `https://api.example.com`, `https://app.example.com` |
| Region | `us-east-1`, `eu-west-1`, `local` |
| Logging level | `debug` / `info` / `warn` / `error` |
| Debug flags | `enableDevTools`, `verboseSQL`, `traceRequests` |

**Rule:** This bucket never contains secrets, credentials, or API keys.

---

## 2. Deployment Config Bucket

**Owner:** Infrastructure

Contains infrastructure topology decisions that shape how the platform runtime connects to backing services.

| Field | Options |
|-------|---------|
| DB mode | `shared` / `separate` |
| Storage provider | `local` / `s3` / `azure` |
| Queue provider | `redis` / `rabbitmq` / `none` |
| Cache provider | `redis` / `memory` |
| TLS config | cert paths, termination mode |
| Offline / air-gapped mode | `true` / `false` |
| Object storage mode | `local-fs` / `s3-compatible` / `azure-blob` |

---

## 3. Product Config Bucket

**Owner:** Product Team

Contains product-level activation and defaults. Scoped to a product (e.g., Shahin-AI) running on the platform.

| Field | Description |
|-------|-------------|
| Product enabled/disabled | Master toggle for the product |
| Enabled modules list | Which modules are active for this product |
| Product defaults | Default settings seeded at product install |
| Product onboarding presets | Onboarding flow configuration |
| Product AI/provider allowlists | Which AI providers the product may use |
| Product-level report packs | Report templates bundled with the product |
| Product feature flags | Product-scoped feature toggles |

---

## 4. Tenant / Workspace Config Bucket

**Owner:** Tenant Admin

Contains per-tenant overrides and workspace-level customization.

| Field | Description |
|-------|-------------|
| Branding | Logo, colors, theme |
| Feature toggles per tenant | Tenant-scoped feature flags |
| Module entitlements | Which modules this tenant may use |
| Workspace overrides | Workspace-level setting overrides |
| Notification preferences | Email, in-app, webhook preferences |
| Language / timezone | Locale and timezone |
| Custom fields | Tenant-defined custom metadata fields |

---

## 5. Config Precedence Rules

```
environment < deployment < product < tenant
```

- Tenant overrides product.
- Product overrides deployment.
- Deployment overrides environment.
- **Explicit deny always wins** regardless of precedence level.

---

## 6. Secret Management

Secrets include:

- Provider API keys
- JWT secrets
- DB credentials
- TLS certificates
- Encryption keys

**Rules:**

| Environment | Strategy |
|-------------|----------|
| Development | Environment variables |
| Staging | Vault / secrets manager |
| Production | Vault / secrets manager |

Secrets must **never** appear in:

- Source code
- Config files checked into version control
- Frontend bundles
- Log output

---

## 7. Feature Toggle Ownership

### Platform toggles (owned by DOS)

- Runtime mode
- Maintenance mode
- Debug logging

### Product toggles (owned by Shahin)

- Module activation
- Feature packs
- AI features

### Module toggles (owned by module)

- Per-module feature flags
- Beta features

---

## 8. What Must NOT Be Mixed

These separation lines are architectural constraints. Violating them reintroduces coupling.

| Do not mix | With |
|------------|------|
| Environment config | Tenant config |
| Deployment config | Product config |
| Product config | Platform config |
| Module defaults | Workspace / global settings |
| Platform AI runtime | Shahin AI catalogs |
| Platform routes | Product routes |
| Shared DB ownership | Product-owned schema ownership |
