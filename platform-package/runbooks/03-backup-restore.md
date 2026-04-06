# Runbook 03 — Backup & Restore

## Automated backup

```bash
# Create backup
bash scripts/backup.sh

# Backups stored in: /var/dos-platform/backups/<timestamp>/
# Override with: BACKUP_DIR=/path/to/backups bash scripts/backup.sh
```

## Backup contents

| File | Contents |
|------|----------|
| `dist.tar.gz` | Compiled application |
| `db.sql.gz` | Full database dump |
| `env.backup` | Environment configuration |
| `manifest.json` | Backup metadata |

## Restore

```bash
# List available backups
ls /var/dos-platform/backups/

# Restore specific backup
bash scripts/restore.sh 20260405_120000
```

## Scheduled backups

Add to crontab:

```cron
0 2 * * * BACKUP_DIR=/var/dos-platform/backups DATABASE_URL=postgresql://... /path/to/scripts/backup.sh >> /var/log/dos-backup.log 2>&1
```

## Retention policy

Recommended: Keep 7 daily + 4 weekly + 3 monthly backups. Implement with:

```bash
find /var/dos-platform/backups -maxdepth 1 -mtime +30 -exec rm -rf {} \;
```
