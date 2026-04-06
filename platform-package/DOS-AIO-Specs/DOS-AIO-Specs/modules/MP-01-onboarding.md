# Module Patch 01 — Onboarding Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 01 — Onboarding Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Onboarding module** end to end.

It tells an agent exactly how to:
- inspect the current onboarding stack
- compare it against the canonical onboarding target
- know what belongs to DOS, DAuth, Shahin-AI, and Onboarding itself
- know exactly what files, services, contracts, tables, events, workflows, UI surfaces, tests, operational surfaces, and handover records must exist
- know exactly how to rebuild or complete the onboarding stack without reintroducing drift

### 0.4 Module identity
- Module code: `onboarding`
- Layer: domain module
- Primary product alignment: DOS platform onboarding / Shahin-AI bootstrap entry
- Criticality: **P0 platform bootstrap critical**
- Runtime role: tenant creation, first-user bootstrap, early workspace shaping, module selection, activation handoff, provisioning orchestration entry
- Primary dependency domains: DOS, DAuth, workflow, AI, UI shell, settings/admin, operations, delivery

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8
- Patch 9
- Patch 10
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Onboarding owns directly
Onboarding owns:
- sessionized onboarding journey runtime
- onboarding stage definitions and sequencing
- onboarding question bank consumption and answer capture
- scoring/recommendation and workspace preview orchestration
- governance context shaping based on onboarding input
- startup checklist generation
- provisioning job creation and handoff
- onboarding-specific UI pages, stage flows, review stage, bootstrap progression
- registration-to-onboarding bridge only where explicitly approved
- onboarding admin and diagnostics surfaces
- onboarding audit trail for onboarding-specific actions

## 2.2 What Onboarding consumes from DOS
Onboarding consumes from DOS:
- tenant creation backbone
- product/module enablement framework
- workspace defaults framework
- org-pack provisioning hook framework
- shell/navigation/runtime composition
- event backbone
- observability contracts
- settings and admin surfaces where DOS owns them
- platform context

## 2.3 What Onboarding consumes from DAuth
Onboarding consumes from DAuth:
- initial principal creation
- tenant membership creation
- email verification
- invitation or registration security controls
- initial access-profile and role assignment
- approval and sign-off controls where required
- lifecycle authorization for state-changing onboarding actions

## 2.4 What Onboarding must not implement
Onboarding must not own:
- a second tenant engine
- a second auth system
- product/module entitlement truth
- independent org/foundation runtime truth outside DOS
- a private workflow engine
- local permission truth in frontend or backend
- hidden bootstrap scripts outside provisioning contracts

---

## 3. Canonical Backend Structure

```text
backend/src/modules/onboarding/
  controllers/
  routes/
  services/
    provisioning-steps/
  repositories/
  mappers/
  utils/
  constants/
  data/
  security/
  schemas/
  types/
  shared/
  diagnostics/
  admin/
  contracts/
  events/
  jobs/
  index.ts
  onboarding.module.ts
```

## 3.1 Required backend service families

### Journey/session core
- onboarding-session service
- onboarding-flow service
- stage-definition service
- scene service
- question service
- answer service

### Assessment and shaping
- recommendation service
- score service
- confidence-score service
- inferred-facts service
- workspace-preview service
- governance-context service
- journey-profile service
- regulator-explanation service

### Review and completion
- onboarding-review service
- onboarding-completion service
- onboarding-validation service
- startup-checklist service

### Provisioning
- provisioning-definition service
- provisioning-orchestrator service
- provisioning-step-runner service
- provisioning-step families
- provisioning seed integration services
- DOS org-pack hook integration

### Registration bridge
- onboarding-register controller/service flow
- email verification bridge surfaces
- bootstrap path alignment

### Diagnostics/admin
- onboarding diagnostics service
- provisioning diagnostics service
- stuck-session diagnostics
- provisioning replay/retry admin service

### Events/jobs
- onboarding event service
- onboarding progress events
- provisioning lifecycle events
- cleanup/reconciliation jobs if needed

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/onboarding-os/
  pages/
  components/
  services/
  models/
  state/
  contracts/
  diagnostics/
  admin/
  widgets/
  testing/
  index.ts
