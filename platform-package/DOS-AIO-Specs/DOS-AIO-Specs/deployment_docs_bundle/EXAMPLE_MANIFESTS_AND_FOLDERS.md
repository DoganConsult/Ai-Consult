# Example Manifests and Folders

## 1. Platform manifest example

```yaml
platform:
  code: core
  version: 1.0.0
  services:
    - auth
    - workspace
    - rbac
    - audit
    - files
    - workflow
    - reporting
    - ai_runtime
  health_checks:
    - auth_db
    - cache
    - queue
    - storage
```

## 2. Product manifest example

```yaml
product:
  code: shahin
  display_name: Shahin AI OS
  enabled: true
  default_modules:
    - governance
    - risk
    - compliance
  routes:
    api_prefix: /api/shahin
    ui_prefix: /shahin
  ai_asset_pack: shahin_default
  dashboards:
    - executive
    - operations
```

## 3. Module manifest example

```yaml
module:
  module_code: risk
  product_code: shahin
  display_name: Risk
  api_prefix: /api/shahin/risk
  ui_prefix: /shahin/risk
  db_namespace: shahin_risk
  permissions:
    - risk:read
    - risk:write
    - risk:approve
  lifecycle:
    install: ./lifecycle/install.ts
    bootstrap: ./lifecycle/bootstrap.ts
    enable: ./lifecycle/enable.ts
    disable: ./lifecycle/disable.ts
    uninstall: ./lifecycle/uninstall.ts
```

## 4. Recommended repository structure

```text
platform/
  backend/
  frontend/
  config/
  db/
  manifests/
  lifecycle/
  observability/

products/
  shahin/
    product.manifest.ts
    backend/
    frontend/
    config/
    db/
    ai/
    reports/
    lifecycle/

packages/
  module-governance/
  module-risk/
  module-compliance/
  module-evidence/
  module-policy/
  module-assessment/
  module-exception/
  module-issue/
```

## 5. Lifecycle pseudo-code

```ts
export async function installModule(ctx) {
  await validateDependencies(ctx);
  await runMigrations(ctx);
  await seedPermissions(ctx);
  await seedReferenceData(ctx);
  await registerRoutes(ctx);
  await registerPages(ctx);
  await registerJobs(ctx);
  await registerWorkflows(ctx);
}
```

## 6. Dependency policy example

- Platform may depend on nothing product-specific.
- Product may depend on platform.
- Module may depend on product contracts and platform services.
- Module must not directly import unrelated module internals.
