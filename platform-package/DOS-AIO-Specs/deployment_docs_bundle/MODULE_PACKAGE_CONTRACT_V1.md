# Module Package Contract V1

## 1. Purpose

A module package is a complete vertical slice of a product. It contains everything required for that domain capability to function, except for reusable platform services.

---

## 2. Required contents

### 2.1 Identity
- module manifest
- package metadata
- ownership metadata
- change log
- docs

### 2.2 Backend
- routes
- controllers
- services
- use cases
- repositories
- validators
- DTOs
- policy enforcement hooks

### 2.3 Frontend
- pages
- components
- forms
- route registration
- permission guards
- module navigation
- translations
- local assets

### 2.4 Domain
- entities
- schemas
- enums
- value objects
- module contracts

### 2.5 Database
- migrations
- seeds
- fixtures
- retention/archive scripts

### 2.6 Security
- permission definitions
- role mappings
- scope rules
- field masking rules
- audit entity labels

### 2.7 Events and workflows
- events published
- events consumed
- workflow definitions
- state transitions
- schedulers/jobs
- escalation rules

### 2.8 Lifecycle
- install
- bootstrap
- enable
- disable
- upgrade
- uninstall
- cleanup

### 2.9 Observability
- metrics
- health checks
- logging labels
- audit mapping
- tracing names

### 2.10 Tests
- unit
- integration
- API
- UI
- lifecycle
- boundary/removal

---

## 3. Required manifest fields

```yaml
module:
  module_code: evidence
  product_code: shahin
  display_name: Evidence
  route_prefix: /api/shahin/evidence
  ui_base_path: /shahin/evidence
  db_namespace: shahin_evidence
  permissions:
    - evidence:read
    - evidence:write
    - evidence:approve
  events_published:
    - evidence.submitted
    - evidence.approved
  events_consumed:
    - audit.requested
  default_enabled: false
  depends_on_platform:
    - auth
    - files
    - audit
    - workflow
  depends_on_modules: []
  lifecycle_hooks:
    install: ./lifecycle/install.ts
    enable: ./lifecycle/enable.ts
    disable: ./lifecycle/disable.ts
    uninstall: ./lifecycle/uninstall.ts
```

---

## 4. Canonical folder structure

```text
packages/module-evidence/
  module.manifest.ts
  package.json
  README.md
  CHANGELOG.md
  OWNERS.md

  backend/
    routes/
    controllers/
    services/
    use-cases/
    repositories/
    dto/
    validators/

  frontend/
    pages/
    components/
    forms/
    routes/
    guards/
    store/
    i18n/

  domain/
    entities/
    schemas/
    enums/
    value-objects/

  db/
    migrations/
    seeds/
    fixtures/

  security/
    permissions.ts
    roles.ts
    scopes.ts
    policies.ts
    masking.ts

  events/
    published/
    consumed/
    contracts/

  workflows/
    definitions/
    handlers/
    transitions/

  jobs/
    schedulers/
    workers/

  lifecycle/
    install.ts
    bootstrap.ts
    enable.ts
    disable.ts
    uninstall.ts
    cleanup.ts

  observability/
    metrics.ts
    health.ts
    audit.ts
    logging.ts
    tracing.ts

  reports/
    widgets/
    exports/
    templates/

  tests/
    unit/
    integration/
    api/
    ui/
    lifecycle/
    boundary/
```

---

## 5. Removal contract

When a module is removed, the following must disappear:
- module backend routes
- module frontend pages
- module nav items
- module permissions
- module jobs/workflows/events
- module widgets/reports

The following must continue to work:
- platform core
- parent product shell
- unrelated modules

---

## 6. Hard rules

1. A module may depend on platform services, never the reverse.
2. A module may not use workspace/admin permissions as a catch-all.
3. Module tables must have explicit ownership.
4. Module AI assets belong to the product/module package, not the reusable platform runtime.
5. Every module must support install, enable, disable, and uninstall flows.
