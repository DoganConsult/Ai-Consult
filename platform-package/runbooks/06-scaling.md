# Runbook 06 — Scaling

## Horizontal scaling (PM2)

```bash
# Start with multiple instances
pm2 start dist/server.js --name dos-platform -i 4

# Scale up/down
pm2 scale dos-platform 8
```

Instance 0 runs migrations and seeds. Other instances wait 15s then start serving.

## Connection pool tuning

| Env var | Default | Recommended (per instance) |
|---------|---------|---------------------------|
| `DB_POOL_MIN` | 5 | 2-5 |
| `DB_POOL_MAX` | 25 | 10-25 |
| `DB_IDLE_TIMEOUT_MS` | 30000 | 30000 |
| `DB_CONNECTION_TIMEOUT_MS` | 5000 | 5000 |

Total max connections = `DB_POOL_MAX × instance_count`. Must not exceed PostgreSQL `max_connections`.

## Redis scaling

Platform uses Redis for:
- Rate limiting counters
- Session cache
- RBAC cache

For high-availability: use Redis Sentinel or Redis Cluster.

## Database scaling

- Read replicas: configure via `DATABASE_READ_URL` (if supported)
- Connection pooling: PgBouncer recommended for > 4 instances
- Partitioning: tenant schemas provide natural isolation

## Load balancer configuration

See `ops/nginx/platform.conf`. Key settings:
- `keepalive 32` for upstream connection reuse
- Health check at `/api/health` (bypasses auth)
- Rate limit metrics endpoint to internal networks

## Capacity indicators

Monitor these for scaling decisions:
- P95 latency > 1s: scale horizontally
- DB pool utilization > 80%: increase pool or add instances
- RSS > 800MB per instance: investigate memory leaks
- Event loop lag > 200ms: reduce per-instance load
