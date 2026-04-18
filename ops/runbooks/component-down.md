# Runbook: DoganComponentDown

**Severity:** critical · **Pillar:** DNOC · **Page:** yes

## Symptom
`dogan_component_up{component="X"} == 0` for ≥ 2m. `/kernel/ready` returns 503.

## Verify
```bash
curl -fsS http://127.0.0.1:3100/kernel/ready | jq .
systemctl status <component>
journalctl -u <component> -n 200 --no-pager
```

## Diagnose
| Component | Service | Port | First check |
|---|---|---|---|
| postgres | postgresql@18-main | 5432 | `pg_isready -p 5432` |
| nats | nats | 4222 | `systemctl is-active nats` |
| keycloak | keycloak | 8090 | `curl http://127.0.0.1:8090/realms/dogan` |
| openfga | openfga | 8080 | `curl http://127.0.0.1:8080/healthz` |
| temporal | temporal | 7233 | `nc -z 127.0.0.1 7233` |
| redis | valkey | 6379 | `redis-cli ping` |
| litellm | litellm | 4000 | `curl http://127.0.0.1:4000/health/liveliness` |

## Mitigate
1. `systemctl restart <component>`
2. If restart fails, check disk (`df -h`), memory (`free -h`), and dependent services.
3. If postgres: confirm `pgbouncer` is up; check `pg_stat_activity` for runaway queries.
4. If keycloak: check that `dogan-secrets.service` decrypted secrets at boot.

## Resolve
- `/kernel/ready` returns 200; gauge `dogan_component_up{component="X"}` returns 1.
- Alert auto-resolves; Alertmanager sends `[RESOLVED]` to ops-default.

## Postmortem
Open ticket in DSOC if outage > 5m. Attach `journalctl -u <component>` + `/kernel/ready` history.
