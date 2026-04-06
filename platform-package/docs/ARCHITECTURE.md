# DOS Platform Package R1.5 — Architecture

## System Overview

The DOS Platform Package is a standalone deployment of the **Dogan-AI-OS (DOS)** platform core + **DAuth** authentication system. It contains zero product knowledge and is designed for independent production deployment.

## Layers

```
┌─────────────────────────────────────────────┐
│              Frontend Shell                  │
│  Angular 19 · PrimeNG · Platform Admin UI    │
├─────────────────────────────────────────────┤
│              API Gateway (Express)           │
│  Health · Auth · Provisioning · Admin        │
├──────────────┬──────────────────────────────┤
│    DAuth     │          DOS                  │
│  Identity    │  Tenancy · Lifecycle          │
│  Sessions    │  Events · Observability       │
│  RBAC/ABAC   │  Jobs · Settings              │
│  MFA · SoD   │  Provisioning · Workspace     │
│  Delegation  │  Health · Rate Limiting       │
├──────────────┴──────────────────────────────┤
│           Data Layer                         │
│  PostgreSQL · pgvector · Redis · ClickHouse  │
└─────────────────────────────────────────────┘
```

## Ownership Model

| Layer | Owner | Description |
|-------|-------|-------------|
| **DOS** | Platform | Tenancy, provisioning, lifecycle, events, observability, jobs, settings, workspace, health |
| **DAuth** | Platform | Identity, sessions, MFA, RBAC, scope resolution, delegation, SoD, middleware |
| **Product** | (None) | No product is registered. Products register via the product registration contract. |

## Package Roots

| Concern | Backend Path | Frontend Path |
|---------|-------------|---------------|
| DOS | `backend/src/platform/dos/` | `frontend/src/app/core/dos/` |
| DAuth | `backend/src/platform/dauth/` | `frontend/src/app/core/dauth/` |
| Contracts | `backend/src/platform/contracts/` | — |
| Infrastructure | — | `frontend/src/app/core/infrastructure/` |

## Multi-Tenancy

- Tenant-scoped schemas: `tenant_{id}` in PostgreSQL
- Master schema for platform tables
- Schema-per-tenant isolation model
- Tenant resolution via host header or explicit tenant ID

## Startup Phases

1. **Secrets & Config** — Bootstrap secrets, validate env, load deployment profile
2. **Connections** — Database, Redis, OpenFGA, PGMQ, Apache AGE, ClickHouse, KeyVault, Vector Store
3. **Migrations & Seeds** — Master migrations, tenant migrations, schema sync, registry seed, config bridge
4. **Validations** — Platform startup validations
5. **Event Subscribers** — Platform event handlers
6. **Cron Jobs** — Temporal schedules or node-cron fallback (platform-only jobs)
7. **Server Listen** — HTTP server, graceful shutdown, memory monitor

## API Surface

All routes are platform-only. No product routes are mounted.

| Prefix | Purpose |
|--------|---------|
| `/api/health` | Health, readiness, metrics |
| `/api/auth` | Authentication, sessions |
| `/api/provisioning` | Tenant provisioning |
| `/api/me` | Current user, access contract |
| `/api/identity` | Actor identity |
| `/api/subscription` | Subscription lifecycle |
| `/api/platform/agents` | DOS agent stack (optional) |
| `/api/platform/ai-gateway` | AI gateway health (optional) |
| `/api/platform/schema` | Schema governance |
| `/api/public` | Public content |

## Product Registration

Products register through the platform's product registration contract. See [PRODUCT_REGISTRATION.md](./PRODUCT_REGISTRATION.md).
