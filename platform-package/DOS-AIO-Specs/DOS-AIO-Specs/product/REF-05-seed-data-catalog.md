# REF-05 -- Seed Data Catalog

> **Platform:** Dogan-AI-OS (DOS) / Shahin-AI AGRC
> **Generated from:** `seed-onboarding-questions.ts`, `onboarding-stages.ts`, `provisioning-steps.ts`
> **Date:** 2026-04-05

---

## 1. Master Seed Data (public schema, pre-provisioning)

Master seed data lives in the `public` schema and is available before any tenant is provisioned. This data drives onboarding question resolution, framework selection, and regulatory alignment.

| Table | Rows | Description | Seed Source |
|-------|------|-------------|-------------|
| `config_definitions` | 26 | Platform configuration keys with defaults and validation | SQL migration seed |
| `regulatory_frameworks` | 32 | Compliance frameworks (NCA ECC, SAMA CSF, PDPL, ISO 27001, GDPR, etc.) | SQL migration seed |
| `platform_products` | 1 | Shahin-AI AGRC product registration | SQL migration seed |
| `agent_registry` | 1 | Agent A12 (platform AI agent) | Migration `010_seed_agent_a12.sql` |
| `pack_registry` | varies | Content packs (starter, enterprise, sector-specific) | Migration `008_create_pack_registry.sql` |
| `lookup_countries` | varies | Country reference data | SQL seed |
| `lookup_cities` | varies | City reference data (depends on country) | SQL seed |
| `lookup_sectors` | varies | Business sector / sub-sector taxonomy | SQL seed |
| `lookup_employee_ranges` | varies | Employee count bands for org sizing | SQL seed |
| `lookup_timezones` | varies | Timezone reference (depends on country) | SQL seed |
| `lookup_languages` | varies | Supported platform languages | SQL seed |
| `onboarding_questions` | 94 | Onboarding question bank across all stages | `seed-onboarding-questions.ts` |
| `onboarding_stages` | 18 | Onboarding stage definitions | `onboarding-stages.ts` |

### 1.1 Onboarding Stage Definitions (18 stages)

| # | Stage Code | Purpose |
|---|-----------|---------|
| 1 | `welcome` | Welcome screen, platform introduction |
| 2 | `use_case` | Identify primary use case for the platform |
| 3 | `pack_selection` | Select content pack (starter, enterprise, etc.) |
| 4 | `organization_identity` | Legal name, display name, country, sector, slug (11 questions) |
| 5 | `regulatory_scope` | Jurisdictions, frameworks, audit cadence (4 questions) |
| 6 | `org_structure` | Departments, entities, branches (4+ questions) |
| 7 | `technology_landscape` | IT environment, tools, integrations |
| 8 | `governance_model` | Governance structure, committees, charter |
| 9 | `risk_compliance_maturity` | Current maturity level, assessment history |
| 10 | `operating_model` | Operational model, shared services |
| 11 | `people_ownership` | People, RACI, ownership assignments |
| 12 | `data_start_mode` | Import vs. fresh start, migration preferences |
| 13 | `ai_setup` | AI preferences, agent configuration |
| 14 | `personalization` | Dashboard layout, notification preferences |
| 15 | `readiness_check` | Pre-provisioning readiness validation |
| 16 | `pain_profile` | Pain points, priority areas |
| 17 | `review_confirmation` | Final review of all answers before provisioning |
| 18 | `provision_workspace` | Trigger 53-step provisioning pipeline |

### 1.2 Onboarding Question Distribution by Stage

| Stage Code | Questions | Key Fields |
|-----------|-----------|------------|
| `organization_identity` | 11 | legal_name, display_name, arabic_name, country, city, industry, sub_sector, employee_band, tenant_slug, timezone, language_code |
| `regulatory_scope` | 4 | jurisdictions (multi-select: SA, AE, QA, KW, BH, OM, EG, JO, EU, US, GB), regulated_sector, frameworks_confirmed (NCA ECC, SAMA CSF, PDPL, ISO 27001, SOC2, GDPR, etc.), audit_cadence |
| `org_structure` | 4+ | department_count, entity_count, has_branches, branch_count |
| Other stages | ~75 | technology, governance, risk, people, AI, personalization questions |

