# REF-02 -- First Live Tenant Provisioning Evidence

> **Source of truth:** `backend/src/modules/onboarding/constants/provisioning-steps.ts`
> **Handler registry:** `backend/src/modules/onboarding/services/provisioning-steps/index.ts`
> **Bootstrap handlers:** `backend/src/modules/onboarding/services/provisioning-steps/bootstrap-steps.ts`
> **Tenant infra handlers:** `backend/src/modules/onboarding/services/provisioning-steps/tenant-steps.ts`
> **Last updated:** 2026-04-05

> **LIVE EXECUTION STATUS: PENDING**
>
> This document defines the provisioning contract and expected outcomes. **No live tenant has been provisioned yet.** The server process is pending PM2 start. Once the first tenant is provisioned:
> 1. Replace this notice with actual execution timestamps
> 2. Append the real `provisioning_jobs` and `provisioning_steps` query output from Section 6
> 3. Record the actual tenant schema table count (expected: ~1,343)
> 4. Capture the access snapshot ID from the `emit_access_snapshot` step
>
> **Blockers for first live provisioning:**
> - PM2 process not yet started
> - `regulatory_authorities` table empty (0 rows — needs seeding)
> - `event_type_registry` table empty (0 rows — catalog pending)

---

## 1. Bootstrap Contract (DOS-AIO section 15 -- 10-Step Sequence)

The spec defines a 10-step bootstrap contract. Each spec step maps to one or more
implementation step codes from `DEFAULT_PROVISIONING_STEPS`:

| Spec Step | Spec Description | Implementation Step Code(s) | Seq |
|-----------|------------------|-----------------------------|-----|
| 1 | Create tenant record | `create_tenant_master` | 1 |
| 2 | Create first user | `create_first_user` | 2 |
| 3 | Create actor record (DAuth) | `create_actor_record` | 3 |
| 4 | Create tenant membership | `create_tenant_membership` | 4 |
| 5 | Seed org structure and workspace | `create_workspace`, `allocate_tenant_schema`, `run_tenant_migrations`, `seed_tenant_preferences`, `seed_integration_config`, `seed_org_structure` | 5-10 |
| 6 | Seed compliance domain | `apply_module_seed_mappings` through `seed_qiyas_starter` | 11-20 |
| 7 | Create default roles | `create_default_roles` | 21 |
| 8 | Assign initial DAuth access profile | `assign_initial_access_profile` | 22 |
| 9 | Enable default products/modules | `seed_module_entitlements` | 39 |
| 10 | Emit initial access snapshot | `emit_access_snapshot` | 53 |

---

## 2. Complete Provisioning Pipeline (53 Steps)

Every step is defined in `DEFAULT_PROVISIONING_STEPS` with a handler registered
in `buildStepHandlers()`. Product-specific steps only execute when
`ctx.productKey` matches the AGRC product key.

