# REF-07 -- Runtime Operations Runbook

> **Platform:** Dogan-AI-OS (DOS) / Shahin-AI AGRC
> **Generated from:** `ecosystem.config.js`, `health.routes.ts`, `health-check.service.ts`
> **Date:** 2026-04-05

---

## 1. PM2 Management

The backend runs via PM2 in cluster mode. Configuration lives in `backend/ecosystem.config.js`.

### 1.1 PM2 Process Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Process name | `dos-backend` (env: `PM2_APP_NAME`) | |
| Script | `dist/server.js` | Compiled TypeScript output |
| Working directory | `/opt/shahin-grc/backend` (env: `APP_ROOT`) | |
| Instances | 2 | Cluster mode |
| Exec mode | `cluster` | |
| Port | 3000 | |
| Max memory restart | 2000M | 1.3x V8 heap of 1536M |
| Node args | `--max-old-space-size=1536 --max-http-header-size=16384` | |
| Kill timeout | 60000ms | 60s graceful shutdown to drain in-flight requests |
| Listen timeout | 120000ms | 120s startup timeout |
| Max restarts | 15 | |
| Min uptime | 10s | |
| Restart delay | 3000ms | |
| Auto restart | true | |
| Log files | `/opt/shahin-grc/logs/pm2-out.log`, `/opt/shahin-grc/logs/pm2-error.log` | |
| Log date format | `YYYY-MM-DD HH:mm:ss Z` | |

Second process: `openclaw-server` (MCP for external users, fork mode, 1 instance).

### 1.2 Common PM2 Commands

```bash
# Start the platform
pm2 start /opt/shahin-grc/backend/ecosystem.config.js

# Stop all processes
pm2 stop all

# Restart all processes (graceful, waits for kill_timeout)
pm2 restart all

# Restart only the backend
pm2 restart dos-backend

# Reload with zero-downtime (cluster mode)
pm2 reload dos-backend

# View process status
pm2 status

# View real-time logs
pm2 logs

# View logs for specific process
pm2 logs dos-backend --lines 100

# Monitor CPU/memory in real-time
pm2 monit

# Save current process list (survives reboot)
pm2 save

# Setup PM2 startup script
pm2 startup
```

---

## 2. Health Check Endpoints

All health endpoints are mounted at `/api` before auth/tenant guards, so they are accessible without authentication.

### 2.1 Endpoint Reference

| Endpoint | Auth | Purpose | Success Code | Failure Code |
|----------|------|---------|--------------|--------------|
| `GET /api/health` | None | Basic health check -- status, timestamp. In non-production: version, uptime, memory, request count, avg response time | 200 | -- |
| `GET /api/health/ready` | None | Readiness probe -- checks database, Redis, Temporal, LangGraph, OTEL status | 200 | 503 |
| `GET /api/health/live` | None | Liveness probe -- event loop lag check. Degraded if lag > 500ms | 200 | 503 |
| `GET /api/health/agents` | `x-setup-token` | AI agent health summary across all active tenants (recent runs, errors) | 200 | 403/500 |
| `GET /api/health/cache` | None | Redis connectivity and cache statistics | 200 | -- |
| `GET /api/health/memory-trend` | None | Memory usage trend over time | 200 | -- |
| `GET /api/health/compliance` | None | Compliance workspace health for a specific tenant (`?tenantId=...`) | 200 | 503 |
| `GET /api/ready` | None | Simple readiness probe (DB only) | 200 | 503 |
| `GET /api/metrics` | Bearer/setup-token (prod) | Request metrics snapshot (JSON or Prometheus text format) | 200 | 403 |
| `GET /api/metrics/prometheus` | Bearer/setup-token (prod) | Prometheus-format metrics | 200 | 403 |
| `GET /api/errors/summary` | `x-setup-token` | Error tracker summary | 200 | 403 |

### 2.2 Health Check Service (Structured)

The `health-check.service.ts` provides a deeper structured health check that tests five components in parallel:

| Component | Check Method | Healthy | Degraded | Unhealthy |
|-----------|-------------|---------|----------|-----------|
| **database** | `SELECT 1` query | Query succeeds | -- | Query fails (makes system unhealthy) |
| **redis** | `isRedisHealthy()` PING | Connected | Not connected (memory fallback) | -- |
| **temporal** | TCP connect to `TEMPORAL_ADDRESS` | Connected | Timeout/error | -- (disabled if `TEMPORAL_ENABLED != true`) |
| **bullmq** | Redis connectivity (BullMQ depends on Redis) | Redis connected | Redis unavailable | -- (disabled if `BULLMQ_ENABLED != true`) |
| **ai_provider** | HTTP HEAD to provider endpoint | Reachable | Timeout/error | -- (disabled if `AI_PROVIDER` not set) |

