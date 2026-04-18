# Runbook: DoganOutboxBacklog

**Severity:** warning · **Pillar:** DAuth events · **Page:** no

## Symptom
`dogan_outbox_pending > 1000` for ≥ 10m.

## Verify
```sql
select count(*), min(created_at) from platform.outbox_events where status='pending';
```

## Diagnose
- NATS down or partitioned → check `systemctl status nats` and `dogan_component_up{component="nats"}`.
- Relay stuck → check kernel logs for `outbox.relay`.
- Slow consumers → `nats consumer info DOGAN_EVENTS dogan-dauth-relay`.

## Mitigate
1. Restart kernel: `pm2 restart dogan-os`.
2. If NATS down: follow `component-down.md` for nats first.
3. If relay loop: bump `Outbox.startRelay` `batchSize`; restart.

## Resolve
`dogan_outbox_pending < 100` sustained 15m.