| Seq | Step Code | Step Name | Owner | Product-Specific? | Expected Output |
|-----|-----------|-----------|-------|-------------------|-----------------|
| 1 | `create_tenant_master` | Create tenant master | DOS | No | `{ tenantId, tenantCode, schemaName }` |
| 2 | `create_first_user` | Create first user | DOS/DAuth | No | `{ userId, linked: true }` |
| 3 | `create_actor_record` | Create actor record (DAuth) | DAuth | No | `{ actorId }` |
| 4 | `create_tenant_membership` | Create tenant membership | DOS | No | `{ membershipId }` |
| 5 | `create_workspace` | Create workspace | DOS | No | `{ workspaceId }` |
| 6 | `allocate_tenant_schema` | Allocate tenant schema | DOS | No | `{ schemaName, tablesCreated: true }` |
| 7 | `run_tenant_migrations` | Run tenant migrations | DOS | No | `{ migrated, migrationsApplied, migrationsSkipped, migrationFailed }` |
| 8 | `seed_tenant_preferences` | Seed tenant preferences | DOS | No | Tenant preference rows |
| 9 | `seed_integration_config` | Seed integration config | DOS | No | Integration config rows |
| 10 | `seed_org_structure` | Seed organization structure | Product | Yes (AGRC) | Org hierarchy rows |
| 11 | `apply_module_seed_mappings` | Apply module seed mappings | Product | Yes (AGRC) | Module seed mapping rows |
| 12 | `seed_frameworks` | Seed frameworks | Product | Yes (AGRC) | Framework rows in tenant schema |
| 13 | `seed_controls` | Seed controls | Product | Yes (AGRC) | Control rows in tenant schema |
| 14 | `seed_risks` | Seed risks | Product | Yes (AGRC) | Risk rows in tenant schema |
| 15 | `seed_policies` | Seed policies | Product | Yes (AGRC) | Policy rows in tenant schema |
| 16 | `seed_evidence_plan` | Seed evidence plan | Product | Yes (AGRC) | Evidence task rows |
| 17 | `seed_workflows` | Seed workflows | Product | Yes (AGRC) | Workflow definition rows |
| 18 | `seed_dashboard_profile` | Seed dashboard profile | Product | Yes (AGRC) | Dashboard config rows |
| 19 | `seed_navigation` | Seed navigation registry | Product | Yes (AGRC) | Navigation registry rows |
| 20 | `seed_qiyas_starter` | Seed Qiyas starter data | Product | Yes (AGRC) | Qiyas assessment data |
| 21 | `create_default_roles` | Create default roles | DAuth | No | Role definition rows |
| 22 | `assign_initial_access_profile` | Assign initial DAuth access profile | DAuth | No | `{ profileCode, assigned: true }` |
| 23 | `seed_person_profiles` | Seed person profiles from responsibility graph | Product | Yes (AGRC) | Person profile rows |
| 24 | `seed_module_assignments` | Seed module assignments from responsibility graph | Product | Yes (AGRC) | Module assignment rows |
| 25 | `seed_teams_from_graph` | Seed teams from responsibility graph | Product | Yes (AGRC) | Team rows |
| 26 | `seed_teams_and_raci` | Seed teams and RACI matrix | Product | Yes (AGRC) | Team + RACI matrix rows |
| 27 | `seed_escalation_and_sla` | Seed escalation paths and SLA from graph | Product | Yes (AGRC) | Escalation + SLA rows |
| 28 | `wire_ownership_to_entities` | Wire ownership to entities from assignments | Product | Yes (AGRC) | Entity ownership links |
| 29 | `seed_ninety_day_plan` | Seed 90-day plan | Product | Yes (AGRC) | 90-day plan rows |
| 30 | `seed_sla_config` | Seed SLA configuration | Product | Yes (AGRC) | SLA config rows |
| 31 | `seed_initial_assessment` | Seed initial assessment | Product | Yes (AGRC) | Assessment rows |
| 32 | `seed_audit_plan` | Seed audit plan | Product | Yes (AGRC) | Audit plan rows |
| 33 | `create_user_invitations` | Create user invitations | DOS | No | Invitation rows |
| 34 | `seed_governance_constitution` | Seed governance constitution | Product | Yes (AGRC) | Constitution rows |
| 35 | `seed_governance_baseline` | Seed governance baseline | Product | Yes (AGRC) | Governance baseline rows |
| 36 | `seed_risk_baseline` | Seed risk baseline (appetite, scoring, tolerance) | Product | Yes (AGRC) | Risk baseline rows |
| 37 | `run_post_seed_validations` | Run post-seed validations | DOS | No | Validation result summary |
| 38 | `activate_workspace` | Activate workspace | DOS | No | Workspace status set to active |
| 39 | `seed_module_entitlements` | Seed module entitlements and operating states | DOS | No | Module entitlement rows |
| 40 | `start_ccm_engine` | Start CCM engine cycle | Product | Yes (AGRC) | CCM engine initialized |
| 41 | `create_subscription` | Create trial subscription | DOS | No | Subscription record |
| 42 | `seed_automation_rules` | Seed automation rules | Product | Yes (AGRC) | Automation rule rows |
| 43 | `seed_initial_tasks` | Seed initial role-based tasks | Product | Yes (AGRC) | Task rows |
| 44 | `seed_feature_flags` | Seed feature flags | DOS | No | Feature flag rows |
| 45 | `generate_startup_checklist` | Generate startup checklist | DOS | No | Startup checklist rows |
| 46 | `seed_enterprise_roles` | Seed enterprise authorization roles | DAuth | No | Enterprise role rows |
| 47 | `seed_module_security` | Seed module security (roles, permissions, actions, SoD) | DAuth | No | Security seed rows |
| 48 | `seed_department_managers` | Seed department managers | Product | Yes (AGRC) | Manager assignment rows |
| 49 | `seed_workflow_chains` | Seed workflow chain definitions | Product | Yes (AGRC) | Workflow chain rows |
| 50 | `install_product_packs` | Install product content packs | Product | Yes (AGRC) | Pack installation records |
| 51 | `materialize_governance_context` | Materialize governance context | DOS | No | Governance context materialized view |
| 52 | `handover_complete` | Handover complete | DOS | No | Session status updated |
| 53 | `emit_access_snapshot` | Emit initial access snapshot (DAuth) | DAuth | No | `{ snapshotId, rolesCount, permissionsCount }` |