**Aggregation rule:** If database is unhealthy, overall status is `unhealthy`. If any other component is degraded, overall status is `degraded`. Otherwise `healthy`.

### 2.3 Quick Health Check Script

```bash
#!/bin/bash
BASE_URL="${1:-http://localhost:3000}"

echo "--- Basic Health ---"
curl -sf "$BASE_URL/api/health" | python3 -m json.tool

echo ""
echo "--- Readiness ---"
curl -sf "$BASE_URL/api/health/ready" | python3 -m json.tool

echo ""
echo "--- Liveness ---"
curl -sf "$BASE_URL/api/health/live" | python3 -m json.tool

echo ""
echo "--- Cache ---"
curl -sf "$BASE_URL/api/health/cache" | python3 -m json.tool
```

---

## 3. Provisioning Failure Recovery

### 3.1 Check Provisioning Job Status

```sql
-- Find all provisioning jobs
SELECT id, tenant_id, status, started_at, completed_at, error_message
FROM public.provisioning_jobs
ORDER BY started_at DESC;

-- Find failed steps for a specific job
SELECT step_code, step_name, sequence_no, status, error_message, started_at, completed_at
FROM public.provisioning_steps
WHERE job_id = '{job_id}' AND status = 'failed'
ORDER BY sequence_no;
```

### 3.2 Retry via Admin API

```bash
# Retry a failed provisioning job (requires onboarding.retry_provisioning permission)
curl -X POST "http://localhost:3000/api/provisioning/jobs/{job_id}/retry" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json"
```

### 3.3 Manual Recovery Steps

If automated retry fails:

1. **Identify the failed step** from `public.provisioning_steps` table
2. **Check the error message** for root cause (DB constraint, missing data, timeout)
3. **Fix the root cause** (e.g., missing seed data, schema issue)
4. **Mark the failed step as pending** for retry:
   ```sql
   UPDATE public.provisioning_steps
   SET status = 'pending', error_message = NULL
   WHERE job_id = '{job_id}' AND step_code = '{failed_step_code}';
   ```
5. **Trigger retry** via the admin API
6. **Monitor** via `pm2 logs dos-backend` for progress

### 3.4 Stuck Session Recovery

The onboarding module provides a stuck session recovery action (`onboarding.admin.stuck_recovery`):

```bash
# Requires onboarding.admin permission
curl -X POST "http://localhost:3000/api/onboarding/admin/stuck-recovery" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "{session_id}"}'
```

---

## 4. Database Maintenance

### 4.1 Backup Commands

```bash
# Full database backup
pg_dump -h $PG_HOST -p $PG_PORT -U $PG_USER -d platform_db \
  -F custom -f "/opt/shahin-grc/backups/platform_db_$(date +%Y%m%d_%H%M%S).dump"

# Public schema only
pg_dump -h $PG_HOST -p $PG_PORT -U $PG_USER -d platform_db \
  -n public -F custom -f "/opt/shahin-grc/backups/public_schema_$(date +%Y%m%d).dump"

# Specific tenant schema
pg_dump -h $PG_HOST -p $PG_PORT -U $PG_USER -d platform_db \
  -n "tenant_{uuid}" -F custom -f "/opt/shahin-grc/backups/tenant_{uuid}_$(date +%Y%m%d).dump"
```

### 4.2 Migration Commands

```bash
# Run pending migrations (from backend directory)
cd /opt/shahin-grc/backend
NODE_ENV=production node dist/migrations/run-migrations.js

# Check migration status
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d platform_db \
  -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 20;"
```

### 4.3 Rollback Procedure

```bash
# Rollback tenant schema (use with caution)
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d platform_db \
  -f /opt/shahin-grc/backend/migrations/rollback/rollback_tenant.sql

# Rollback public schema (use with extreme caution)
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d platform_db \
  -f /opt/shahin-grc/backend/migrations/rollback/rollback_public.sql
```

---

## 5. Monitoring and Alerting

### 5.1 Key Metrics to Watch

| Metric | Source | Warning Threshold | Critical Threshold |
|--------|--------|-------------------|-------------------|
| Process memory (RSS) | `pm2 monit` / `/api/health` | > 1200M | > 1800M (auto-restart at 2000M) |
| Heap used | `/api/health` | > 1000M | > 1400M |
| Event loop lag | `/api/health/live` | > 200ms | > 500ms (returns 503) |
| Database latency | `/api/health/ready` | > 100ms | > 500ms |
| Redis latency | `/api/health/ready` | > 50ms | > 200ms |
| Request rate | `/api/metrics` | > 500 req/min | Rate limiter active (600 req/min) |
| Error rate | `/api/errors/summary` | > 1% of requests | > 5% of requests |
| PM2 restarts | `pm2 status` | > 3 in 1 hour | > 10 in 1 hour |

### 5.2 Prometheus Integration

