# Release Readiness Checklists

## 1. Platform release checklist

### Architecture
- [ ] platform package contains no product-specific hardcoding
- [ ] manifests validated
- [ ] platform services run without Shahin/product assumptions

### Config
- [ ] environment config validated
- [ ] deployment config validated
- [ ] no tenant settings embedded in runtime secrets

### Database
- [ ] platform migrations pass from zero
- [ ] upgrade path tested
- [ ] rollback path documented

### Runtime
- [ ] health checks pass
- [ ] metrics/logging enabled
- [ ] audit events emitted
- [ ] admin shell works

### Security
- [ ] secrets externalized
- [ ] role/permission baseline seeded
- [ ] no workspace catch-all permission misuse

---

## 2. Product release checklist

- [ ] product manifest validated
- [ ] product defaults documented
- [ ] product routes/pages register cleanly
- [ ] product migrations pass
- [ ] product AI assets register through product boundary only
- [ ] product removal does not break platform

---

## 3. Module release checklist

- [ ] module manifest validated
- [ ] module dependencies declared
- [ ] module routes/pages register cleanly
- [ ] module permissions seeded
- [ ] module migrations pass
- [ ] module jobs/events/workflows register cleanly
- [ ] enable/disable/uninstall tested
- [ ] removal does not break unrelated modules

---

## 4. SaaS go-live checklist

- [ ] cloud infra ready
- [ ] multitenant config verified
- [ ] tenant provisioning tested
- [ ] entitlements tested
- [ ] billing/usage hooks tested
- [ ] tenant isolation verified

---

## 5. On-prem go-live checklist

- [ ] installer bundle complete
- [ ] offline package complete if required
- [ ] local secrets strategy approved
- [ ] backup/restore tested
- [ ] upgrade package tested
- [ ] local health/readiness runbook delivered

---

## 6. SDK release checklist

- [ ] API contracts frozen
- [ ] auth flow frozen
- [ ] endpoint conventions frozen
- [ ] schemas versioned
- [ ] compatibility matrix published
- [ ] examples verified