---

## 3. Per-Step Expected Results

### Phase A -- Tenant Infrastructure (Steps 1-7)

**Step 1: `create_tenant_master`**
- **Tables written:** `public.tenants` (INSERT or UPDATE)
- **Fields set:** `tenant_id`, `tenant_code`, `org_name`, `tenant_name_en`, `tenant_name_ar`, `schema_name`, `industry`, `org_size`, `status='provisioning'`, `settings` (JSONB with fiscal year, org details)
- **Events:** None (infrastructure step)

**Step 2: `create_first_user`**
- **Tables written:** `public.users` (INSERT or UPDATE `tenant_id` link)
- **Fields set:** `user_id`, `email`, `name`, `tenant_id`, `status='active'`
- **Events:** None

**Step 3: `create_actor_record`**
- **Tables written:** `public.actors` (INSERT)
- **Fields set:** `actor_id`, `user_id`, `actor_type='user'`, `tenant_id`, `status='active'`
- **Events:** None

**Step 4: `create_tenant_membership`**
- **Tables written:** `public.tenant_user_memberships` (INSERT or UPSERT)
- **Fields set:** `membership_id`, `tenant_id`, `user_id`, `membership_status='active'`, `role_code='tenant-admin'`
- **Events:** None

**Step 5: `create_workspace`**
- **Tables written:** `tenant_{id}.workspaces` (INSERT)
- **Side effects:** Creates tenant schema via `CREATE SCHEMA IF NOT EXISTS`, calls `createTenantSchema()` if tables missing
- **Fields set:** `workspace_id`, `name`, `description`, `type='enterprise_grc'`

**Step 6: `allocate_tenant_schema`**
- **Tables written:** All tenant DDL tables via `createTenantSchema()`
- **Side effects:** Full tenant schema DDL execution

**Step 7: `run_tenant_migrations`**
- **Tables written:** Applies all pending tenant migrations (including learning engine tables from migration 371)
- **Validation:** Asserts required tables exist: `organizations`, `business_units`, `departments`, `frameworks`, `controls`, `workspace_profile`, `os_case_memory`, `os_outcome_memory`, `os_reflection_notes`, `os_lesson_candidates`, `os_approved_lessons`, `os_playbook_versions`, `os_learning_scores`
- **Failure mode:** Throws if any required table is missing

### Phase B -- Core Seed Data (Steps 8-9)