The platform exposes Prometheus-format metrics at `/api/metrics/prometheus`. Configure Prometheus scrape:

```yaml
scrape_configs:
  - job_name: 'dos-backend'
    metrics_path: '/api/metrics/prometheus'
    scheme: 'http'
    static_configs:
      - targets: ['localhost:3000']
    # In production, add bearer_token or setup_token header
    authorization:
      type: Bearer
      credentials: '{METRICS_AUTH_TOKEN}'
```

### 5.3 OpenTelemetry

OpenTelemetry is enabled by default (`OTEL_ENABLED=true`). Configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_ENABLED` | `true` | Enable/disable OTEL |
| `OTEL_EXPORTER` | `otlp` | Exporter type |
| `OTEL_SERVICE_NAME` | `dos-backend` | Service name in traces |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP collector endpoint |

### 5.4 Langfuse Observability

AI agent observability via Langfuse (replaces LangSmith):

| Variable | Default | Description |
|----------|---------|-------------|
| `LANGFUSE_ENABLED` | `true` | Enable Langfuse tracing |
| `LANGFUSE_HOST` | `http://localhost:3001` | Langfuse server URL |
| `LANGFUSE_PROJECT` | `dos` | Project identifier |
| `LANGFUSE_PUBLIC_KEY` | -- | Public API key |
| `LANGFUSE_SECRET_KEY` | -- | Secret API key |

---

## 6. POC vs Pilot vs Production Differences

| Aspect | POC | Pilot | Production |
|--------|-----|-------|------------|
| PM2 instances | 1 (fork) | 2 (cluster) | 2+ (cluster) |
| Max memory restart | 1000M | 2000M | 2000M+ |
| Redis | Optional (memory fallback) | Required | Required + Sentinel/Cluster |
| Temporal | Disabled | Enabled (local) | Enabled (Temporal Cloud) |
| BullMQ | Disabled | Enabled | Enabled |
| SSL/TLS | Optional | Required | Required |
| Rate limiting | Relaxed | Standard (600/min) | Standard (600/min) |
| Auth rate limit | Relaxed | 60/min | 60/min |
| Metrics auth | None | Setup token | Bearer token |
| Health detail | Full (non-production) | Full | Minimal (status + timestamp only) |
| OTEL | Disabled | Enabled (local collector) | Enabled (production collector) |
| Langfuse | Disabled | Enabled (local) | Enabled (cloud) |
| Backups | Manual | Daily | Continuous + daily snapshots |
| Log retention | 7 days | 30 days | 90 days |
| PM2 log merge | Yes | Yes | Yes (ship to centralized logging) |

---

## 7. Emergency Procedures

### 7.1 Rollback Deployment

```bash
# 1. Stop current deployment
pm2 stop dos-backend

# 2. Switch to previous release
cd /opt/shahin-grc/backend
# If using symlink-based releases:
ln -sfn /opt/shahin-grc/releases/{previous_release} /opt/shahin-grc/backend

# 3. Restart
pm2 start ecosystem.config.js

# 4. Verify health
curl -s http://localhost:3000/api/health/ready | python3 -m json.tool
```

### 7.2 Database Restore

```bash
# 1. Stop backend
pm2 stop dos-backend

# 2. Restore from backup
pg_restore -h $PG_HOST -p $PG_PORT -U $PG_USER -d platform_db \
  --clean --if-exists \
  "/opt/shahin-grc/backups/platform_db_{timestamp}.dump"

# 3. Run any missing migrations
NODE_ENV=production node dist/migrations/run-migrations.js

# 4. Restart backend
pm2 restart dos-backend

# 5. Verify
curl -s http://localhost:3000/api/health/ready
```

### 7.3 Incident Response Checklist

1. **Detect:** Health endpoint returns non-200 or PM2 shows repeated restarts
2. **Assess severity:**
   - Database unhealthy = P0 (all services down)
   - Redis unavailable = P1 (degraded, memory fallback active)
   - Temporal unreachable = P2 (provisioning/workflows impacted)
   - AI provider unreachable = P3 (AI features degraded)
3. **Contain:** If database is the issue, stop non-critical processes to reduce load
4. **Diagnose:**
   ```bash
   pm2 logs dos-backend --lines 500 --err
   curl -s http://localhost:3000/api/health/ready | python3 -m json.tool
   curl -s http://localhost:3000/api/errors/summary -H "x-setup-token: $SETUP_TOKEN"
   ```
5. **Resolve:** Apply fix (restart service, restore DB, fix config)
6. **Verify:** Run health checks, confirm all probes return 200
7. **Document:** Record incident in audit log, update runbook if needed

### 7.4 Force Restart (Last Resort)

```bash
# Kill all PM2 processes and restart
pm2 kill
pm2 start /opt/shahin-grc/backend/ecosystem.config.js
pm2 save
```

---

*End of REF-07*
