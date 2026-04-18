# AI Consult Workspace — Enterprise Hardening Report

**Host:** single VM `9v5rfdsb.vm` (Ubuntu, Linux 5.15)
**Date:** 2026-04-18
**Scope:** repo `/root/Ai-Consult-Microservices` + native services on the host
**Goal stated by user:** "enterprise production-grade, native only, no docker, no cloud, all linked to PostgreSQL 18, with a gateway router"

---

## 1. Honest Verdict

This stack is now **production-shaped on a single host**. It is **not** multi-host
HA / multi-region DR / regulated-tier-compliant in absolute terms. To reach
enterprise-grade in the strictest sense (tier-3 / SOC 2 Type II / ISO 27001
production posture) the items in §6 must be done; they require a second host
and/or off-site infrastructure that does not exist on this VM.

What was achieved on this single host is the **maximum responsible footprint**
for one machine: every component is installed natively, bound to loopback,
sandboxed by systemd, and proxied through a single gateway.

---

## 2. What Is Now Running (native, no docker, no cloud)

All ports below are loopback-only unless marked otherwise.

| Service                | Port           | Unit                       | Notes |
|------------------------|----------------|----------------------------|-------|
| PostgreSQL 18.3 master | 5432           | `postgresql@18-main`       | SSL on, scram-sha-256, pgaudit, pg_stat_statements, pgvector, age, postgis, timescaledb, pg_cron, pg_partman, pg_repack, http, pgcrypto, uuid-ossp |
| PostgreSQL 14 legacy   | 5433           | `postgresql@14-main`       | Untouched (doganconsult, dos_platform) |
| pgBouncer              | 6432           | `pgbouncer`                | scram-sha-256, transaction pool |
| Redis                  | 6379           | `redis-server`             | Loopback |
| ClickHouse             | 8123 / 9000    | `clickhouse-server`        | Native + HTTP |
| MinIO (S3, **TLS**)    | 9100 / 9101    | `minio`                    | Self-signed cert under `/etc/minio/certs` |
| OpenFGA                | 8080 / 8081    | `openfga`                  | PG18-backed |
| Temporal               | 7233 / 7243    | `temporal`                 | PG18 + visibility schema |
| OpenTelemetry Collector| 4317 / 4318 / 9464 | `otelcol`              | OTLP in → Prom + debug out |
| LiteLLM Proxy          | 4000           | `litellm`                  | Anthropic + Ollama models |
| Ollama                 | 11434          | `ollama`                   | Local LLM |
| Prometheus             | 9090           | `prometheus`               | 30d retention |
| Alertmanager           | 9093 / 9094    | `alertmanager`             | localhost only |
| node_exporter          | 9110           | `node_exporter`            | (9100 was taken by MinIO) |
| postgres_exporter      | 9187           | `postgres_exporter`        | Role `pgexporter` w/ pg_monitor |
| redis_exporter         | 9121           | `redis_exporter`           |  |
| Grafana                | 3001           | `grafana-server`           | (3000 was the backend default) |
| **Caddy gateway**      | **8088**       | `caddy`                    | The single entry; HTTP only on loopback |
| dogan-consult-backend  | 3099 (PORT)    | (run via npm/PM2)          | Boots cleanly now (see §3) |

Public ports (22 SSH; 8001/8002/8003/8004/8005 nginx vhosts already
existing on this host) were left untouched and are out of scope.

---

## 3. Repo-Side Fixes That Were Required

