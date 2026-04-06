# DOS Platform Package R1.5 — Product Registration

## Overview

The DOS Platform is product-neutral. Products (e.g., Shahin-AI GRC) register through the platform's product registration contract. This document specifies how to connect a product to a standalone platform deployment.

## Registration Contract

Every product must provide a machine-readable manifest:

```typescript
interface ProductManifest {
  productCode: string;
  displayName: string;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  ownerTeam: string;
  platformDependencies: string[];
  enabledByDefault: boolean;
  moduleCodes: string[];
  seedProviders: string[];
  tenantDefaults: string[];
  requiredReferenceData: string[];
}
```

## Registration Steps

### 1. Create Product Manifest

```typescript
// products/your-product/product.manifest.ts
export const YOUR_PRODUCT_MANIFEST: ProductManifest = {
  productCode: 'your-product',
  displayName: 'Your Product',
  version: '1.0.0',
  status: 'active',
  ownerTeam: 'product-team',
  platformDependencies: ['identity', 'tenancy', 'audit', 'permissions'],
  enabledByDefault: false,
  moduleCodes: ['module-a', 'module-b'],
  seedProviders: [],
  tenantDefaults: ['locale', 'timezone'],
  requiredReferenceData: [],
};
```

### 2. Register Routes

Products register their routes through the platform routing contract:

```typescript
// products/your-product/routes/index.ts
import { Router } from 'express';

export function createProductRoutes(): Router {
  const router = Router();
  // ... product route definitions
  return router;
}
```

### 3. Register Modules

Each product module must register through the module registration contract:

```typescript
interface ModuleRegistration {
  moduleCode: string;
  productCode: string;
  displayName: string;
  routeBase: string;
  ownedTables: string[];
  sharedTables: string[];
  permissions: string[];
  eventTypes: string[];
}
```

### 4. Register Seeds

Product-owned seeds register through the seed registry:

```typescript
// products/your-product/seeds/register.ts
import { registerProductSeed } from '../../platform/dos/seeds/seed-registry';

registerProductSeed('your-product', async (tenantId: string) => {
  // seed product reference data for tenant
});
```

### 5. Register Frontend Routes

Frontend product routes register through the frontend route registry:

```typescript
// frontend/src/app/products/your-product/routes.ts
import { Routes } from '@angular/router';

export const PRODUCT_ROUTES: Routes = [
  // ... product page routes
];
```

## Platform Capabilities Available to Products

| Capability | API | Description |
|-----------|-----|-------------|
| Identity | DAuth | User management, sessions, MFA |
| Access Control | DAuth | RBAC, ABAC, scope resolution |
| Tenancy | DOS | Multi-tenant schema isolation |
| Provisioning | DOS | Tenant creation and setup |
| Events | DOS | Event bus, domain events |
| Jobs | DOS | Cron scheduling, background jobs |
| Observability | DOS | Logging, metrics, tracing |
| Health | DOS | Health probes, readiness checks |
| Settings | DOS | Platform and tenant settings |
| Lifecycle | DOS | Subscription lifecycle management |

## Rules

1. **Product code inside platform core is forbidden** — products register via contracts
2. **Product tables must be owned** — declared in module registration
3. **Product permissions must be namespaced** — `product.module.action` format
4. **Product seeds must be product-owned** — never placed in platform seed directories
5. **Product routes must be namespaced** — `/api/products/{productCode}/...`
6. **Product must not modify platform tables** — read-only access to platform data
7. **Product manifests must be versioned** — semantic versioning required

## Validation

The platform provides a product registration validator:

```bash
# Validate product manifest
pnpm run validate:product --manifest products/your-product/product.manifest.ts
```

Checks performed:
- Manifest schema validation
- Permission naming convention
- Table ownership declaration
- Route namespace compliance
- Platform dependency availability
- No forbidden platform imports
