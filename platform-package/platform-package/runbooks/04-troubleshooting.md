# Runbook 04 — Troubleshooting

## Health check endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Basic health, uptime, memory |
| `GET /api/health/live` | Liveness probe (event loop lag) |
| `GET /api/health/ready` | Readiness probe (DB, Redis, Temporal) |
| `GET /api/metrics` | Request metrics snapshot |
| `GET /api/health/memory-trend` | Memory usage trend |

## Common issues

### Server won't start

1. Check `.env` file exists: `ls backend/.env`
2. Verify DATABASE_URL: `psql $DATABASE_URL -c "SELECT 1"`
3. Check port availability: `lsof -i :3010`
4. Review logs: `tail -100 /var/log/dos-platform.log`

### Database connection failures

1. Verify PostgreSQL is running: `pg_isready`
2. Check connection string in `.env`
3. Verify SSL settings match server config
4. Check connection pool limits: `DB_POOL_MAX` env var

### Redis unavailable

Platform degrades gracefully without Redis (in-memory fallback). To restore:

1. Check Redis: `redis-cli ping`
2. Verify REDIS_URL in `.env`
3. Restart platform — Redis reconnects automatically

### High memory usage

1. Check `/api/health/memory-trend`
2. If RSS > 1GB: restart the process
3. Check for memory leaks: enable `--inspect` flag
4. Review event loop lag via `/api/health/live`

### Migration failures

1. Check migration status: `pnpm run migrate -- --status`
2. Review failed migration SQL
3. Fix and re-run: `pnpm run migrate`
4. For stuck migrations: check `migrations_applied` table

### 503 on readiness probe

Indicates DB or infrastructure not ready:

1. Check database connectivity
2. Check Redis connectivity
3. Check Temporal (if enabled)
4. Wait for startup sequence to complete
