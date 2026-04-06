# DOS-AIO-Specs — Single Source of Truth

> **For any agent, team member, or reviewer: start here. This folder is the only authoritative spec container for the entire DOS / DAuth / Shahin-AI platform.**

---

## Quick Rule

**When tasked with ANY work on this platform, reference only:**

```
DOS-AIO-Specs/DOS-AIO.md
```

This is the **single entry point**. From DOS-AIO.md you can navigate to:
- Platform architecture laws (Patches 0–15)
- Module-level specs (MP-01–MP-44)
- Live codebase metrics (202 columns x 65 modules)
- Release gates, blocker tracking, and deployment readiness

**Do NOT reference any other .md file as authoritative.** All other docs are subordinate to DOS-AIO.md.

---

## Directory Structure

```
DOS-AIO-Specs/
|
|-- DOS-AIO.md                          # MASTER SPEC — start here
|-- DOS-AIO-actualcodebase.csv          # Operational registry (202 cols x 65 modules)
|-- Global-Platform-Operating-Constitution-v1.md
|-- Global-Platform-Operating-Constitution-v1.docx
|-- README.md                           # This file
|
|-- platform/                           # LAYER 1: Platform-only specs
|   |-- DEPLOYMENT_CONTRACT_V1.md       # Deployment ownership model (3-layer)
|   |-- PLATFORM_CONFIG_R0.md           # Config separation (env/deploy/product/tenant)
|   |-- REF-01-migration-audit.md       # Enterprise migration audit
|   |-- REF-02-first-tenant-provisioning.md  # 53-step provisioning contract
|   |-- REF-04-roles-responsibility-matrix.md # 5-layer RACI + SoD
|   |-- REF-06-handover-checklist.md    # Gate-based handover with sign-off
|   |-- REF-07-runtime-operations-runbook.md  # PM2, health, recovery
|   |-- REF-08-full-stack-table-consumption-spec.md  # 1,667 tables x 6 layers
|   |-- table-ownership-registry.md     # All tables mapped to owners
|   |-- config_registry_implementation_pack.md
|   |-- platform-hardening-roadmap.md
|   |-- sdkdeployment-guideline.md      # SDK deployment sequence guideline
|
|-- product/                            # LAYER 2: Product-level specs (Shahin-AI)
|   |-- REF-03-onboarding-flow.md       # 18-stage onboarding flow
|   |-- REF-05-seed-data-catalog.md     # Seed data with gap tags
|   |-- module-fullstack-audit.csv      # 47-module fullstack wiring audit
|
|-- modules/                            # LAYER 3: Per-module end-to-end specs (44 modules)
|   |-- module-spec-compliance-ranking.csv  # Spec compliance ranking
|   |-- MP-01-onboarding.md  through  MP-44-widgets.md
|
|-- deployment/                         # LAYER 4: Deployment profiles
    |-- on-prem-profile.md              # On-premises deployment guide
    |-- saas-profile.md                 # SaaS/cloud deployment guide
    |-- sdk-contract.md                 # SDK release contract & rules
```

---

## Layer Model

The directory structure follows the **3-layer deployment contract** defined in `platform/DEPLOYMENT_CONTRACT_V1.md`:

| Layer | Directory | Scope | Removable? |
|-------|-----------|-------|------------|
| **Platform** | `platform/` | DOS + DAuth core — identity, tenancy, RBAC, audit, workflow engine, AI runtime, admin | No (it IS the core) |
| **Product** | `product/` | Shahin-AI — first flagship product on the reusable core | Yes — platform continues |
| **Module** | `modules/` | 44 vertical slices — governance, risk, compliance, etc. | Yes — product + platform continue |
| **Deployment** | `deployment/` | On-prem, SaaS, SDK profiles — deployment targets, not architecture | N/A — profiles, not code |

---

## Module Patch Inventory (44 specs)

