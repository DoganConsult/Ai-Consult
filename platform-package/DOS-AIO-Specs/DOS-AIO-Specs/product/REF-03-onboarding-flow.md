# REF-03 -- Onboarding Flow / Screen Sequence

> **Frontend source:** `frontend/src/app/features/onboarding-os/`
> **Backend lifecycle:** `backend/src/modules/onboarding/workflows/onboarding-lifecycle.ts`
> **Lifecycle registration:** `backend/src/modules/onboarding/lifecycle-registration.ts`
> **Stage definitions (DB seed):** `backend/src/migrations/master/068_onboarding_stage_definitions.sql`
> **Scene templates:** `backend/src/modules/onboarding/constants/default-scenes.ts`
> **Config service:** `frontend/src/app/features/onboarding-os/services/onboarding-config.service.ts`
> **Last updated:** 2026-04-05

---

## 1. Entry Points (Registration / Login / Invite)

The onboarding shell is entered through three paths:

### 1.1 New Registration
- User arrives at the registration URL
- `RegistrationHeroComponent` renders (registration gate: `registrationMode` signal)
- On successful registration, `RegistrationResult` is emitted
- Session is created with lifecycle state `not_started`, then transitions to `draft` or `in_progress`

### 1.2 Returning Login
- User with an existing onboarding session resumes
- `OnboardingShellPageComponent.ngOnInit()` loads the existing session via `OnboardingApiService`
- The shell restores the last active stage index from session data

### 1.3 Invite Flow
- Invited users arrive with a token
- After identity verification, they join an existing onboarding session
- Their role in the session is determined by the invitation type

**Shell component:** `OnboardingShellPageComponent` (`onboarding-shell-page.component.ts`)
- Standalone Angular component with `ChangeDetectionStrategy.Default`
- Injects: `OnboardingApiService`, `OnboardingConfigService`, `OnboardingLookupService`, `OnboardingProvisioningService`, `OnboardingAnswerService`, `OnboardingValidationService`, `OnboardingDataLoaderService`, `SessionService`, `I18nService`, `StorageService`
- Fully bilingual (English/Arabic) via `I18nService`

---

## 2. Stage Sequence

> **Stage count reconciliation:**
> - **10 DB-seeded stages** — stored in `public.onboarding_stage_definitions`, seeded by migration 068. Includes 8 question-driven stages + `review_confirmation` + `provision_workspace`.
> - **8 dedicated component stages** — rendered by specialized UI components in the shell template: `welcome`, `use_case`, `pack_selection`, `pain_profile`, `data_start_mode`, `ai_setup`, `personalization`, `readiness_check`. These are flow/UX stages, not question-driven.
> - **`people_roles`** is an embedded UI sub-component within `people_ownership`, not a standalone stage. It shares the AI suggestion bar but does not appear as a separate entry in the stage sequence.
> - **18 total user-visible stages** = 10 DB-seeded + 8 component stages, in the `onboarding-config.service.ts` fallback stage list.
> - When this document says "18 stages", it means the full user-visible flow. When specs say "10 stages", they mean the DB-seeded stages.

The onboarding flow uses a two-layer stage model:

1. **DB-driven stage definitions** (10 stages from `onboarding_stage_definitions` table, seeded by migration 068)
2. **Dedicated component stages** (8 additional stages rendered by specialized components in the template)
3. **Scene templates** (9 scenes that map emotional narrative to stage groups)

### 2.1 DB-Seeded Stages (10 canonical stages)

These are the stages stored in `public.onboarding_stage_definitions` and returned
by `OnboardingConfigService.getStageDefinitions()`:

