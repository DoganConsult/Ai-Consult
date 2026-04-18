# Runbook: DoganSodBlocked

**Severity:** warning · **Pillar:** DAuth · **Page:** no

## Symptom
`rate(dogan_sod_blocked_total{tenant="T"}[15m]) > 0`.

## Verify
```sql
select user_id, rule_id, blocked_action, ts
  from platform.sod_violations
 where tenant_id = 'T' and ts > now() - interval '1 hour'
 order by ts desc limit 50;
```

## Diagnose
- Legitimate role-conflict (good — system worked).
- Misconfigured `platform.sod_rules` (false positive).

## Mitigate
1. Confirm with tenant admin whether the user should retain both roles.
2. If false positive: revise `platform.sod_rules` via DAuth API; never grant `BYPASSRLS`.

## Resolve
No new violations for 30m.
