# Runbook 05 — Monitoring

## Prometheus metrics

Endpoint: `GET /api/metrics/prometheus`

Requires `METRICS_AUTH_TOKEN` or `SETUP_TOKEN` in production.

```bash
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" http://localhost:3010/api/metrics/prometheus
```

## Grafana dashboard

Import `ops/monitoring/grafana-dashboard.json` into Grafana.

Panels:
- Health Status (up/down)
- Request Rate (by method/status)
- P95 Latency
- Error Rate (gauge with thresholds)
- Memory Usage (RSS MB over time)
- Active DB Connections (total/idle/active)
- Tenant Count
- Redis Status

## Alert rules

Import `ops/alert-rules.yml` into Prometheus Alertmanager.

Critical alerts:
- PlatformDown (instance unreachable for 1m)
- HighErrorRate (5xx > 5% for 5m)
- DatabaseConnectionPoolExhausted (0 available for 2m)
- DiskSpaceLow (< 10% for 15m)
- TenantProvisioningFailure
- MigrationDrift

Warning alerts:
- HighLatency (P95 > 2s for 10m)
- RedisDown (1m)
- HighMemoryUsage (> 1GB for 10m)
- EventLoopLag (> 500ms for 5m)

## OpenTelemetry

Enable with:
```
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

## Log aggregation

Logs are structured JSON (pino). Pipe to any log aggregator:

```bash
node dist/server.js 2>&1 | your-log-shipper
```
