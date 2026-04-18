# Runbook: DoganOutboxDeadLetter

**Severity:** warning · **Pillar:** DAuth events · **Page:** no

## Symptom
`dogan_outbox_dead > 0` for ≥ 5m.

## Verify
```sql
select id, subject, attempts, last_error, created_at
  from platform.outbox_events where status='dead'
  order by created_at desc limit 50;
```

## Diagnose
- Subject taxonomy mismatch (Outbox built bad subject).
- NATS auth/permissions revoked.
- Payload too large.

## Mitigate
1. Triage one row, fix root cause.
2. Re-queue: `update platform.outbox_events set status='pending', attempts=0 where id=$1;`
3. Confirm relay drains.

## Resolve
`dogan_outbox_dead == 0` for 30m.
