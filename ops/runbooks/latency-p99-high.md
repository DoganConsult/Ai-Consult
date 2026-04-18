# Runbook: DoganLatencyP99High

**Severity:** warning · **Pillar:** DNOC · **Page:** no

## Symptom
`dogan:http_latency:p99_5m{pillar=P,route=R} > 0.5` for ≥ 10m.

## Verify
```bash
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=topk(5, dogan:http_latency:p99_5m)' | jq .
```

## Diagnose
- pg_stat_statements: `select queryid, mean_exec_time, calls from pg_stat_statements order by mean_exec_time desc limit 10;`
- pgbouncer pool saturation: `psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c 'show pools;'`
- Downstream component slow (Keycloak, OpenFGA, LiteLLM) — see component health.

## Mitigate
1. Add index for slow queries; rerun.
2. Bump pgbouncer `default_pool_size` if saturated.
3. Restart hot pillar process if stuck.

## Resolve
p99 < 300ms sustained 30m.