---

## 2. Tenant Seed Data (per-provisioning step)

Each provisioning step seeds specific data into the tenant schema. 53 steps total (see `provisioning-steps.ts`).

### 2.1 Platform Bootstrap (Universal -- all products)

| Step | Code | Seeds |
|------|------|-------|
| 1 | `create_tenant_master` | `tenants` row in public schema |
| 2 | `create_first_user` | First user record in public schema |
| 3 | `create_actor_record` | DAuth actor record for first user |
| 4 | `create_tenant_membership` | Tenant membership linking user to tenant |
| 5 | `create_workspace` | Workspace configuration record |
| 6 | `allocate_tenant_schema` | PostgreSQL schema `tenant_{uuid}` |
| 7 | `run_tenant_migrations` | All tenant-schema DDL migrations |
| 8 | `seed_tenant_preferences` | Tenant preferences (language, timezone, theme) |
| 9 | `seed_integration_config` | Integration configuration defaults |

### 2.2 Product Bootstrap (Shahin AGRC-specific)

| Step | Code | Seeds |
|------|------|-------|
| 10 | `seed_org_structure` | Departments, entities from onboarding answers |
| 11 | `apply_module_seed_mappings` | Module-to-seed mapping registry |
| 12 | `seed_frameworks` | Regulatory frameworks resolved from sector + jurisdiction |
| 13 | `seed_controls` | Control catalog mapped to selected frameworks |
| 14 | `seed_risks` | Risk register baseline |
| 15 | `seed_policies` | Policy templates for selected frameworks |
| 16 | `seed_evidence_plan` | Evidence collection plan and schedules |
| 17 | `seed_workflows` | Workflow definitions (approval, review, escalation) |
| 18 | `seed_dashboard_profile` | Dashboard layout and widget configuration |
| 19 | `seed_navigation` | Navigation registry for module hubs |
| 20 | `seed_qiyas_starter` | Qiyas (measurement) starter data |

### 2.3 DAuth Roles and Access (Universal)

| Step | Code | Seeds |
|------|------|-------|
| 21 | `create_default_roles` | Platform + module default roles |
| 22 | `assign_initial_access_profile` | First user gets tenant admin access profile |

### 2.4 Responsibility Graph (Shahin AGRC-specific)

| Step | Code | Seeds |
|------|------|-------|
| 23 | `seed_person_profiles` | Person profiles from responsibility graph |
| 24 | `seed_module_assignments` | Module ownership assignments |
| 25 | `seed_teams_from_graph` | Team structure from responsibility graph |
| 26 | `seed_teams_and_raci` | RACI matrix entries |
| 27 | `seed_escalation_and_sla` | Escalation paths and SLA definitions |
| 28 | `wire_ownership_to_entities` | Entity ownership wiring |
| 29 | `seed_ninety_day_plan` | 90-day implementation plan |
| 30 | `seed_sla_config` | SLA configuration (response times, deadlines) |
| 31 | `seed_initial_assessment` | Initial compliance assessment |
| 32 | `seed_audit_plan` | Audit plan and schedule |

### 2.5 Universal Finalization + Governance

| Step | Code | Seeds |
|------|------|-------|
| 33 | `create_user_invitations` | Invitation records for additional users |
| 34 | `seed_governance_constitution` | Governance constitution document |
| 35 | `seed_governance_baseline` | Governance baseline metrics |
| 36 | `seed_risk_baseline` | Risk appetite, scoring model, tolerance thresholds |

### 2.6 Validation and Activation

| Step | Code | Seeds |
|------|------|-------|
| 37 | `run_post_seed_validations` | Validation checks (no data seeded, validates prior steps) |
| 38 | `activate_workspace` | Sets workspace status to `active` |
| 39 | `seed_module_entitlements` | Module entitlements and operating states |
| 40 | `start_ccm_engine` | Continuous compliance monitoring engine cycle |
| 41 | `create_subscription` | Trial subscription record |

### 2.7 Automation and Final Wiring

