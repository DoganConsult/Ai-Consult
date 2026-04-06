# Runbook 02 — Upgrade

## Pre-upgrade

1. Run backup: `bash scripts/backup.sh`
2. Review changelog for breaking changes
3. Verify current health: `bash scripts/smoke-test.sh`

## Upgrade steps

```bash
# 1. Stop the service
pm2 stop dos-platform  # or systemctl stop dos-platform

# 2. Pull new version
git pull origin main  # or extract new release archive

# 3. Install dependencies
cd backend && pnpm install

# 4. Run migrations
pnpm run migrate

# 5. Build
pnpm run build

# 6. Start
pm2 start dos-platform  # or systemctl start dos-platform

# 7. Verify
bash scripts/smoke-test.sh
```

## Rollback

If smoke tests fail:

```bash
bash scripts/rollback.sh <backup-timestamp>
```
