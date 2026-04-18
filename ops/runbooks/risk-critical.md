# Runbook: DoganRiskCritical

**Severity:** critical · **Pillar:** DAuth → DSOC · **Page:** yes

## Symptom
`increase(dogan_risk_scored_total{band="critical"}[10m]) > 0`.

## Verify
```sql
select rs.event_id, rs.score, rs.factors, ae.kind, ae.client_ip, ae.country
  from platform.dauth_risk_scores rs
  join platform.auth_events ae on ae.id = rs.event_id
 where rs.tenant_id='T' and rs.band='critical'
   and rs.ts > now() - interval '15 minutes';
```

## Diagnose
- Geo-velocity spike, new device + new country, repeat failures.
- Compare against `platform.security_alerts` for correlated entries.

## Mitigate
1. Force session revocation for affected user (`/pillars/dauth/sessions/:id/revoke`).
2. Require step-up MFA on next login.
3. If repeat: temporarily disable user in Keycloak.

## Resolve
No new critical scores in 30m and no follow-on auth failures.

## Postmortem
Always: open DSOC `security_alerts` row with severity `critical`; close only after user confirms.
