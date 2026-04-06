# Platform Config R0

## 1. Purpose

This document establishes ground-truth ownership for all configuration surfaces. It exists to stop platform, product, module, and tenant config from drifting into each other.

---

## 2. The four config buckets

### Bucket A: Environment config
Machine/runtime secrets and environment-specific values.

### Bucket B: Deployment config
How the system is deployed and operated.

### Bucket C: Product config
What a product enables and how it defaults.

### Bucket D: Tenant/workspace config
What an individual tenant/workspace is allowed to use or override.

---

## 3. Environment config

### 3.1 Owns
- JWT secrets
- DB credentials
- provider API keys
- SMTP credentials
- object storage credentials
- TLS certificate locations
- base hostnames
- region
- log sink destinations
- admin bootstrap secret
- monitoring credentials

### 3.2 Must not own
- enabled modules
- product defaults
- tenant branding
- workflow behavior tied to one tenant
- Shahin-specific assumptions

### 3.3 Storage pattern
Store in:
- secret manager
- env file for local dev
- secure config store for on-prem

Never store tenant mutable settings here.

---

## 4. Deployment config

### 4.1 Owns
- deployment mode: saas | onprem | hybrid
- db topology: shared | separate | hybrid
- cache mode
- queue mode
- storage mode
- air-gap mode
- backup/restore profile
- retention profile
- horizontal scale settings
- feature availability by deployment class

### 4.2 Must not own
- per-tenant feature toggles
- product onboarding defaults
- per-module permissions
- workspace theme or branding

### 4.3 Example keys

```yaml
deployment:
  mode: onprem
  db_mode: separate
  storage_mode: local_s3
  queue_mode: redis
  air_gapped: true
  backups:
    enabled: true
    frequency: nightly
```

---

## 5. Product config

### 5.1 Owns
- product enabled
- product display/branding package
- enabled product modules
- product default workflows
- product AI asset packages
- product dashboards
- product onboarding presets
- product reports
- product-level default permissions or role packs

### 5.2 Must not own
- core RBAC engine behavior
- platform identity
- environment secrets
- DB credentials
- cloud/on-prem topology

### 5.3 Example keys

```yaml
product:
  code: shahin
  enabled: true
  default_modules:
    - governance
    - risk
    - compliance
  onboarding_preset: enterprise_governance
  ai_asset_pack: shahin_default
```

---

## 6. Tenant/workspace config

### 6.1 Owns
- enabled modules
- tenant branding
- locale/timezone
- tenant-specific integrations
- tenant workflow overrides
- allowed AI models/providers
- UI preferences
- tenant-specific notifications
- workspace-specific feature toggles

### 6.2 Must not own
- global secrets
- deployment topology
- generic product package code
- unrelated platform behavior

### 6.3 Example keys

```yaml
tenant:
  id: acme-bank
  modules_enabled:
    - governance
    - risk
    - evidence
  branding:
    theme: navy
    logo_ref: s3://tenant-assets/acme/logo.svg
  ai:
    allowed_models:
      - local-llm-a
      - watson-model-b
```

---

## 7. Source-of-truth precedence

Precedence should be:

1. environment config
2. deployment config
3. product config
4. tenant/workspace config
5. module local defaults
6. user preferences

Lower layers may refine allowed behavior, but may not violate constraints set by higher layers.

Example:
- deployment may declare `air_gapped=true`
- tenant may not enable a cloud-only AI provider in that deployment

---

## 8. Validation rules

The config system must validate:

- unknown keys
- forbidden cross-bucket values
- invalid combinations
- missing required values
- incompatible module activation
- deployment-mode unsupported product behavior
- tenant overrides outside allowed range

---

## 9. Anti-patterns to forbid

Do not allow:
- workspace settings acting as a catch-all for everything
- product defaults embedded in environment files
- module flags stored as platform core constants
- Shahin assumptions embedded in reusable platform services
- SaaS-only settings mixed into on-prem install defaults without profile gates

---

## 10. Implementation actions

1. Define schema for each config bucket.
2. Create config loader by bucket.
3. Add validation and precedence rules.
4. Add config audit endpoint/report.
5. Add tests for invalid cross-bucket combinations.
6. Freeze config docs before extending deployment profiles.