**Step 8: `seed_tenant_preferences`** -- Default locale, timezone, date format, notification prefs
**Step 9: `seed_integration_config`** -- Default integration endpoints and connector config

### Phase C -- Product Domain Seeding (Steps 10-20, AGRC-specific)

**Step 10: `seed_org_structure`** -- Departments, business units, locations from onboarding answers
**Step 11: `apply_module_seed_mappings`** -- Maps onboarding selections to module seed plans
**Step 12: `seed_frameworks`** -- Regulatory frameworks (NCA-ECC, SAMA, ISO 27001, etc.)
**Step 13: `seed_controls`** -- Control definitions mapped from selected frameworks
**Step 14: `seed_risks`** -- Risk register entries derived from sector/maturity
**Step 15: `seed_policies`** -- Policy templates for selected frameworks
**Step 16: `seed_evidence_plan`** -- Evidence collection tasks linked to controls
**Step 17: `seed_workflows`** -- Workflow definitions (approval, review, escalation)
**Step 18: `seed_dashboard_profile`** -- Dashboard widget config per persona
**Step 19: `seed_navigation`** -- Navigation registry entries for enabled modules
**Step 20: `seed_qiyas_starter`** -- Qiyas assessment baseline data

### Phase D -- Roles and Access (Steps 21-22)

**Step 21: `create_default_roles`** -- Platform roles (tenant-admin, compliance-lead, risk-owner, auditor, viewer)
**Step 22: `assign_initial_access_profile`**
- **Tables written:** `public.access_profiles` (INSERT), `public.user_access_profiles` (INSERT)
- **Profile assigned:** `tenant-admin` to first user

### Phase E -- Responsibility Graph (Steps 23-32, AGRC-specific)

**Step 23: `seed_person_profiles`** -- Person profiles from people/ownership onboarding answers
**Step 24: `seed_module_assignments`** -- Module-level ownership assignments
**Step 25: `seed_teams_from_graph`** -- Team definitions from org structure
**Step 26: `seed_teams_and_raci`** -- RACI matrix entries
**Step 27: `seed_escalation_and_sla`** -- Escalation paths and SLA timings
**Step 28: `wire_ownership_to_entities`** -- Links person assignments to framework/control/risk entities
**Step 29: `seed_ninety_day_plan`** -- 90-day implementation plan milestones
**Step 30: `seed_sla_config`** -- SLA configuration per module
**Step 31: `seed_initial_assessment`** -- Baseline maturity assessment
**Step 32: `seed_audit_plan`** -- Initial audit plan from assessment results

### Phase F -- Universal Finalization (Steps 33-38)

**Step 33: `create_user_invitations`** -- Sends invitations to team members listed in onboarding
**Step 34-36: Governance seeding** -- Constitution, governance baseline, risk baseline (appetite, scoring, tolerance)
**Step 37: `run_post_seed_validations`** -- Validates all required data was created correctly
**Step 38: `activate_workspace`** -- Sets workspace and tenant status to active

### Phase G -- Module Enablement and Activation (Steps 39-53)

**Step 39: `seed_module_entitlements`** -- Module operating states (on/off/trial)
**Step 40: `start_ccm_engine`** -- Continuous compliance monitoring engine initialization
**Step 41: `create_subscription`** -- Trial subscription record
**Step 42-43: Automation and tasks** -- Automation rules and initial role-based tasks
**Step 44: `seed_feature_flags`** -- Feature flag defaults
**Step 45: `generate_startup_checklist`** -- Generates post-onboarding startup tasks (requires `startupChecklistService`)
**Step 46: `seed_enterprise_roles`** -- Enterprise-level DAuth roles
**Step 47: `seed_module_security`** -- Per-module roles, permissions, actions, SoD rules, approval matrices, field RBAC
**Step 48-50: Final wiring** -- Department managers, workflow chains, product content packs
**Step 51: `materialize_governance_context`** -- Materializes the governance context summary (used by cockpit)
**Step 52: `handover_complete`** -- Marks provisioning as complete, updates session lifecycle state
**Step 53: `emit_access_snapshot`**
- **Tables written:** `public.access_snapshots` (INSERT)
- **Snapshot data:** All roles and permissions for first user, JSON serialized
- **Trigger event:** `provisioning_complete`

