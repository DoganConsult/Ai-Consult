# DOS Platform Package R1.5 — Configuration Reference

## Configuration Domains

Per GPOC Law 14, configuration is separated into four domains:

| Domain | Location | Purpose |
|--------|----------|---------|
| **Environment** | `.env` files | Secrets, endpoints, credentials |
| **Deployment** | `config/*.json` | Typed deployment profile (cloud/on-prem/air-gapped) |
| **Product** | (none registered) | Product defaults, modules, features |
| **Tenant** | Runtime DB | Per-tenant overrides |

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (min 64 chars) | Random hex string |
| `SESSION_SECRET` | Session signing secret (min 64 chars) | Random hex string |

### Core Platform

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3010` | HTTP listen port |
| `PLATFORM_NAME` | `dos-platform` | Platform identifier |
| `PLATFORM_VERSION` | `1.5.0` | Package version |
| `DEPLOYMENT_MODE` | `standalone` | `standalone` / `saas` / `on-prem` |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_SSL` | `false` | Enable SSL |
| `DB_POOL_MIN` | `2` | Minimum pool size |
| `DB_POOL_MAX` | `10` | Maximum pool size |
| `DB_IDLE_TIMEOUT_MS` | `30000` | Idle connection timeout |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | Connection attempt timeout |

### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_TLS` | `false` | Enable TLS |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `COOKIE_DOMAIN` | — | Cookie domain scope |
| `CSRF_ENABLED` | `true` | Enable CSRF protection |

### Observability

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Pino log level |
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP collector endpoint |
| `METRICS_AUTH_TOKEN` | — | Bearer token for /metrics |

### Optional Services

| Variable | Default | Description |
|----------|---------|-------------|
| `CLICKHOUSE_ENABLED` | `false` | Enable ClickHouse analytics |
| `TEMPORAL_ENABLED` | `false` | Enable Temporal workflows |
| `AI_PROVIDER` | `none` | AI provider (`none` / `openai` / `ollama`) |
| `AZURE_KEYVAULT_ENABLED` | `false` | Enable Azure Key Vault |

### Air-Gap Controls (on-prem)

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOW_EXTERNAL_HTTP` | `true` | Allow outbound HTTP |
| `OFFLINE_MODE` | `false` | Full air-gap mode |
| `EXTERNAL_PROXY_URL` | — | Proxy for outbound requests |

## Deployment Profiles

Three pre-configured profiles are provided in `config/`:

- `production.env.example` — Full production with SSL, OTEL, strict security
- `staging.env.example` — Relaxed settings for staging/QA
- `on-prem.env.example` — Air-gapped on-premises deployment

Typed JSON profiles are also available:

- `config/production.json` — Typed production deployment profile
- `config/staging.json` — Typed staging deployment profile
- `config/onprem.json` — Typed on-premises deployment profile

## Usage

```bash
cp config/staging.env.example backend/.env
# Edit .env with actual values
cd backend && pnpm dev
```
