# Runbook 08 — Disaster Recovery

## Recovery targets

| Metric | Target |
|--------|--------|
| RPO (Recovery Point Objective) | Last successful backup |
| RTO (Recovery Time Objective) | < 30 minutes |

## Scenarios

### Scenario A: Application server failure

1. Provision replacement server
2. Install Node.js, pnpm
3. Deploy latest build or restore from backup
4. Configure `.env`
5. Start service
6. Verify: `bash scripts/smoke-test.sh`

### Scenario B: Database failure

1. Provision replacement PostgreSQL
2. Restore from backup: `bash scripts/restore.sh <timestamp>`
3. Verify data integrity
4. Update DATABASE_URL
5. Restart platform
6. Run schema sync check

### Scenario C: Full environment loss

1. Provision infrastructure (server, DB, Redis)
2. Follow Runbook 01 (Fresh Install)
3. Restore database from backup
4. Restore `.env` from backup
5. Verify all health endpoints

### Scenario D: Data corruption

1. Identify scope of corruption
2. Stop platform
3. Restore database to last known good state
4. Run migration verification
5. Restart and verify

## Backup verification

Monthly: restore a backup to a test environment and verify:

```bash
# On test server
bash scripts/restore.sh <latest-backup>
cd backend && pnpm start &
sleep 10
bash scripts/smoke-test.sh
```

## Communication plan

1. Detect: automated alerts (Runbook 05)
2. Assess: check health endpoints, logs
3. Escalate: notify platform team
4. Recover: execute appropriate scenario above
5. Verify: smoke tests + manual verification
6. Report: document incident and recovery actions