---

## 4. Success Criteria for First Tenant

After all 53 steps complete successfully, the following MUST be true:

### 4.1 Infrastructure
- [ ] Tenant record exists in `public.tenants` with `status = 'active'`
- [ ] Tenant schema `tenant_{id}` exists with all required tables
- [ ] Workspace record exists with `type = 'enterprise_grc'`
- [ ] All tenant migrations applied (including learning engine tables)

### 4.2 Identity and Access
- [ ] User record in `public.users` with `tenant_id` linked
- [ ] Actor record in `public.actors` with `actor_type = 'user'`
- [ ] Tenant membership in `public.tenant_user_memberships` with `membership_status = 'active'`
- [ ] Access profile `tenant-admin` assigned to first user
- [ ] Access snapshot emitted and stored in `public.access_snapshots`

### 4.3 Product Domain Data (AGRC)
- [ ] At least one framework seeded in `tenant_{id}.frameworks`
- [ ] Controls seeded and linked to frameworks
- [ ] Risk register entries exist
- [ ] Policies seeded for selected frameworks
- [ ] Evidence plan tasks created
- [ ] Workflow definitions created
- [ ] Dashboard and navigation configured
- [ ] RACI matrix populated
- [ ] 90-day plan generated
- [ ] Governance constitution and baselines seeded

### 4.4 Operational Readiness
- [ ] Module entitlements set (operating states)
- [ ] Feature flags seeded
- [ ] Startup checklist generated
- [ ] Subscription record created
- [ ] Governance context materialized
- [ ] Session lifecycle state is `provisioned` or `active`

---

## 5. Provisioning Failure Recovery

### 5.1 Retry Flow

The provisioning engine tracks per-step status. On failure:

1. Session lifecycle transitions to `failed` state
2. The `failed` state allows transitions to: `in_progress`, `provisioning_started`, `cancelled`, `archived`
3. Retrying transitions the session to `provisioning_started`, then `provisioning`
4. The engine resumes from the first failed step (all completed steps are skipped)
5. Each step handler is idempotent (uses `ON CONFLICT` / `INSERT ... ON CONFLICT DO NOTHING`)

Required permission for retry: `onboarding.retry_provisioning` (defined in lifecycle registration).

### 5.2 Configuration

From `UIConfiguration.provisioning`:
- `maxDurationMinutes: 10` -- total provisioning timeout
- `retryEnabled: true` -- retry allowed
- `parallelSteps: false` -- steps execute sequentially

Per-step defaults (from `ProvisioningStepDefinition`):
- `canRetry: true`
- `maxRetries: 3`
- `timeoutSeconds: 300`

### 5.3 Rollback Steps

There is no automatic rollback. On unrecoverable failure:

1. Investigate which step failed via the provisioning job log
2. Check `public.onboarding_provisioning_steps` for step-level status
3. Fix the root cause (data issue, migration failure, etc.)
4. Retry provisioning from the failed step

For complete tenant teardown (dev/test only):
```sql
-- Drop tenant schema entirely
DROP SCHEMA IF EXISTS "tenant_{id}" CASCADE;

-- Remove tenant records from public tables
DELETE FROM public.tenant_user_memberships WHERE tenant_id = '{id}';
DELETE FROM public.users WHERE tenant_id = '{id}';
DELETE FROM public.actors WHERE tenant_id = '{id}';
DELETE FROM public.tenants WHERE tenant_id = '{id}';
DELETE FROM public.onboarding_sessions WHERE tenant_id = '{id}';
```

### 5.4 Diagnostic Commands