| # | Stage Code | Label (EN) | Label (AR) | Description | Required | Min Readiness |
|---|------------|------------|------------|-------------|----------|---------------|
| 1 | `organization_identity` | Organization Identity | هوية المنظمة | Basic information about your organization | Yes | 10 |
| 2 | `regulatory_scope` | Regulatory Scope | النطاق التنظيمي | Jurisdictions and regulatory requirements | Yes | 10 |
| 3 | `org_structure` | Organization Structure | الهيكل التنظيمي | Departments, entities, and locations | Yes | 10 |
| 4 | `technology_landscape` | Technology Landscape | المشهد التقني | Systems, tools, and integrations | Yes | 5 |
| 5 | `governance_model` | Governance Model | نموذج الحوكمة | Committees, approval chains, and oversight | Yes | 10 |
| 6 | `risk_compliance_maturity` | Risk and Compliance Maturity | نضج المخاطر والامتثال | Current maturity level and readiness | Yes | 15 |
| 7 | `operating_model` | Operating Model | نموذج التشغيل | Processes, cadences, and operational settings | Yes | 10 |
| 8 | `people_ownership` | People and Ownership | الأشخاص والملكية | Team assignments and responsibility matrix | Yes | 10 |
| 9 | `review_confirmation` | Review and Confirmation | المراجعة والتأكيد | Review all answers before provisioning | Yes | 0 |
| 10 | `provision_workspace` | Provision Workspace | تهيئة مساحة العمل | Build and activate your workspace | Yes | 0 |

**Visibility rules** (conditional stages):
- `governance_model`: Visible when org size is 201+ employees OR `gov.has_risk_committee` is true
- `people_ownership`: Visible when org size is 51+ employees

### 2.2 Dedicated Component Stages (8 Template-Driven)

The shell template renders specialized components for these 8 additional stage codes.
They appear in the flow alongside or before DB-driven stages:

| Stage Code | Component | Purpose |
|------------|-----------|---------|
| `welcome` | `RegistrationHeroComponent` | Journey profile selection (Express / Guided / Expert) |
| `use_case` | `UseCaseSelectorComponent` | Use case selection |
| `pack_selection` | `PackSelectionComponent` | Content pack selection |
| `data_start_mode` | `DataStartModeComponent` | Data import strategy selection |
| `ai_setup` | `AiSetupComponent` | AI agent configuration |
| `personalization` | `PersonalizationComponent` | Personalization preferences |
| `readiness_check` | `ReadinessCheckComponent` | Pre-provisioning readiness validation |
| `pain_profile` | `PainCardsComponent` | Pain point selection via visual cards |

> **Note:** `people_roles` is not a standalone stage — it is an embedded sub-component within the `people_ownership` DB-seeded stage. It shares the AI suggestion sidebar but does not appear as a separate step in the stage sequence.

### 2.3 Visible Stage Filtering

The `visibleStages` computed signal filters stages dynamically:
- Stages in `SPECIAL_STAGES` set (`review_confirmation`, `provision_workspace`) are always visible
- Other stages are visible only if at least one question in the question bank has a matching `stage_code`

---

## 3. Per-Stage Screen Details

### Stage 1: Organization Identity (`organization_identity`)

**Scene:** Scene 3 -- "We are mapping your regulatory reality"
**Questions asked:**
- Legal name, display name, Arabic name
- Sector/industry selection
- Country and region
- Organization type (public, private, government, etc.)
- Employee band (size)
- Registration number, website, contact phone
- Fiscal year end, data residency preference
- Business days configuration

**Components:** Standard question renderer with section labels for `identity` group
**Inference shown:** Live regulator detection and framework mapping as answers are entered
**Data feeds scoring:** Sector + country + size drive framework selection and complexity tier

### Stage 2: Regulatory Scope (`regulatory_scope`)

**Scene:** Scene 4 -- "Your framework chain is clear"
**Questions asked:**
- Jurisdiction confirmation (detected from sector/country)
- Regulated sector confirmation
- Framework selection/confirmation (NCA-ECC, SAMA, SDAIA, ISO 27001, etc.)
- Data governance requirements
- Reporting obligations

**Components:** Standard question renderer with sections for `jurisdictions`, `frameworks`, `data_governance`, `reporting`
**Inference shown:** Regulatory chain visual (Authority -> Framework -> Controls -> Evidence)
**Data feeds scoring:** Framework count and complexity drive control/evidence counts

### Stage 3: Organization Structure (`org_structure`)

**Scene:** Scene 5 (shared with `technology_landscape`)
**Questions asked:**
- Department definitions
- Entity/subsidiary definitions
- Location information

