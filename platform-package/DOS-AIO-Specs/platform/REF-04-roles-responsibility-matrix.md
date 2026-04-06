# REF-04 -- Roles and Responsibility Matrix

> **Platform:** Dogan-AI-OS (DOS) / Shahin-AI AGRC
> **Generated from:** `CLAUDE.md` ownership boundaries, `onboarding.security.ts` role/permission/action definitions
> **Date:** 2026-04-05

---

## 1. Five-Layer Ownership Model

The AGRC-OS platform enforces a strict five-layer ownership model (AGENTS.md Patch 0, Law 2). Every cross-cutting concern has exactly one canonical owner.

| Layer | Owner | Owns |
|-------|-------|------|
| **DOS** (Platform OS) | Platform team | Tenancy, org/foundation structure, platform lifecycle, product/module enablement, settings/config, shared events, shared UI shell, provisioning, observability |
| **DAuth** (Dogan-Auth) | Auth team | Identity, sessions, MFA, tokens, actor registry, memberships, access profiles, functional roles, permissions, authorities, scope resolution, delegation, SoD, lifecycle auth, access snapshot, auth middleware, authz audit |
| **Product layer** | Product owners | Product modules, actions, approval rules, dashboards, role display metadata, onboarding presets, agent behaviors |
| **Module layer** | Module leads | Module manifest, domain model, APIs, events, lifecycle definitions, UX, registration metadata |
| **AI/Agent layer** | AI team | Agent registry, agent runtime, acting-on-behalf-of chains, tool orchestration |

**Boundary rules:**
- Auth truth is never invented by the frontend (Law 4)
- Products must be removable without breaking DOS or DAuth (Law 15)
- Permissions, roles, actions, approval rules come from canonical registries or typed module registration contracts (Law 3)
- Scope resolves from DOS structure and ownership models, not fake workspace shortcuts (Law 6)

---

## 2. Platform Roles (DAuth-Managed)

Platform roles are seeded during provisioning step 21 (`create_default_roles`) and step 46 (`seed_enterprise_roles`). DAuth is the single canonical owner.

| Role Code | Role Name | Layer | Description | Key Permissions |
|-----------|-----------|-------|-------------|-----------------|
| `platform.super_admin` | Platform Super Admin | DOS | Full platform administration | All platform permissions |
| `platform.tenant_admin` | Tenant Admin | DOS | Tenant-level administration | Tenant config, user management, module enablement |
| `platform.support` | Platform Support | DOS | Operational support | Read-only diagnostics, health checks, log access |
| `dauth.identity_admin` | Identity Admin | DAuth | Manages identities and sessions | Actor CRUD, session management, MFA config |
| `dauth.access_admin` | Access Admin | DAuth | Manages access profiles and roles | Role assignment, permission grants, scope resolution |
| `dauth.delegation_admin` | Delegation Admin | DAuth | Manages delegation chains | Delegation create/revoke, acting-on-behalf-of |
| `dauth.auditor` | Auth Auditor | DAuth | Reviews auth audit trail | Read-only auth audit, access snapshot review |
| `product.owner` | Product Owner | Product | Manages product configuration | Product settings, module entitlements, approval rules |
| `module.lead` | Module Lead | Module | Leads a specific module | Module config, role assignment within module scope |
| `ai.agent_admin` | Agent Admin | AI/Agent | Manages AI agent registry | Agent registration, tool orchestration, guardrails |

---

## 3. Module-Level Roles (Onboarding Module)

Extracted from `backend/src/modules/onboarding/security/onboarding.security.ts`. The onboarding module defines **8 roles**, **10 permissions**, and **8 actions**.

### 3.1 Onboarding Roles

| Role Code | Archetype | Name | Authority Level | Scope | Permissions |
|-----------|-----------|------|-----------------|-------|-------------|
| `onboarding.executive_owner` | executive_owner | Onboarding Executive Owner | required | org | record.read, record.write, record.approve, manage, admin, approve, provision, retry_provisioning, record.export |
| `onboarding.module_lead` | module_lead | Onboarding Module Lead | required | department | record.read, record.write, record.approve, manage, admin, approve, provision, record.export |
| `onboarding.approver` | approver | Onboarding Approver | required | own | record.read, record.approve, approve |
| `onboarding.operator` | operator | Onboarding Operator | recommended | own | record.read, record.write, provision, retry_provisioning |
| `onboarding.contributor` | contributor | Onboarding Contributor | optional | own | record.read, record.write |
| `onboarding.reviewer` | reviewer | Onboarding Reviewer | optional | own | record.read, record.export |
| `onboarding.auditor` | auditor | Onboarding Auditor | optional | own | record.read, record.export |
| `onboarding.viewer` | viewer | Onboarding Viewer (default) | optional | own | record.read |

### 3.2 Onboarding Permissions

| Permission Code | Resource | Action | Sensitive | Description |
|-----------------|----------|--------|-----------|-------------|
| `onboarding.record.read` | record | read | No | View onboarding records |
| `onboarding.record.write` | record | write | No | Create/edit onboarding records |
| `onboarding.record.delete` | record | delete | Yes | Delete onboarding records |
| `onboarding.record.approve` | record | approve | Yes | Approve onboarding records |
| `onboarding.manage` | module | manage | Yes | Manage onboarding settings |
| `onboarding.record.export` | record | export | No | Export onboarding data |
| `onboarding.admin` | module | manage | Yes | Administer onboarding module (stuck sessions, diagnostics, retry) |
| `onboarding.approve` | record | approve | Yes | Approve onboarding session for provisioning |
| `onboarding.provision` | record | manage | Yes | Start workspace provisioning from approved session |
| `onboarding.retry_provisioning` | record | manage | Yes | Retry failed provisioning job |