```

## 4.1 Required frontend ownership
The onboarding frontend must provide:
- onboarding shell
- registration hero/entry
- stage renderer
- answer management
- review stage
- provisioning progress UI
- startup checklist UI
- email verification UI bridge
- governance and workspace preview surfaces
- tech-log / diagnostics surfaces where allowed
- onboarding admin/runtime support views

## 4.2 Frontend must not own
- auth truth
- access truth
- product/module entitlement truth
- DOS shell truth
- backend validation truth as a substitute for canonical contracts

---

## 5. Data Model Requirements

## 5.1 Required public/master tables
The onboarding module may own or consume:
- onboarding session tables
- onboarding stage metadata
- onboarding question bank
- onboarding scoring/recommendation/blocker tables
- provisioning definition tables
- startup checklist templates
- workspace seed profile tables
- plan template tables
- workspace preview templates
- onboarding config tables
- onboarding lookup/reference tables where approved

## 5.2 Required tenant tables
The onboarding module may own or consume:
- provisioning_jobs
- provisioning_steps
- workspace_seeds
- pack_installations
- ninety_day_plans
- plan_item_instances
- onboarding answer drafts
- onboarding consensus/assessment drafts
- activation readiness or bootstrap logs
- product/module kickstart state

## 5.3 Explicit data ownership split
### DOS owns
- tenants
- workspaces
- product/module entitlements
- org/foundation truth
- workspace profile/runtime shell truths

### DAuth owns
- user identity
- memberships
- email verification
- access assignments
- first-user security state

### Onboarding owns
- onboarding journey state
- answers
- scores
- recommendations
- preview and shaping artifacts
- provisioning entry coordination
- checklist generation and early-plan shaping

---

## 6. Required API Surface

## 6.1 Required route groups
- bootstrap/session start
- configuration and lookup
- question and stage retrieval
- answer save/retrieve
- review and completion
- scoring/recommendations/preview
- governance context
- startup checklist
- provisioning start/status/retry/cancel
- registration bridge
- email verification bridge helpers where approved
- diagnostics/admin routes

## 6.2 Required API contract families
- onboarding session contract
- stage contract
- answer contract
- save-bulk-answers contract
- score/recommendation contract
- governance preview contract
- workspace preview contract
- startup checklist contract
- provisioning job contract
- provisioning step contract
- onboarding review contract
- onboarding register contract
- diagnostics contract

---

## 7. Workflow Requirements

## 7.1 Onboarding lifecycle states
At minimum, onboarding must define and govern:
- not_started
- in_progress
- awaiting_review
- review_blocked
- approved
- provisioning_started
- provisioning_partial
- provisioned
- failed
- cancelled

## 7.2 Workflow integration
Onboarding must integrate with Patch 7 rules for:
- state transitions
- review approvals
- self-approval prevention where relevant
- sign-off requirements if approval is privileged
- provisioning retry/cancel flows
- checklist and activation follow-up transitions

## 7.3 Workflow law
Onboarding state changes must not bypass:
- DAuth lifecycle authorization where required
- DOS provisioning contracts
- audit logging
- operational diagnostics

---

## 8. AI and Automation Requirements

## 8.1 AI usage allowed in Onboarding
Allowed:
- suggest responsibilities
- recommend business functions
- infer governance context
- infer staffing suggestions
- infer maturity/readiness hints
- generate workspace preview narratives
- guide next-best onboarding actions

## 8.2 AI usage restrictions
Not allowed:
- silent irreversible provisioning actions without approved workflow
- hidden auto-approval for protected stages
- local AI permission truth
- uncontrolled agent actions outside DAuth and workflow rules

## 8.3 Required AI contracts
- onboarding AI suggestion contract
- explainability reason contract
- confidence contract
- operator override/audit contract
- autonomy boundary contract

---

## 9. UI and Experience Requirements

## 9.1 Required UI surfaces
- registration entry
- onboarding shell
- stage-by-stage Q&A
- progress model
- recommendations/scores surfaces
- governance context view
- workspace preview
- startup checklist
- review and approval stage
- provisioning/milestone stage
- verification banner and resend flows
- diagnostic log and operator-friendly failure surfaces

## 9.2 Required UX states
Every major onboarding surface must define:
- empty
- loading
- partial data
- validation error
- saved/offline queued
- permission/verification blocked
- provisioning active
- provisioning failed
- resumed session
- completed redirect

## 9.3 Accessibility and i18n
- full RTL and Arabic/English compatibility
- keyboard navigation
- screen-reader meaningful state changes
- no disabled primary action without visible explanation
- verification and blocking reasons must be explicit

---

## 10. Settings, Admin, and Runtime Control

## 10.1 Required admin/runtime controls
- onboarding configuration visibility
- stage visibility/control
- provisioning retry/cancel
- stuck-session recovery
- preview/debug surfaces for operators
- module enablement preview during onboarding
- org-pack selection visibility
- runbook and diagnostics links

## 10.2 What must not happen
- ad hoc direct DB editing as the primary recovery path
- hidden feature toggles that change onboarding logic outside documented config
- duplicate admin truths outside DOS/DAuth boundaries

---

## 11. Observability and Operations

## 11.1 Required logs
- session start/resume
- answer save failures
- validation failures
- review decisions
- provisioning start/step/failure/cancel/retry
- preview/scoring failure reasons
- email verification gate events
- operator recovery actions

## 11.2 Required metrics
- session starts
- stage completion rate
- drop-off by stage
- review-block rate
- verification-block rate
- provisioning success/failure/retry rate
- time-to-provision
- org-pack seeding success/failure

## 11.3 Required diagnostics
- session diagnostics
- provisioning diagnostics
- dependency readiness diagnostics
- activation diagnostics
- failed step replay visibility

---

## 12. Required Tests

### 12.1 Unit tests
- session and stage logic
- answer validation
- score/recommendation logic
- governance/workspace preview logic
- provisioning step selection
- email verification gate logic

### 12.2 Integration tests
- register → onboarding flow
- save/retrieve answers
- review stage gating
- provisioning start/status/retry/cancel
- org-pack seeding integration
- module activation and defaults application

### 12.3 Contract tests
- onboarding session contract
- save-bulk-answers contract
- provisioning job/step contracts
- review completion contract
- startup checklist contract

### 12.4 Operational smoke tests
- a new tenant can be onboarded end to end
- org structure can be seeded
- verification gating works
- provisioning failures are diagnosable
- retry/cancel flows are auditable

---

## 13. Exact Build Instructions

## 13.1 If `seed_org_structure` or org-pack path is broken
### Build this
- restore onboarding-to-DOS org-pack hook via `platform/dos/provisioning/org-pack-seeding.service.ts`
- remove deleted foundation imports
- ensure provisioning step handler calls DOS-owned org pack service only

### Do not build this
- reintroduce foundation-owned deleted pack seeding path
- module-local private org structure engine

## 13.2 If onboarding auth gates are scattered
### Build this
- consume DAuth session and verification contracts
- use canonical access/lifecycle checks for review and protected actions
- unify verification gate logic

### Do not build this
- frontend-only auth truth
- local route auth shortcuts

## 13.3 If provisioning diagnostics are weak
### Build this
- explicit diagnostics service and UI surface
- step status, failure reason, retry/cancel, event trace, correlation ids

### Do not build this
- generic “something failed” toast as the only operator signal

## 13.4 If onboarding UI is incomplete
### Build this
- full state surfaces
- explicit blocked/verification/offline/retry states
- stable review and provisioning stages
- diagnostics and support visibility

### Do not build this
- hidden disabled actions without explanation
- score/recommendation calls whose outputs are never rendered

---

## 14. Gap Classification Guidance

Common onboarding gaps must be classified as:
- Missing: no org-pack hook, no review-stage contract, no provisioning diagnostics
- Incomplete: review exists but lacks auth/verification/SoD gates
- Wrong Owner: onboarding implementing DOS org truth or DAuth auth truth
- Wrong Layer: frontend computing runtime access truth
- Production Blocker: tenant cannot be provisioned end to end
- Handover Blocker: no diagnostics, no runbook, no as-built provisioning note

---

## 15. Acceptance Criteria

This module patch passes only if:
- onboarding can move a new tenant from entry to approved provisioning coherently
- onboarding uses DOS for platform/bootstrap ownership
- onboarding uses DAuth for identity and control ownership
- org-pack seeding path is explicit and valid
- review, verification, and provisioning states are explicit
- diagnostics and tests exist
- as-built update is explicit

---

## 16. Fail Conditions

FAIL if any of the following are true:
- onboarding cannot provision a tenant
- onboarding still depends on deleted foundation paths
- onboarding reimplements auth/control truth
- onboarding state transitions bypass workflow/authorization requirements
- required artifact classes are skipped
- diagnostics and tests are not defined

---

## 17. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 02 — Workflow Module End-to-End**

---

## 18. One-Line Use Instruction

Use this patch to compare the current onboarding implementation against the full canonical onboarding target, classify every onboarding-layer gap, build only the missing onboarding artifacts, validate against onboarding pass/fail rules, and update the as-built ledger.