| Fix | File | What changed |
|-----|------|--------------|
| Backend boot crash | `dogan-consult-backend/src/index.js` | Removed 10 broken imports (consultations, contacts, agent, inboxPoller, sbg/*); kept only `health`, `chat`, `lab/products`, `graph`, `mailbox`; added `dotenv/config`, 404 + global error handlers; `app.listen('127.0.0.1', PORT)` |
| Auth on M365 routes | `dogan-consult-backend/src/middleware/requireBearer.js` (new) | Bearer-token check against `BACKEND_API_TOKENS`; mounted on `/api/graph` and `/api/mailbox` |
| Secret hygiene | every `.env` in workspace | `chmod 600`, `chown root:root`; per-project `.gitignore` covers `.env*`; repo-root `.gitignore` enforces `*.env` |
| CI | `.github/workflows/ci.yml` (new) | Lint + build matrix for backend, ai-consult-react, sbg, three Angular apps; gitleaks scan |

---

## 4. Host Hardening Done

- **systemd sandbox** drop-ins on every native service we installed:
  `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome`,
  `ProtectKernel*`, `RestrictAddressFamilies`, `RestrictRealtime`,
  `RestrictSUIDSGID`, `LockPersonality`, `SystemCallArchitectures=native`,
  cleared capability bounding sets, explicit `ReadWritePaths` allowlists.
- **PostgreSQL 18**: SSL on (self-signed at `/etc/postgresql/18/main/ssl/`),
  hba rewritten to scram-sha-256 + reject-all default,
  `shared_buffers=512MB`, `effective_cache_size=2GB`, `work_mem=16MB`,
  `wal_compression=on`, `max_wal_size=2GB`, `track_io_timing=on`,
  full audit logging (`log_connections`, `log_disconnections`,
  `log_lock_waits`, `log_temp_files=10MB`, `log_checkpoints`,
  `log_min_duration_statement=500`, line prefix with pid+user+db+remote).
- **pgaudit**: `pgaudit.log = 'ddl,role,write'`, `log_relation = on`,
  `log_statement_once = on`. Extension created in `dogan_master`.
- **logrotate**: policy at `/etc/logrotate.d/dogan-ai-os` for postgres,
  pgbackrest, caddy, grafana logs (daily/weekly + compression).
- **Caddy gateway**: bound to `127.0.0.1:8088`, `auto_https off`,
  `admin off`. Single entry exposes:
  `/ai/*` → LiteLLM, `/authz/*` → OpenFGA, `/temporal/*` → Temporal HTTP,
  `/analytics/*` → ClickHouse, `/s3/*` → MinIO, `/s3-console/*` → MinIO console,
  `/metrics` → OTel Prom exporter, `/otlp/*` → OTel HTTP, `/llm-local/*` → Ollama,
  `/grafana/*` → Grafana, `/metrics-prom/*` → Prometheus, `/alerts/*` → Alertmanager,
  `/gateway/health`, `/pg/info`.
- **UFW** policy is staged (default deny in, allow out, plus 22/80/443/8001/8002/8004)
  but `ufw enable` was **not** executed to avoid SSH lockout. Run:
  `ufw enable` after confirming SSH is in the allow list.

---

## 5. Backups & DR (single-host)

- **pgBackRest 2.58** stanza `dogan_master`, **two repos**:
  - `repo1` = local filesystem `/var/lib/pgbackrest`
  - `repo2` = MinIO S3 over **HTTPS** at `https://127.0.0.1:9100` (CA pinned to
    `/etc/minio/certs/public.crt`)
- First full backup taken on both repos (76.9 MB DB → 8.6 MB compressed each).
- **Restore drill executed and passed** against repo1 into `/var/lib/pgbackrest-restore-drill`
  (then cleaned).
- Cron schedule (`/etc/cron.d/pgbackrest-dogan_master`):
  `Sun 02:00` full, `Mon-Sat 02:00` incremental, runs against both repos.

---

## 6. What Is Still NOT Enterprise-Grade (and why)

These are real gaps. Each requires resources this single VM cannot provide:

| Gap | Why it matters | What it needs |
|-----|----------------|---------------|
| No HA replicas (PG / Redis / ClickHouse / OpenFGA / Temporal) | Single host = single point of failure; any maintenance window = downtime | A second host + streaming replication / Sentinel / ClickHouse Keeper / Temporal cluster |
| No off-site / off-host backup repo | Disk/host loss = data loss. repo1 is on the same FS; repo2 is on the same MinIO process on the same host | A second machine or a real S3 bucket on different infrastructure |
| No real KMS / secret manager | Secrets live in plaintext `.env` files (now chmod 600 + .gitignored, but still on disk) | Vault / AWS-KMS / GCP-KMS / age-encrypted secrets pulled at boot |
| No mTLS between services | Localhost-only is the current security boundary. The day anything binds publicly, intra-service traffic is plaintext | SPIFFE/SPIRE or Caddy-issued internal CA + per-service client certs |
| No external auth at the gateway | Caddy `:8088` proxies anything that can connect locally. M365 routes have bearer auth; nothing else does | OpenFGA + JWT validation in Caddy `forward_auth`, or a real IdP (Keycloak/Azure AD) |
| No formal CI gate yet executed | The workflow is committed but never ran (no GitHub Actions push from this host) | Push the repo and observe a green build; add required-check protection |
| No SBOM / SCA / image signing | Supply-chain attestation required for compliance | syft + grype + cosign / sigstore |
| No DAST / pentest evidence | Security validation is theoretical | OWASP ZAP run against the gateway + one external pentest |
| No DPA / DPIA / data classification | Personal data flows through MS Graph mailbox + Anthropic | Documented data inventory + processor agreements |
| No paging / on-call | Alertmanager has only the `default` receiver | Slack/PagerDuty/Opsgenie webhook |
| Self-signed certs | OK on loopback, not for any external endpoint | Internal ACME (Caddy can do this) or real CA |
| Langfuse v3 / TEI / pgvectorscale / pgmq | LLM observability + advanced vector index + native queues are deferred | Documented in `/etc/dogan-ai-os/DEFERRED.md`; build path included there |

---

## 7. Validation Snapshot

```
prometheus active   alertmanager active   node_exporter active
postgres_exporter active   redis_exporter active   grafana-server active
caddy active   minio active (TLS)   pgbouncer active
postgresql@18-main active   postgresql@14-main active
openfga active   temporal active   litellm active   otelcol active
pgbackrest stanza: status: ok   repo1: ok   repo2: ok
restore drill: PASSED
prom targets up: prometheus, node, postgres, redis, otelcol, temporal
```

---

## 8. Operator Runbook (minimum)

```bash
# health
systemctl status postgresql@18-main pgbouncer redis-server minio openfga temporal litellm caddy prometheus grafana-server
curl -s http://127.0.0.1:8088/gateway/health
sudo -u postgres pgbackrest --stanza=dogan_master info

# backups
sudo -u postgres pgbackrest --stanza=dogan_master --type=full backup
sudo -u postgres pgbackrest --stanza=dogan_master --type=incr backup

# observability UIs (via gateway, all loopback)
http://127.0.0.1:8088/grafana/        # admin/admin first login → change
http://127.0.0.1:8088/metrics-prom/   # Prometheus
http://127.0.0.1:8088/alerts/         # Alertmanager
http://127.0.0.1:8088/s3-console/     # MinIO console (https-backed)

# secrets
/etc/dogan-ai-os/backend-api-tokens.txt   # bearer tokens for /api/graph and /api/mailbox
/etc/dogan-ai-os/DEFERRED.md              # what was intentionally postponed
```