### 3.3 SoD (Separation of Duties) Rules

| Action | SoD Sensitive | AI Blocked | Danger Level | Requires Approval |
|--------|---------------|------------|--------------|-------------------|
| `onboarding.review.approve` | Yes | Yes (blocked) | moderate | Yes |
| `onboarding.provisioning.start` | No | Yes (blocked) | moderate | No |
| `onboarding.provisioning.cancel` | No | No | destructive | No |
| `onboarding.provisioning.retry` | No | No | moderate | No |
| `onboarding.admin.stuck_recovery` | No | No | moderate | No |

Key SoD constraint: The **approver** role cannot also hold the **operator** role for the same onboarding session. Approval actions (`onboarding.review.approve`) are SoD-sensitive and AI-blocked, meaning no agent may execute them autonomously.

---

## 4. RACI Matrix for Provisioning

The 53-step provisioning pipeline (see REF-02) involves multiple layers. This RACI matrix covers the major provisioning phases.

| Activity | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| Onboarding session creation | Onboarding Contributor | Onboarding Module Lead | -- | Onboarding Viewer |
| Onboarding review/approval | Onboarding Approver | Onboarding Executive Owner | Module Lead | Contributor, Viewer |
| Tenant master creation (step 1) | DOS Provisioning Engine | Platform Super Admin | -- | Tenant Admin |
| DAuth actor/membership (steps 2-4) | DAuth Identity Service | DAuth Access Admin | -- | Platform Support |
| Schema allocation + migrations (steps 5-7) | DOS Provisioning Engine | Platform Super Admin | -- | Tenant Admin |
| Seed workspace defaults (steps 8-9) | DOS Provisioning Engine | Product Owner | Module Lead | -- |
| Seed AGRC product data (steps 10-20) | Product Provisioning | Product Owner | Module Leads | Tenant Admin |
| Create default roles (step 21) | DAuth Role Service | DAuth Access Admin | Product Owner | Module Lead |
| Assign access profiles (step 22) | DAuth Access Service | DAuth Access Admin | -- | Identity Admin |
| Seed responsibility graph (steps 23-32) | Product Provisioning | Product Owner | Module Leads | Tenant Admin |
| User invitations (step 33) | DOS Invitation Service | Tenant Admin | -- | Invited Users |
| Governance/risk baseline (steps 34-36) | Product Provisioning | Product Owner | Module Leads | Tenant Admin |
| Post-seed validations (step 37) | DOS Provisioning Engine | Platform Super Admin | Product Owner | All |
| Workspace activation (step 38) | DOS Provisioning Engine | Platform Super Admin | -- | Tenant Admin |
| Module security seeding (step 47) | DAuth Module Security | DAuth Access Admin | Module Lead | -- |
| Handover complete (step 52) | DOS Provisioning Engine | Platform Super Admin | Tenant Admin | All stakeholders |
| Emit access snapshot (step 53) | DAuth Snapshot Service | DAuth Auditor | -- | Access Admin |

---

## 5. Handover Responsibility Assignment

| Deliverable | Producing Layer | Producer Role | Receiving Layer | Receiver Role |
|-------------|-----------------|---------------|-----------------|---------------|
| Migration audit report (REF-01) | DOS | Platform Support | Operations | Tenant Admin |
| Provisioning evidence (REF-02) | DOS | Platform Super Admin | Operations | Tenant Admin |
| Onboarding flow documentation (REF-03) | Product | Product Owner | Customer | Onboarding Executive Owner |
| Roles matrix (REF-04) | DAuth + Product | Access Admin | Customer | Tenant Admin |
| Seed data catalog (REF-05) | DOS + Product | Platform Support | Operations | Tenant Admin |
| Handover checklist (REF-06) | DOS | Platform Super Admin | Customer | Onboarding Executive Owner |
| Runtime runbook (REF-07) | DOS | Platform Support | Operations | Tenant Admin |
| Tenant workspace | DOS | Provisioning Engine | Customer | Tenant Admin |
| DAuth access profiles | DAuth | Access Admin | Customer | Identity Admin |
| Module entitlements | Product | Product Owner | Customer | Module Lead |

---

## 6. Escalation Path

```
Level 0: Module Viewer / Contributor
   |  Cannot resolve --> escalate to
Level 1: Module Lead / Operator
   |  Cannot resolve --> escalate to
Level 2: Module Executive Owner / Approver
   |  Cannot resolve --> escalate to
Level 3: Tenant Admin
   |  Cannot resolve --> escalate to
Level 3b: DAuth Access Admin (identity/access-specific escalations)
   |  Cannot resolve --> escalate to
Level 4: Platform Super Admin
   |  Cannot resolve --> escalate to
Level 5: Engineering Incident Escalation
```

**Escalation rules:**
- SoD violations are automatically escalated to Level 3b (DAuth Access Admin)
- Provisioning failures are automatically escalated to Level 4 (Platform Super Admin)
- AI agent guardrail breaches are escalated to Level 3 with AI Agent Admin notified
- All escalations are auditable (Law 12)
- Deny-by-default applies at every level (Law 11)

---

*End of REF-04*