| Step | Code | Seeds |
|------|------|-------|
| 42 | `seed_automation_rules` | Automation rule definitions |
| 43 | `seed_initial_tasks` | Role-based initial task assignments |
| 44 | `seed_feature_flags` | Feature flag defaults |
| 45 | `generate_startup_checklist` | Startup checklist for tenant admin |
| 46 | `seed_enterprise_roles` | Enterprise authorization roles |
| 47 | `seed_module_security` | Module security (roles, permissions, actions, SoD rules) |
| 48 | `seed_department_managers` | Department manager assignments |
| 49 | `seed_workflow_chains` | Workflow chain definitions |
| 50 | `install_product_packs` | Product content packs |
| 51 | `materialize_governance_context` | Governance context materialization |
| 52 | `handover_complete` | Marks provisioning as complete |
| 53 | `emit_access_snapshot` | DAuth initial access snapshot for audit trail |

---

## 3. Seed Gaps

The following tables are known to have zero or insufficient seed data:

| Table | Current Rows | Severity | Status | Action Required |
|-------|-------------|----------|--------|-----------------|
| `regulatory_authorities` | 0 | **BLOCKING** | Empty | Needs seeding with NCA, SAMA, SDAIA, CST authority records. Required for regulatory scope resolution during onboarding. |
| `event_type_registry` | 0 | **BLOCKING** | Empty | Event catalog pending. Required for audit trail categorization and event-driven architecture. |
| `evidence_templates` | 0 | NON-BLOCKING | Empty | Evidence template library not yet populated. Evidence module can operate with manual templates. |
| `control_mapping_cross_refs` | 0 | NON-BLOCKING | Empty | Cross-framework control mapping not yet seeded. Controls module can operate without cross-refs. |
| `risk_scoring_models` | varies | ENHANCEMENT | Partial | Only baseline model seeded; advanced models pending. Risk scoring functional with baseline. |

> **Severity key:**
> - **BLOCKING** — Must be seeded before first tenant provisioning can succeed
> - **NON-BLOCKING** — Module can operate without this data; seed when ready
> - **ENHANCEMENT** — Baseline functionality works; seed for advanced features

---

## 4. Seed Validation Queries

Run these queries after provisioning to verify seed data integrity.

### 4.1 Public Schema Seed Verification

```sql
-- Verify master seed tables
SELECT 'config_definitions' AS tbl, COUNT(*) AS cnt FROM config_definitions
UNION ALL
SELECT 'regulatory_frameworks', COUNT(*) FROM regulatory_frameworks
UNION ALL
SELECT 'platform_products', COUNT(*) FROM platform_products
UNION ALL
SELECT 'agent_registry', COUNT(*) FROM agent_registry
UNION ALL
SELECT 'onboarding_questions', COUNT(*) FROM onboarding_questions
UNION ALL
SELECT 'onboarding_stages', COUNT(*) FROM onboarding_stages;

-- Expected: config_definitions >= 26, regulatory_frameworks >= 32,
--           platform_products >= 1, agent_registry >= 1,
--           onboarding_questions >= 94, onboarding_stages = 18
```

### 4.2 Tenant Schema Seed Verification

```sql
-- Replace {schema} with tenant_<uuid> (underscored)
SELECT 'roles' AS tbl, COUNT(*) AS cnt FROM "{schema}".roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM "{schema}".permissions
UNION ALL
SELECT 'departments', COUNT(*) FROM "{schema}".departments
UNION ALL
SELECT 'frameworks', COUNT(*) FROM "{schema}".compliance_frameworks
UNION ALL
SELECT 'workflows', COUNT(*) FROM "{schema}".workflows
UNION ALL
SELECT 'feature_flags', COUNT(*) FROM "{schema}".feature_flags;

-- Expected: roles > 0, permissions > 0, departments > 0 (if org_structure seeded)
```

### 4.3 Provisioning Completeness Check

```sql
-- Verify all 53 provisioning steps completed
SELECT
  pj.tenant_id,
  COUNT(*) FILTER (WHERE ps.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE ps.status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE ps.status = 'skipped') AS skipped,
  COUNT(*) AS total
FROM provisioning_jobs pj
JOIN provisioning_steps ps ON ps.job_id = pj.id
WHERE pj.tenant_id = '{tenant_id}'
GROUP BY pj.tenant_id;

-- Expected: completed = 53 (or completed + skipped = 53), failed = 0
```

---

*End of REF-05*
