# SaaS Deployment Profile

> Source: `platform/sdkdeployment-guideline.md` section 6
> Owner: Platform / Cloud Infrastructure
> Prerequisite: Tenant config, product config, and deployment config separation complete

SaaS is the cloud/shared deployment profile.

---

## 1. Package Contents

| Component | Description |
|-----------|-------------|
| Platform services | Core DOS services deployed as cloud workloads |
| Multitenant product registry | Registry managing product activations across tenants |
| Tenant config service | Service managing per-tenant configuration |
| Module activation service | Service managing module entitlements per tenant |
| Cloud secrets manager integration | Integration with AWS Secrets Manager, Azure Key Vault, etc. |
| Managed storage/cache/queue adapters | Adapters for cloud-managed S3, Redis, SQS/SNS, etc. |
| Billing/subscription hooks | Usage metering and subscription lifecycle hooks |
| Tenant provisioning pipeline | Automated pipeline for tenant creation and teardown |
| Audit/monitoring/export pipeline | Centralized audit log collection, monitoring, and export |

---

## 2. Config Fields

| Field | Values / Description |
|-------|---------------------|
| Runtime mode | `cloud` / `saas` |
| Multitenant enabled | `true` |
| Region / base URL | Cloud region and public base URL |
| Managed DB endpoint | Cloud-managed database connection |
| Managed storage endpoint | Cloud object storage endpoint |
| Managed cache endpoint | Cloud-managed cache endpoint |
| Tenancy isolation policy | Schema-level, row-level, or database-level isolation |
| Product entitlements | Which products each tenant may activate |
| Module entitlements | Which modules each tenant may activate |
| Outbound integration rules | Allowed external integrations and webhook targets |
| Rate limits | Per-tenant and per-endpoint rate limits |
| Observability sinks | Log, metric, and trace export destinations |

---

## 3. Deployment Actions

Execute in this order:

1. **Provision cloud infra** — databases, storage, cache, queues, networking, TLS
2. **Load SaaS env and deployment profiles** — apply cloud environment and deployment config
3. **Migrate platform schema** — apply platform schema migrations and seed data
4. **Provision tenant config service** — deploy and configure the tenant config service
5. **Provision product / module registries** — deploy product and module activation registries
6. **Activate tenant entitlements** — configure tenant-level product and module access
7. **Register platform and product health checks** — expose readiness and liveness endpoints
8. **Enable billing / usage metering** — activate subscription and usage tracking hooks
9. **Verify tenant isolation** — confirm tenancy isolation policy is enforced end-to-end