**Components:** Standard question renderer with dedicated org-structure visual (conditionally rendered when `stageCode === 'org_structure'`)
**Sections:** `departments`, `entities`

### Stage 4: Technology Landscape (`technology_landscape`)

**Scene:** Scene 6 -- "Your operations are being wired"
**Questions asked:**
- Identity and access management (SSO, MFA)
- Infrastructure details (cloud provider, on-premise)
- Integration connectors
- Security monitoring tools

**Components:** Standard question renderer
**Sections:** `identity_access`, `infrastructure`, `integrations`, `monitoring`
**Inference shown:** Automation readiness score and integration discovery

### Stage 5: Governance Model (`governance_model`)

**Scene:** Scene 5 -- "Your governance DNA is forming"
**Questions asked:**
- Committee definitions (risk committee, audit committee, etc.)
- Approval structure
- Risk governance model
- Risk appetite settings

**Components:** Standard question renderer with business functions banner (conditionally rendered)
**Sections:** `committees`, `approvals`, `risk_governance`
**Inference shown:** Complexity tier (Lite / Standard / Enterprise) auto-determined

### Stage 6: Risk and Compliance Maturity (`risk_compliance_maturity`)

**Scene:** Scene 5 (shared with `governance_model`)
**Questions asked:**
- Maturity level self-assessment
- Risk management practices
- Policy library status
- Assessment and testing maturity
- Evidence collection maturity
- Audit program maturity

**Components:** Standard question renderer
**Sections:** `maturity`, `risk`, `policies`, `assessment`, `evidence`, `audit`

### Stage 7: Operating Model (`operating_model`)

**Scene:** Scene 6 (shared with `technology_landscape`)
**Questions asked:**
- Workflow preferences
- SLA and response time targets
- Incident management practices
- Change management processes
- Vendor management approach
- Training and awareness programs
- Business resilience planning

**Components:** Standard question renderer
**Sections:** `workflows`, `sla`, `incident_ops`, `change_ops`, `vendor_ops`, `training`, `resilience`, `risk_ops`

### Stage 8: People and Ownership (`people_ownership`)

**Scene:** Scene 7 -- "Your team is taking shape"
**Questions asked:**
- Executive leadership contacts
- GRC leads (compliance officer, risk manager, etc.)
- Key contacts
- Ownership and accountability assignments
- Team invitations

**Components:** Standard question renderer with AI suggest bar and staffing suggestions banner
**Sections:** `leadership`, `leads`, `contacts`, `ownership`, `accountability`, `invitations`
**Inference shown:** Starter responsibility graph (who owns what)

### Stage 9: Review and Confirmation (`review_confirmation`)

**Scene:** Scene 8 -- "Your governance blueprint is ready"
**Special stage** (no question renderer)
**Screen contents:**
- Full review model loaded via `loadReview()`
- Impact summary: control count, evidence task count, workflow count
- Confidence radar
- Workspace preview grid (`WorkspacePreviewGridComponent`)
- Governance context summary (`GovernanceContextSummaryComponent`)
- Blocker list with fix buttons (navigate to offending stage)
- Review diff component (`ReviewDiffComponent`)
- Legal confirmation checkbox
- Approve button (transitions to `approved_for_provisioning`)

**Data shown:**
- `provisioningSummary` computed: controls, evidence, workflows, agents counts
- `overallConfidence` computed: average of all confidence scores
- Module operating states
- Workspace preview sections
- Dashboard persona profiles

### Stage 10: Provision Workspace (`provision_workspace`)

**Scene:** Scene 9 -- "Your world is being built"
**Special stage** (no question renderer)
**Screen contents:**
- Live provisioning progress with bilingual milestones (`ActivationMilestonesComponent`)
- Per-step status indicators (`provSteps` signal)
- Elapsed time counter (`provisionElapsedSeconds`)
- Error display (`provisionError`)
- Retry button on failure
- On completion: Cockpit reveal banner (`CockpitRevealBannerComponent`)
- Startup checklist display

**Flow:**
1. User clicks "Provision" (after legal confirmation)
2. `OnboardingProvisioningService` starts provisioning
3. Polls provisioning status at `pollingIntervalMs: 2000`
4. Each step completion updates the milestone display
5. On success: startup checklist loads, cockpit reveal shows

