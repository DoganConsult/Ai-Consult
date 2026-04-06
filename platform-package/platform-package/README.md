# DOS Platform Package R1.5

Standalone native deployment of the **Dogan-AI-OS (DOS)** platform core + **DAuth** authentication system.

- **Domain:** `dogan-ai.com` / `www.dogan-ai.com`
- **Port:** `3010` (Cloudflare Tunnel → `http://localhost:3010`)
- Zero product knowledge. Zero Shahin-AI references. Runs natively via PM2.

## What's included

| Layer | Contents |
|-------|----------|
| **DOS** | Tenancy, provisioning, lifecycle, events, observability, jobs, settings, workspace, health |
| **DAuth** | Identity, sessions, MFA, RBAC, scope resolution, delegation, SoD, middleware |
| **Frontend** | Angular 19 platform shell — login, dashboard, health, tenants, users, settings |
| **Config** | 3 env profiles + 3 typed JSON profiles (production, staging, on-prem) |
| **Ops** | Nginx config, alert rules, Grafana dashboard, PM2 ecosystem.config.js |
| **Tests** | Smoke, boundary-lock, migration, empty-product-startup, frontend-boundary |
| **Scripts** | Build, smoke-test, backup, restore, rollback, SBOM generation, DB init |
| **Docs** | ARCHITECTURE.md, CONFIG.md, SECRETS.md, PRODUCT_REGISTRATION.md |
| **Runbooks** | 9 operational runbooks |

## Quick start

```bash
# 1. Initialize database
pnpm db:init

# 2. Configure
cp config/production.env.example backend/.env
# Edit backend/.env with actual secrets and DB credentials

# 3. Install
cd backend && pnpm install

# 4. Start (dev)
pnpm dev

# 5. Verify
curl http://localhost:3010/api/health
```

## Production (PM2)

```bash
# Build
cd backend && pnpm build

# Start with PM2
pm2 start ecosystem.config.js

# Or with staging env
pm2 start ecosystem.config.js --env staging
```

## Cloudflare Tunnel routing

| Domain | Service | Port |
|--------|---------|------|
| `dogan-ai.com` | DOS Platform | `3010` |
| `www.dogan-ai.com` | DOS Platform | `3010` |

## Health endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/health` | No | Basic health + uptime |
| `GET /api/health/live` | No | Liveness probe |
| `GET /api/health/ready` | No | Readiness probe (DB + Redis) |
| `GET /api/metrics` | Token | Request metrics |
| `GET /api/metrics/prometheus` | Token | Prometheus format |

## Tests

```bash
pnpm test                    # All tests
pnpm test:smoke              # Health response tests
pnpm test:boundary           # No-product-import boundary checks (backend)
pnpm test:frontend-boundary  # No-product-import boundary checks (frontend)
pnpm test:migration          # Migration file integrity
pnpm test:empty-product      # Zero product startup verification
```

## Directory structure

```
platform-package/
├── backend/src/
│   ├── server.ts                 # Standalone entry point (port 3010)
│   ├── server-routes.ts          # Platform-only routes
│   ├── server-middleware.ts      # Platform middleware
│   ├── server-startup.ts         # Startup orchestrator
│   ├── startup/                  # Startup phases (no product refs)
│   ├── platform/dos/             # DOS platform core
│   ├── platform/dauth/           # DAuth auth system
│   ├── platform/contracts/       # Platform contracts
│   ├── platform/routing/         # Route infrastructure
│   ├── config/                   # DB, Redis, auth config
│   ├── errors/                   # Error handling
│   ├── shared/                   # Shared utilities
│   └── migrations/               # SQL migrations
├── frontend/src/
│   ├── app/
│   │   ├── app.component.ts      # Platform root component
│   │   ├── app.config.ts         # Angular providers
│   │   ├── app.routes.ts         # Platform-only routes
│   │   ├── core/dos/             # DOS shell services
│   │   ├── core/dauth/           # DAuth guards, interceptors, auth
│   │   ├── core/infrastructure/  # Error handler, storage
│   │   ├── shared/               # Shared components
│   │   ├── layout/               # Platform shell layout
│   │   └── pages/                # Dashboard, health, tenants, users, settings
│   └── environments/             # Dev, staging, production configs
├── config/                       # .env profiles + typed JSON profiles
├── docs/                         # ARCHITECTURE, CONFIG, SECRETS, PRODUCT_REGISTRATION
├── ops/                          # Nginx, monitoring, alert rules
├── tests/                        # 5 test suites
├── scripts/                      # Operational scripts + DB init
├── runbooks/                     # 9 runbooks
└── ecosystem.config.js           # PM2 production config
```

## Runbooks

1. [Fresh Install](runbooks/01-fresh-install.md)
2. [Upgrade](runbooks/02-upgrade.md)
3. [Backup & Restore](runbooks/03-backup-restore.md)
4. [Troubleshooting](runbooks/04-troubleshooting.md)
5. [Monitoring](runbooks/05-monitoring.md)
6. [Scaling](runbooks/06-scaling.md)
7. [Security](runbooks/07-security.md)
8. [Disaster Recovery](runbooks/08-disaster-recovery.md)
9. [Tenant Management](runbooks/09-tenant-management.md)
