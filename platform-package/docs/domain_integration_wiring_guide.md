# Domain Full-Stack Integration Wiring Guide

To maintain a clean "product-neutral" architecture, every domain (like Healthcare, Government, or Education) must be completely decoupled from the DOS core. Instead of modifying core platform code, domains "wire" themselves into specific integration points.

Here are the precise tables mapping out exactly how you integrate a domain across the Full-Stack layers (Frontend, Backend, Database, and Platform Registry).

## 1. Frontend Integration (Angular 19 Platform Shell)

| Component | Domain Implementation Location | DOS Platform Wiring Point | Purpose |
| :--- | :--- | :--- | :--- |
| **Routing** | `frontend/src/app/products/{domain}/routes.ts` | `frontend/src/app/app.routes.ts` | Registers the domain's screens inside the DOS Shell via Angular lazy-loading. |
| **Navigation**| `frontend/src/app/products/{domain}/nav.ts` | `PlatformShellComponent` (Sidebar) | Injects domain-specific links (like "Case Studies" or "Patients") into the platform menu. |
| **UI Views** | `frontend/src/app/products/{domain}/pages/`| N/A (Self-contained) | The actual Angular component screens rendered when a user navigates to `/domain/...` |

## 2. Backend Integration (Node.js/Express TypeScript)

| Component | Domain Implementation Location | DOS Platform Wiring Point | Purpose |
| :--- | :--- | :--- | :--- |
| **API Entry** | `backend/src/products/{domain}/routes/` | `backend/src/platform/dos/api.gateway.ts` | The platform API Gateway dynamically mounts your domain routes to `/api/products/{domain}`. |
| **Services** | `backend/src/products/{domain}/services/` | N/A (Self-contained) | Domain business logic. Can safely import platform libraries (like mailers or logging). |
| **Events** | `backend/src/products/{domain}/events/` | DOS Event Bus Registry | Publishes and listens to cross-domain asynchronous workflows (e.g., Temporal messaging). |

## 3. Data & Isolation Layer (PostgreSQL)

| Component | Domain Implementation Location | DOS Platform Wiring Point | Purpose |
| :--- | :--- | :--- | :--- |
| **Migrations**| `backend/src/products/{domain}/db/` | `migration-runner.ts` | Creates the domain's tables exclusively within the isolated `tenant_{id}` PostgreSQL schema. |
| **Seeds** | `backend/src/products/{domain}/seeds/` | `seed-registry.ts` | Injects necessary default rows (configurations, forms, taxonomies) into a newly provisioned tenant. |
| **Models** | `backend/src/products/{domain}/models/` | DOS Query Builder | Interfaces your backend logic securely with `tenant_{id}` data rows. |

## 4. Platform Registry & Identity (DAuth / DOS Core)

| Component | Domain Implementation Location | DOS Platform Wiring Point | Purpose |
| :--- | :--- | :--- | :--- |
| **Manifest** | `backend/src/products/{domain}/manifest.ts`| `validate:product` pipeline | The machine-readable contract declaring domain dependencies, table ownership, and metadata. |
| **Auth/RBAC** | `backend/src/products/{domain}/scopes.ts` | DAuth Scope Registry | Declares domain-specific permissions (e.g., `healthcare.patient.read`) used by Identity Access Control. |

---

> **Example Flow:** When a user logs in and accesses the "Healthcare" domain:
> 1. They click the menu link (`PlatformShellComponent`).
> 2. Angular lazy-loads `/healthcare/patients` (`routes.ts`).
> 3. The UI queries the gateway at `/api/products/healthcare/patients`.
> 4. DOS validates the user token against `healthcare.patient.read` permissions.
> 5. The backend resolves their connection to `schema: tenant_101` and retrieves the data.