```bash
# Check provisioning job status
curl -H "Authorization: Bearer $TOKEN" \
  $API_URL/onboarding/sessions/{sessionId}/provisioning/status

# Check individual step status
curl -H "Authorization: Bearer $TOKEN" \
  $API_URL/onboarding/sessions/{sessionId}/provisioning/steps
```

---

## 6. First Tenant Validation Queries

Run these queries after provisioning to verify success.

### 6.1 Tenant Record

```sql
SELECT tenant_id, tenant_code, org_name, schema_name, status, created_at
FROM public.tenants
WHERE tenant_id = '{TENANT_ID}';
-- Expected: status = 'active'
```

### 6.2 User and Identity Chain

```sql
-- First user
SELECT user_id, email, name, tenant_id, status
FROM public.users
WHERE tenant_id = '{TENANT_ID}';

-- Actor record
SELECT actor_id, user_id, actor_type, status
FROM public.actors
WHERE tenant_id = '{TENANT_ID}';

-- Membership
SELECT membership_id, user_id, membership_status, role_code
FROM public.tenant_user_memberships
WHERE tenant_id = '{TENANT_ID}';

-- Access profile assignment
SELECT user_id, profile_code, assigned_at
FROM public.user_access_profiles
WHERE tenant_id = '{TENANT_ID}';
```

### 6.3 Tenant Schema Tables

```sql
-- Count tenant tables
SELECT count(*)
FROM information_schema.tables
WHERE table_schema = 'tenant_{TENANT_ID}';
-- Expected: ~1,343 tables for full successful provisioning (health gate minimum: >=500)

-- Required tables check
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'tenant_{TENANT_ID}'
  AND table_name IN (
    'organizations', 'business_units', 'departments',
    'frameworks', 'controls', 'risks', 'policies',
    'workspace_profile', 'workspaces',
    'os_case_memory', 'os_outcome_memory', 'os_reflection_notes',
    'os_lesson_candidates', 'os_approved_lessons',
    'os_playbook_versions', 'os_learning_scores'
  )
ORDER BY table_name;
-- Expected: all 16 tables present
```

### 6.4 Workspace

```sql
SELECT workspace_id, name, type
FROM "tenant_{TENANT_ID}".workspaces;
-- Expected: type = 'enterprise_grc'
```

### 6.5 Product Domain Data (AGRC)

```sql
-- Frameworks seeded
SELECT count(*) AS framework_count
FROM "tenant_{TENANT_ID}".frameworks;

-- Controls seeded
SELECT count(*) AS control_count
FROM "tenant_{TENANT_ID}".controls;

-- Risks seeded
SELECT count(*) AS risk_count
FROM "tenant_{TENANT_ID}".risks;

-- Policies seeded
SELECT count(*) AS policy_count
FROM "tenant_{TENANT_ID}".policies;
```

### 6.6 Access Snapshot

```sql
SELECT snapshot_id, user_id, trigger_event, created_at,
       snapshot_data::jsonb->>'roles' AS roles,
       snapshot_data::jsonb->>'permissions' AS permissions
FROM public.access_snapshots
WHERE tenant_id = '{TENANT_ID}'
  AND trigger_event = 'provisioning_complete'
ORDER BY created_at DESC
LIMIT 1;
```

### 6.7 Provisioning Step Log

```sql
-- All steps with their status
SELECT sequence_no, step_code, step_name, status, started_at, completed_at,
       error_message, result_data
FROM public.onboarding_provisioning_steps
WHERE session_id = '{SESSION_ID}'
ORDER BY sequence_no;
-- Expected: all 53 steps with status = 'completed'
```

### 6.8 Session Lifecycle State

```sql
SELECT session_id, tenant_id, status, current_stage_code, created_at, updated_at
FROM public.onboarding_sessions
WHERE tenant_id = '{TENANT_ID}';
-- Expected: status IN ('provisioned', 'active')
```
