# Installation and Deployment Runbook

## 1. Purpose

This runbook describes install, bootstrap, verification, upgrade, and rollback for platform, product, and module deployments across SaaS and on-prem profiles.

---

## 2. Universal installation phases

Every installation follows this order:

1. validate release bundle
2. validate config bundle
3. provision infra dependencies
4. apply platform migrations
5. bootstrap platform
6. apply product migrations
7. bootstrap product
8. apply module migrations
9. enable selected modules
10. run verification suite
11. publish readiness report

---

## 3. SaaS install flow

### 3.1 Preconditions
- managed DB available
- managed cache available
- managed queue available
- object storage available
- secret manager configured
- domain/TLS configured
- observability sinks configured

### 3.2 Steps
1. Load environment and deployment profiles.
2. Validate platform config.
3. Run platform DB migrations.
4. Seed platform roles, permissions, and registries.
5. Start platform services.
6. Register products from product manifests.
7. Run product DB migrations.
8. Seed product defaults.
9. Enable tenant entitlement logic.
10. Register module packages and enable allowed modules.
11. Run health checks.
12. Run smoke tests.
13. Mark deployment ready.

### 3.3 Verification
- auth login works
- admin shell works
- tenant creation works
- product registry visible
- module registry visible
- selected modules reachable
- audit logs generated
- metrics emitted

---

## 4. On-prem install flow

### 4.1 Preconditions
- server(s) prepared
- OS baseline hardened
- DB installed or bundle-approved DB service available
- object storage mode selected
- cache/queue mode selected
- certificates prepared
- backup destination prepared
- offline package present if air-gapped

### 4.2 Steps
1. Unpack release bundle.
2. Load on-prem profile.
3. Install secrets locally or from approved local secret store.
4. Provision DB, storage, and cache/queue.
5. Run platform migrations.
6. Bootstrap platform.
7. Run product migrations and seed product defaults.
8. Enable approved modules.
9. Run local readiness checks.
10. Configure backup jobs.
11. Configure monitoring/log shipping.
12. Produce installation report.

### 4.3 Air-gapped notes
- no cloud-only provider should be enabled
- update packages must be importable offline
- docs and support bundle must be shipped with release
- model/provider configuration must respect offline policy

---

## 5. Module enable flow

1. Validate parent product enabled.
2. Validate module dependencies.
3. Apply module migrations.
4. Seed module permissions.
5. Seed module reference data.
6. Register routes and pages.
7. Register events/workflows/jobs.
8. Run module smoke tests.
9. Mark module enabled.

---

## 6. Module disable flow

1. Stop scheduled jobs.
2. Remove runtime routing and nav.
3. Disable UI exposure.
4. Freeze new writes if policy requires.
5. Preserve or archive data per retention policy.
6. Mark module disabled.

---

## 7. Module uninstall flow

1. Confirm retention/archive policy.
2. Remove runtime hooks.
3. Remove registry entries.
4. Remove scheduled jobs and event consumers.
5. Archive or delete data according to policy.
6. Mark module uninstalled.
7. Run removal verification.

---

## 8. Upgrade flow

1. Back up DB and critical config.
2. Validate upgrade path.
3. Apply platform upgrades first.
4. Apply product upgrades second.
5. Apply module upgrades third.
6. Run post-upgrade migrations/seeds.
7. Run regression smoke suite.
8. Publish upgrade report.

---

## 9. Rollback flow

1. Freeze writes if required.
2. Roll back application image/package.
3. Restore compatible config bundle.
4. Restore DB snapshot if migration rollback is not forward-compatible.
5. Run health checks.
6. Publish rollback report.

---

## 10. Required readiness report sections

- release version
- deployment target
- infra profile
- config profile checksum
- products enabled
- modules enabled
- DB migration versions
- health check results
- smoke test results
- backup confirmation
- rollback point confirmation