---

## 4. Lifecycle State Machine

### 4.1 Session Lifecycle States (16 states)

Defined in `onboarding-lifecycle.ts` and registered with the platform lifecycle
engine in `lifecycle-registration.ts`.

```
States: not_started, draft, in_progress, awaiting_review, review_blocked,
        review_ready, approved_for_provisioning, provisioning_started,
        provisioning, provisioning_partial, provisioned, handover_pending,
        active, failed, cancelled, archived
```

### 4.2 State Transition Map

```
not_started
  -> draft
  -> in_progress
  -> cancelled

draft
  -> in_progress
  -> cancelled

in_progress
  -> awaiting_review
  -> cancelled

awaiting_review
  -> review_blocked
  -> review_ready
  -> in_progress        (back to editing)
  -> cancelled

review_blocked
  -> awaiting_review    (blockers resolved)
  -> in_progress        (back to editing)
  -> cancelled

review_ready
  -> approved_for_provisioning
  -> awaiting_review    (revert to review)
  -> cancelled

approved_for_provisioning
  -> provisioning_started
  -> cancelled

provisioning_started
  -> provisioning
  -> failed

provisioning
  -> provisioning_partial
  -> provisioned
  -> failed

provisioning_partial
  -> provisioning       (resume)
  -> provisioned        (enough steps passed)
  -> failed

provisioned
  -> handover_pending
  -> active

handover_pending
  -> active

active
  -> archived

failed
  -> in_progress        (restart from scratch)
  -> provisioning_started (retry provisioning)
  -> cancelled
  -> archived

cancelled
  -> archived

archived
  -> (terminal -- no transitions)
```

### 4.3 State Diagram (Text)

```
                                 +-------------+
                                 | not_started |
                                 +------+------+
                                   |    |    |
                          +--------+    |    +----------+
                          v             v               v
                       +------+    +-----------+   +-----------+
                       | draft|    |in_progress|   | cancelled |---> archived
                       +--+---+    +-----+-----+       ^
                          |              |              |
                          +--> in_progress              |
                                   |                    |
                                   v                    |
                          +----------------+            |
                          |awaiting_review |<-----------+--+
                          +---+----+---+---+               |
                              |    |   |                   |
                    +---------+    |   +--------+          |
                    v              v            v           |
              +----------+  +----------+  in_progress      |
              | review   |  | review   |                   |
              | blocked  |  | ready    |                   |
              +----+-----+  +----+-----+                   |
                   |              |                         |
                   +-> awaiting   +-> approved_for         |
                       _review        _provisioning        |
                                      |        |           |
                                      |        +-> cancelled
                                      v
                              +--------------+
                              | provisioning |
                              | _started     |
                              +------+-------+
                                     |
                              +------v-------+
                              | provisioning |
                              +--+-----+--+--+
                                 |     |  |
                        +--------+     |  +--------+
                        v              v           v
                  +----------+   +-----------+  +------+
                  |provision |   | provision |  |failed|
                  |_partial  |   | ed        |  +--+---+
                  +----+-----+   +-----+-----+    |
                       |               |           +--> provisioning_started
                       +-> provisioned |           +--> in_progress
                       +-> provisioning|           +--> cancelled
                                       v           +--> archived
                              +----------------+
                              |handover_pending|
                              +-------+--------+
                                      |
                                      v
                                  +--------+
                                  | active |
                                  +---+----+
                                      |
                                      v
                                 +----------+
                                 | archived |
                                 +----------+
```

### 4.4 Terminal States

- `archived` -- the only terminal state (no outbound transitions)

### 4.5 Cancellable States

The following states allow transition to `cancelled`:
- `not_started`
- `draft`
- `in_progress`
- `awaiting_review`
- `review_blocked`
- `review_ready`
- `approved_for_provisioning`
- `failed`

Note: Once provisioning has started (`provisioning_started`, `provisioning`, `provisioning_partial`), the session cannot be cancelled -- it can only succeed or fail.

### 4.6 Permission-Gated Transitions

Defined in `lifecycle-registration.ts`:

