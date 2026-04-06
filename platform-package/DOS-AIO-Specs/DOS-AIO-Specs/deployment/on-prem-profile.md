# On-Premises Deployment Profile

> Source: `platform/sdkdeployment-guideline.md` section 5
> Owner: Infrastructure / DevOps
> Prerequisite: Platform Config R0 and DB config separation complete

On-prem is a deployment profile, not a new architecture. It comes after config separation and separate DB configuration.

---

## 1. Package Contents

| Component | Description |
|-----------|-------------|
| Platform runtime bundle | Core DOS services packaged for local execution |
| Selected product bundle(s) | Product packages chosen for this deployment |
| Selected module bundle(s) | Module packages chosen for this deployment |
| Offline bootstrap scripts | Scripts to initialize the platform without internet |
| Local secrets strategy | Encrypted file, local vault, or env-var based secrets |
| Local DB profile | Connection config for locally hosted database |
| Local object storage profile | Local filesystem or S3-compatible local storage |
| Local queue/cache profile | Redis, RabbitMQ, or in-memory fallbacks |
| Observability/logging profile | Local log aggregation and monitoring config |
| Backup/restore scripts | Scheduled backup and point-in-time restore tooling |
| Upgrade scripts | In-place upgrade and migration tooling |
| Air-gapped update package format | Offline-distributable update bundles |

---

## 2. Config Fields

| Field | Values / Description |
|-------|---------------------|
| Runtime mode | `on-prem` |
| Internet required / air-gapped | `internet-required` / `air-gapped` |
| Storage mode | `local-fs` / `s3-compatible` |
| Queue/cache mode | `redis` / `rabbitmq` / `memory` |
| DB mode | `shared` / `separate` |
| Local hostname / base URLs | Hostnames and base URLs for local network |
| Cert / TLS paths | Paths to TLS certificates and keys |
| Backup retention | Retention period and rotation policy |
| Audit export location | Local path or network share for audit exports |
| AI provider mode | `local` / `remote` |

---

## 3. Deployment Actions

Execute in this order:

1. **Install infrastructure dependencies** — database, cache, queue, storage, TLS certs
2. **Load on-prem profile** — apply on-prem environment and deployment config
3. **Create secrets** — provision secrets using local secrets strategy
4. **Provision DB / storage / cache** — create databases, buckets, cache namespaces
5. **Run platform migrations** — apply platform schema migrations and seed data
6. **Run product / module migrations** — apply product and module schema migrations
7. **Bootstrap tenant / product / module activation** — activate initial tenant, products, and modules
8. **Verify offline / air-gap assumptions** — confirm no external network calls if air-gapped
9. **Register monitoring and backup jobs** — schedule observability, backup, and health checks
10. **Produce readiness report** — generate deployment verification report
