# Runbook: DoganAuthFailureBurst

**Severity:** warning · **Pillar:** DAuth → DSOC · **Page:** no

## Symptom
`rate(dogan_auth_failure_total{tenant="T"}[5m]) > 10` for ≥ 5m.

## Verify
```sql
select kind, count(*) from platform.auth_events
 where tenant_id = 'T' and ts > now() - interval '15 minutes'
 group by kind order by 2 desc;
```

## Diagnose
- Credential stuffing? Check distinct `client_ip` count.
- Misconfigured client? Same `request_id` prefix repeating.
- Locked-out user? Cross-reference `dauth_risk_scores` for that tenant.

## Mitigate
1. Notify tenant admin via DSOC console.
2. If stuffing: enable rate-limit at Caddy (`@hot` zone already 100r/m).
3. If single user: temporarily disable in Keycloak via `tools/dauth/bootstrap-keycloak.mjs --disable-user`.

## Resolve
Failure rate < 10/5m sustained 15m.

## Postmortem
File DSOC alert with `security_alerts.category='auth.failure_burst'` if confirmed attack.