| MP | Module | File |
|----|--------|------|
| 01 | Onboarding | [`modules/MP-01-onboarding.md`](modules/MP-01-onboarding.md) |
| 02 | Workflow | [`modules/MP-02-workflow.md`](modules/MP-02-workflow.md) |
| 03 | AI | [`modules/MP-03-ai.md`](modules/MP-03-ai.md) |
| 04 | Governance | [`modules/MP-04-governance.md`](modules/MP-04-governance.md) |
| 05 | Risk | [`modules/MP-05-risk.md`](modules/MP-05-risk.md) |
| 06 | Compliance | [`modules/MP-06-compliance.md`](modules/MP-06-compliance.md) |
| 07 | Policy | [`modules/MP-07-policy.md`](modules/MP-07-policy.md) |
| 08 | Audit | [`modules/MP-08-audit.md`](modules/MP-08-audit.md) |
| 09 | Evidence | [`modules/MP-09-evidence.md`](modules/MP-09-evidence.md) |
| 10 | Vendor | [`modules/MP-10-vendor.md`](modules/MP-10-vendor.md) |
| 11 | Reporting | [`modules/MP-11-reporting.md`](modules/MP-11-reporting.md) |
| 12 | Analytics | [`modules/MP-12-analytics.md`](modules/MP-12-analytics.md) |
| 13 | Incident | [`modules/MP-13-incident.md`](modules/MP-13-incident.md) |
| 14 | Controls | [`modules/MP-14-controls.md`](modules/MP-14-controls.md) |
| 15 | Exception | [`modules/MP-15-exception.md`](modules/MP-15-exception.md) |
| 16 | Remediation | [`modules/MP-16-remediation.md`](modules/MP-16-remediation.md) |
| 17 | Action | [`modules/MP-17-action.md`](modules/MP-17-action.md) |
| 18 | Admin | [`modules/MP-18-admin.md`](modules/MP-18-admin.md) |
| 19 | AGRC Engine | [`modules/MP-19-agrc-engine.md`](modules/MP-19-agrc-engine.md) |
| 20 | AI Governance | [`modules/MP-20-ai-governance.md`](modules/MP-20-ai-governance.md) |
| 21 | Asset | [`modules/MP-21-asset.md`](modules/MP-21-asset.md) |
| 22 | BCP | [`modules/MP-22-bcp.md`](modules/MP-22-bcp.md) |
| 23 | Bootstrap | [`modules/MP-23-bootstrap.md`](modules/MP-23-bootstrap.md) |
| 24 | Dashboard | [`modules/MP-24-dashboard.md`](modules/MP-24-dashboard.md) |
| 25 | DORA | [`modules/MP-25-dora.md`](modules/MP-25-dora.md) |
| 26 | Governance AI | [`modules/MP-26-governance-ai.md`](modules/MP-26-governance-ai.md) |
| 27 | Governance OS | [`modules/MP-27-governance-os.md`](modules/MP-27-governance-os.md) |
| 28 | Integrations | [`modules/MP-28-integrations.md`](modules/MP-28-integrations.md) |
| 29 | Inbox | [`modules/MP-29-inbox.md`](modules/MP-29-inbox.md) |
| 30 | Issues | [`modules/MP-30-issues.md`](modules/MP-30-issues.md) |
| 31 | Journey | [`modules/MP-31-journey.md`](modules/MP-31-journey.md) |
| 32 | KSA Regulatory | [`modules/MP-32-ksa-regulatory.md`](modules/MP-32-ksa-regulatory.md) |
| 33 | Local Knowledge | [`modules/MP-33-local-knowledge.md`](modules/MP-33-local-knowledge.md) |
| 34 | Navigation | [`modules/MP-34-navigation.md`](modules/MP-34-navigation.md) |
| 35 | Notification | [`modules/MP-35-notification.md`](modules/MP-35-notification.md) |
| 36 | Packs | [`modules/MP-36-packs.md`](modules/MP-36-packs.md) |
| 37 | Portals | [`modules/MP-37-portals.md`](modules/MP-37-portals.md) |
| 38 | Privacy | [`modules/MP-38-privacy.md`](modules/MP-38-privacy.md) |
| 39 | Proactive Leadership | [`modules/MP-39-proactive-leadership.md`](modules/MP-39-proactive-leadership.md) |
| 40 | Provisioning | [`modules/MP-40-provisioning.md`](modules/MP-40-provisioning.md) |
| 41 | Qiyas | [`modules/MP-41-qiyas.md`](modules/MP-41-qiyas.md) |
| 42 | Records | [`modules/MP-42-records.md`](modules/MP-42-records.md) |
| 43 | Training | [`modules/MP-43-training.md`](modules/MP-43-training.md) |
| 44 | Widgets | [`modules/MP-44-widgets.md`](modules/MP-44-widgets.md) |

---

## Authority Rules

1. **DOS-AIO.md is the single source of truth.** All module patches, CSV data, and team instructions derive from it.
2. **Module patches (MP-01–MP-44) are subordinate to Patch 0.** They must not override DOS ownership, DAuth ownership, product manifest laws, workflow laws, or UI stack laws.
3. **DOS-AIO-actualcodebase.csv is the operational truth.** It maps every spec expectation to what actually exists in the codebase.
4. **DEPLOYMENT_CONTRACT_V1.md governs deployment separation.** Platform / Product / Module boundaries must be respected in all deployment work.
5. **PLATFORM_CONFIG_R0.md governs config separation.** Environment / Deployment / Product / Tenant config must not be mixed.

---

## Agent / Team Onboarding

When giving context to any AI agent or team member, use this single reference:

```
@DOS-AIO-Specs/DOS-AIO.md
```

From this file, the agent can:
- Read the 15 Architecture Laws (Patch 0 S4)
- Understand the 5-Layer Ownership Model (S5)
- Find the module they need to work on (Module-to-Spec Map)
- Navigate to the relevant module patch file in `modules/`
- Check the operational registry for current implementation state
- Understand gap taxonomy, acceptance criteria, and fail conditions

**Never give an agent a module patch file without also giving them DOS-AIO.md.** The module patch inherits all rules from Patch 0 and the stack patches.

---

## Coverage Summary

| Category | Count | Status |
|----------|-------|--------|
| Platform patches (0–15) | 16 | Inline in DOS-AIO.md |
| Module patches (MP-01–MP-44) | 44 | In `modules/` directory |
| Platform reference docs (REF-*) | 8 | In `platform/` directory |
| Product reference docs | 3 | In `product/` directory |
| Deployment profiles | 3 | In `deployment/` directory |
| Deployment contract | 1 | `platform/DEPLOYMENT_CONTRACT_V1.md` |
| Config separation spec | 1 | `platform/PLATFORM_CONFIG_R0.md` |
| Codebase surfaces covered | 47/47 | 100% at PRODUCTION |
| Operational registry columns | 202 | All code-derived |