| Transition | Required Permission |
|------------|-------------------|
| `review_ready` -> `approved_for_provisioning` | `onboarding.approve` |
| `approved_for_provisioning` -> `provisioning_started` | `onboarding.provision` |
| `failed` -> `provisioning_started` | `onboarding.retry_provisioning` |

### 4.7 Sub-Lifecycle: Onboarding Flows

Registered separately for per-flow tracking:

```
States: not_started, in_progress, completed, skipped, failed
Initial: not_started
Terminal: completed, skipped

Transitions:
  not_started -> in_progress, skipped
  in_progress -> completed, failed, skipped
  failed      -> in_progress
```

### 4.8 Sub-Lifecycle: Onboarding Steps

Registered separately for per-step tracking:

```
States: pending, active, completed, skipped, failed
Initial: pending
Terminal: completed, skipped

Transitions:
  pending -> active, skipped
  active  -> completed, failed, skipped
  failed  -> active
```

---

## 5. Review and Approval Flow

### 5.1 Triggering Review

When the user reaches the `review_confirmation` stage:
1. `loadReview()` is called on the shell component
2. The API returns a `ReviewModel` containing:
   - Impact summary (control count, evidence task count, workflow count)
   - Blockers (issues that must be resolved before approval)
   - Confidence scores per stage
   - Recommendations

### 5.2 Blocker Resolution

- Each blocker has a `stage_code` and `question_code`
- The "Fix" button navigates to the offending stage via `navigateToStageCode()`
- Once all blockers are resolved, the session can transition from `awaiting_review` to `review_ready`

### 5.3 Approval

- User confirms legal terms (`legalConfirmed` flag)
- Approval transitions: `review_ready` -> `approved_for_provisioning`
- Requires `onboarding.approve` permission
- After approval, provisioning can be triggered

---

## 6. Provisioning and Activation

### 6.1 Provisioning Trigger

- From `approved_for_provisioning`, the user triggers provisioning
- Requires `onboarding.provision` permission
- `OnboardingProvisioningService` manages the entire flow

### 6.2 Live Progress

During provisioning, the UI shows:
- **Activation milestones** (`ActivationMilestonesComponent`): grouped progress indicators
- **Per-step status**: each of the 53 provisioning steps with pass/fail/pending indicators
- **Elapsed time**: real-time counter
- **Artifact badges**: controls created, evidence tasks, policies, AI agents

### 6.3 Provisioning States

```
approved_for_provisioning -> provisioning_started -> provisioning
                                                      |
                                          +-----------+-----------+
                                          |           |           |
                                   provisioning   provisioned   failed
                                   _partial
```

### 6.4 Completion

On successful provisioning (all steps pass):
- Session transitions to `provisioned`
- Then `handover_pending` -> `active`
- Workspace status set to active
- Cockpit reveal banner appears

---

## 7. Post-Onboarding (Startup Checklist, Cockpit Reveal)

### 7.1 Startup Checklist

Generated by provisioning step 45 (`generate_startup_checklist`):
- Post-onboarding tasks displayed as a checklist
- Items are role-based (different tasks for admin, compliance lead, risk owner)
- Accessible via `startupChecklist` signal on the shell component

### 7.2 Cockpit Reveal

When provisioning completes:
- `CockpitRevealBannerComponent` renders
- Shows a summary of what was created:
  - Number of controls
  - Number of evidence tasks
  - Number of workflows
  - Number of AI agents activated
- Provides a "Go to Cockpit" action that navigates the user to the main platform dashboard

### 7.3 Scene Narrative

Scene 9 ("Your world is being built") drives the emotional experience:
- **Emotional purpose:** Live milestone ceremony with artifact reveals
- **Pain addressed:** Uncertainty about what happens after approval
- **Events emitted:** `provisioning.started`, `provisioning.completed`, `workspace.activated`
- **Agent involvement:** A10, A01, A03, A04, A05, A07, A08, A09 (nearly all agents participate)

### 7.4 Transition to Platform

After the cockpit reveal:
- Session state is `active`
- User is redirected to the main platform (cockpit dashboard)
- The startup checklist remains accessible from the platform
- The onboarding session can later be `archived` when no longer needed
