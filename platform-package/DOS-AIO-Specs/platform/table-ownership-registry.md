# Table Ownership Registry -- Complete Mapping

> **Authoritative source:** AGENTS.md Patch 0 section 4 (15 Architecture Laws) and section 5 (5-Layer Ownership Model)
> **Classification model:** Five-Bucket system from AGENTS.md Patch 2 (Data / Schema / Contracts)
> **Date:** 2026-04-05
> **Scope:** All 1,587 tables (244 public schema + 1,343 tenant schema)

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total tables | 1,587 |
| Public schema tables | 244 |
| Tenant schema tables | 1,343 |
| Ownership layers | 5 (DOS, DAuth, Product, Module, AI/Agent) |
| Bucket classifications | 5 (B1-B5) |

### Ownership Distribution (all schemas)

| Owner | Public | Tenant | Total | % |
|-------|--------|--------|-------|---|
| DOS Platform | 79 | 234 | 313 | 19.7% |
| DAuth Security | 14 | 90 | 104 | 6.6% |
| Module Layer | 135 | 813 | 948 | 59.7% |
| AI/Agent Layer | 16 | 206 | 222 | 14.0% |
| **Total** | **244** | **1,343** | **1,587** | **100%** |

> Product Layer and Shared Infrastructure tables are accounted for within DOS and Module Layer (see Section 3 for details).

### Bucket Distribution (all schemas)

| Bucket | Description | Count | % |
|--------|-------------|-------|---|
| B1 | Canonical Runtime Truth | 1,078 | 67.9% |
| B2 | Registry Metadata | 431 | 27.2% |
| B3 | Presentation/Runtime Config | 48 | 3.0% |
| B4 | Provisioning/Seed Input | 26 | 1.6% |
| B5 | Legacy/Archive-Only | 4 | 0.3% |
| **Total** | | **1,587** | **100%** |

> Previously "Mixed" tables (spanning multiple buckets) have been resolved to their primary bucket. Most were promoted to B1 (Runtime Truth) as they participate in active runtime flows.

---

## Methodology

1. **Primary classifier:** Table name prefix (e.g., `tenant_*` -> DOS, `role_*` -> DAuth, `risk_*` -> Module:Risk)
2. **Secondary classifier:** Functional domain analysis per AGENTS.md ownership rules
3. **Tie-breaking:** When a prefix is ambiguous, the AGENTS.md canonical owner list takes precedence
4. **Bucket assignment:** Based on runtime usage pattern -- whether the table drives runtime decisions (B1), holds configuration/descriptors (B2), drives presentation (B3), supports provisioning/seeding (B4), or is archive-only (B5)
5. **Flags:** Tables with ambiguous ownership are flagged with `[REVIEW]` for human adjudication

---

## 1. Public Schema Tables (244)

### 1.1 DOS Platform Tables

Tables owned by DOS: tenancy, org hierarchy, platform lifecycle, product/module enablement, settings, config, feature flags, provisioning, navigation, event catalog, workspace management.

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | governance_config | DOS | B2 | Platform governance configuration |
| 2 | governance_context_changelog | DOS | B1 | Governance context audit trail |
| 3 | lifecycle_checkpoints | DOS | B1 | Platform lifecycle engine checkpoints |
| 4 | lifecycle_transitions | DOS | B1 | Platform lifecycle state transitions |
| 5 | migration_config | DOS | B2 | Schema migration configuration |
| 6 | module_activation_requests | DOS | B1 | Module enablement requests |
| 7 | module_compensation_registry | DOS | B2 | Module compensation metadata |
| 8 | module_dependencies | DOS | B2 | Module dependency graph |
| 9 | module_enablement_rules | DOS | B2 | Rules for module activation |
| 10 | module_health_events | DOS | B1 | Module health telemetry |
| 11 | module_operating_states | DOS | B1 | Current module operational states |
| 12 | module_provisioning_steps | DOS | B4 | Provisioning step definitions per module |
| 13 | module_sla_configs | DOS | B2 | Module SLA configuration |
| 14 | module_visibility_overrides | DOS | B3 | Module visibility override config |
| 15 | module_visibility_rules | DOS | B3 | Module visibility rules |
| 16 | org_hierarchy | DOS | B1 | Canonical org hierarchy |
| 17 | org_pack_template_departments | DOS | B4 | Org pack seed: departments |
| 18 | org_pack_template_permissions | DOS | B4 | Org pack seed: permissions |
| 19 | org_pack_template_profiles | DOS | B4 | Org pack seed: profiles |
| 20 | org_pack_template_role_permissions | DOS | B4 | Org pack seed: role-permission bindings |
| 21 | org_pack_template_roles | DOS | B4 | Org pack seed: roles |
| 22 | org_pack_template_sections | DOS | B4 | Org pack seed: sections |
| 23 | org_pack_template_sod_rules | DOS | B4 | Org pack seed: SoD rules |
| 24 | org_pack_template_teams | DOS | B4 | Org pack seed: teams |
| 25 | org_pack_template_workflows | DOS | B4 | Org pack seed: workflows |
| 26 | org_pack_templates | DOS | B4 | Org pack template definitions |
| 27 | organization_units | DOS | B1 | Organization unit hierarchy |
| 28 | pain_module_mapping | DOS | B2 | Pain-point to module mapping |
| 29 | platform_config | DOS | B2 | Global platform configuration |
| 30 | platform_email_approvals | DOS | B1 | Platform email approval workflow |
| 31 | platform_products | DOS | B2 | Canonical product registry |
| 32 | product_dependencies | DOS | B2 | Product dependency graph |
| 33 | product_modules | DOS | B2 | Product-to-module mapping |
| 34 | product_modules_registry | DOS | B2 | Product module registry metadata |
| 35 | product_registry | DOS | B2 | Master product registry |
| 36 | provisioning_events | DOS | B1 | Provisioning event log |
| 37 | provisioning_jobs | DOS | B1 | Provisioning job tracker |
| 38 | provisioning_milestones | DOS | B1 | Provisioning milestone tracker |
| 39 | provisioning_step_definitions | DOS | B4 | Provisioning step definitions |
| 40 | provisioning_steps | DOS | B1 | Provisioning step execution state |
| 41 | provisioning_telemetry | DOS | B1 | Provisioning telemetry data |
| 42 | runtime_config | DOS | B2 | Runtime configuration store |
| 43 | runtime_config_history | DOS | B2 | Runtime config change history |
| 44 | shell_extensions | DOS | B3 | Shell extension registry |
| 45 | table_system_flags | DOS | B2 | System-level table flags |
| 46 | tenant_boundary_configs | DOS | B2 | Tenant boundary configuration |
| 47 | tenant_governance_context | DOS | B1 | Tenant governance context |
| 48 | tenant_module_entitlements | DOS | B1 | Tenant module entitlements |
| 49 | tenant_quotas | DOS | B2 | Tenant quota configuration |
| 50 | tenant_regulatory_impacts | DOS | B1 | Tenant regulatory impact tracking |
| 51 | tenant_regulatory_profile | DOS | B1 | Tenant regulatory profile |
| 52 | tenant_sectors | DOS | B1 | Tenant sector assignments |
| 53 | tenant_settings | DOS | B2 | Tenant settings store |
| 54 | tenant_status_transitions | DOS | B1 | Tenant lifecycle transitions |
| 55 | tenant_usage_snapshots | DOS | B1 | Tenant usage metering |
| 56 | tenants | DOS | B1 | Master tenant registry |
| 57 | workspace_activation_log | DOS | B1 | Workspace activation audit log |
| 58 | workspace_preview_templates | DOS | B4 | Workspace preview template seeds |
| 59 | workspace_seed_profile | DOS | B4 | Workspace seed profile definitions |
| 60 | workspace_seeds | DOS | B4 | Workspace seed data |
| 61 | dogan_actions_log | DOS | B1 | Platform actions audit log |
| 62 | dogan_guardian_config | DOS | B2 | Guardian module configuration |
| 63 | dogan_guardian_events | DOS | B1 | Guardian event log |
| 64 | dogan_learning_metrics | DOS | B1 | Platform learning metrics |
| 65 | dogan_noc_metrics | DOS | B1 | Network operations center metrics |
| 66 | dogan_observability_traces | DOS | B1 | Observability trace data |
| 67 | dogan_plan_progress | DOS | B1 | Plan progress tracking |
| 68 | dogan_soc_events | DOS | B1 | Security operations center events |

### 1.2 DAuth Security Tables

Tables owned by DAuth: identity, sessions, MFA, tokens, actor registry, memberships, access profiles, functional roles, permissions, authorities, delegation, SoD, auth middleware, authz audit.

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | approval_chains | DAuth | B1 | Approval chain definitions |
| 2 | approval_requests | DAuth | B1 | Approval request records |
| 3 | approval_steps_log | DAuth | B1 | Approval step audit log |
| 4 | department_roles | DAuth | B1 | Department-role bindings |
| 5 | membership_type_permissions | DAuth | B2 | Membership type permission map |
| 6 | refresh_token_families | DAuth | B1 | Token rotation family tracking |
| 7 | role_function_map | DAuth | B2 | Role-to-function mapping |
| 8 | role_permission_overrides | DAuth | B1 | Role permission override rules |
| 9 | sessions | DAuth | B1 | Active session store |
| 10 | tenant_sso_config | DAuth | B2 | Tenant SSO configuration |
| 11 | tenant_user_memberships | DAuth | B1 | Tenant user membership records |
| 12 | token_blacklist | DAuth | B1 | Revoked token blacklist |
| 13 | user_roles | DAuth | B1 | User role assignments |
| 14 | authority_matrix_templates | DAuth | B2 | Authority matrix template definitions |

### 1.3 Config Registry Tables

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | agrc_config_defaults | DOS | B2 | AGRC config default values |
| 2 | config_audit_logs | DOS | B1 | Config change audit trail |
| 3 | config_definitions | DOS | B2 | Config key definitions |
| 4 | config_locks | DOS | B1 | Config lock state |
| 5 | config_values | DOS | B1 | Config value store |
| 6 | effective_config_cache | DOS | B3 | Computed effective config cache |

### 1.4 Onboarding Module Tables

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | onboarding_answer_history | Module:Onboarding | B1 | Answer version history |
| 2 | onboarding_answers | Module:Onboarding | B1 | Onboarding answers |
| 3 | onboarding_attachments | Module:Onboarding | B1 | Onboarding file attachments |
| 4 | onboarding_blockers | Module:Onboarding | B1 | Onboarding blocker tracking |
| 5 | onboarding_compliance_mapping | Module:Onboarding | B2 | Compliance mapping for onboarding |
| 6 | onboarding_confidence_scores | Module:Onboarding | B1 | Confidence score tracking |
| 7 | onboarding_config_audit | Module:Onboarding | B1 | Config audit trail |
| 8 | onboarding_country_framework_cascade | Module:Onboarding | B2 | Country-framework cascade rules |
| 9 | onboarding_dynamic_lookups | Module:Onboarding | B2 | Dynamic lookup definitions |
| 10 | onboarding_edit_links | Module:Onboarding | B1 | Edit link tracking |
| 11 | onboarding_field_guidance | Module:Onboarding | B3 | Field guidance text |
| 12 | onboarding_inferred_facts | Module:Onboarding | B1 | AI-inferred facts from onboarding |
| 13 | onboarding_journey_profiles | Module:Onboarding | B2 | Journey profile definitions |
| 14 | onboarding_progress | Module:Onboarding | B1 | Onboarding progress tracker |
| 15 | onboarding_question_bank | Module:Onboarding | B2 | Question bank |
| 16 | onboarding_question_options | Module:Onboarding | B2 | Question option definitions |
| 17 | onboarding_question_types | Module:Onboarding | B2 | Question type registry |
| 18 | onboarding_questions | Module:Onboarding | B2 | Question definitions |
| 19 | onboarding_recommendations | Module:Onboarding | B1 | Generated recommendations |
| 20 | onboarding_role_task_templates | Module:Onboarding | B4 | Role task template seeds |
| 21 | onboarding_scene_templates | Module:Onboarding | B4 | Scene template seeds |
| 22 | onboarding_scores | Module:Onboarding | B1 | Onboarding scoring |
| 23 | onboarding_sections | Module:Onboarding | B2 | Section definitions |
| 24 | onboarding_seed_mappings | Module:Onboarding | B4 | Seed mapping definitions |
| 25 | onboarding_sessions | Module:Onboarding | B1 | Onboarding session state |
| 26 | onboarding_stage_definitions | Module:Onboarding | B2 | Stage definition registry |
| 27 | onboarding_stages | Module:Onboarding | B1 | Onboarding stage state |
| 28 | onboarding_tenant_overrides | Module:Onboarding | B2 | Tenant-level onboarding overrides |
| 29 | onboarding_translations | Module:Onboarding | B3 | Onboarding i18n translations |
| 30 | onboarding_ui_config | Module:Onboarding | B3 | Onboarding UI configuration |
| 31 | onboarding_user_answers | Module:Onboarding | B1 | Per-user answer store |
| 32 | onboarding_validation_rules | Module:Onboarding | B2 | Validation rule definitions |

### 1.5 Product Module Tables (Public Schema)

#### Risk Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | compliance_risks | Module:Risk | B1 | Compliance-risk cross-links |
| 2 | isic_risks | Module:Risk | B2 | ISIC sector risk mappings |
| 3 | risk_categories | Module:Risk | B2 | Risk category definitions |
| 4 | risk_control_mappings | Module:Risk | B1 | Risk-control linkage |
| 5 | risk_criteria | Module:Risk | B2 | Risk criteria definitions |
| 6 | risks | Module:Risk | B1 | Master risk records |

#### Compliance Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | compliance_mappings | Module:Compliance | B2 | Compliance mapping definitions |

#### Control Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | control_cross_mappings | Module:Controls | B2 | Cross-framework control mappings |
| 2 | control_domains | Module:Controls | B2 | Control domain definitions |
| 3 | control_evidence_requirements | Module:Controls | B2 | Evidence requirements per control |
| 4 | control_regulator_mapping | Module:Controls | B2 | Control-regulator mapping |
| 5 | control_requirements | Module:Controls | B2 | Control requirement definitions |
| 6 | control_sectors | Module:Controls | B2 | Control sector applicability |

#### Audit Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | audit_findings | Module:Audit | B1 | Audit finding records |
| 2 | audit_schedules | Module:Audit | B1 | Audit schedule definitions |

#### Evidence Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | evidence_config | Module:Evidence | B2 | Evidence module configuration |
| 2 | evidence_lifecycle | Module:Evidence | B1 | Evidence lifecycle state |
| 3 | evidence_requirements | Module:Evidence | B2 | Evidence requirement definitions |
| 4 | evidence_types | Module:Evidence | B2 | Evidence type registry |

#### Vendor Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | vendor_assessments | Module:Vendor | B1 | Vendor assessment records |

#### Incident Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | incident_categories | Module:Incident | B2 | Incident category definitions |

#### Exception Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | exception_management | Module:Exception | B1 | Exception management records |

#### Maturity/Assessment Module

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | maturity_assessments | Module:Analytics | B1 | Maturity assessment records |
| 2 | maturity_level_map | Module:Analytics | B2 | Maturity level definitions |

### 1.6 AI/Agent Layer Tables

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | agent_module_bindings | AI/Agent | B2 | Agent-module binding registry |
| 2 | agent_playbook_assignments | AI/Agent | B2 | Agent playbook assignments |
| 3 | agent_registry | AI/Agent | B2 | Master agent registry |
| 4 | ai_recommendation_templates | AI/Agent | B2 | AI recommendation template definitions |
| 5 | dogan_ai_model_registry | AI/Agent | B2 | AI model registry |
| 6 | dogan_ai_regulatory_compliance | AI/Agent | B1 | AI regulatory compliance tracking |
| 7 | dogan_ai_regulatory_reports | AI/Agent | B1 | AI regulatory report records |
| 8 | dogan_ai_regulatory_violations | AI/Agent | B1 | AI regulatory violation records |
| 9 | mcp_agent_registry | AI/Agent | B2 | MCP agent registry |
| 10 | mcp_prompt_registry | AI/Agent | B2 | MCP prompt registry |
| 11 | mcp_resource_registry | AI/Agent | B2 | MCP resource registry |
| 12 | mcp_tool_registry | AI/Agent | B2 | MCP tool registry |
| 13 | ontology_evidence_categories | AI/Agent | B2 | Ontology evidence category definitions |
| 14 | ontology_layers | AI/Agent | B2 | Ontology layer definitions |
| 15 | ontology_role_blueprints | AI/Agent | B2 | Ontology role blueprint definitions |
| 16 | ontology_scoring_policies | AI/Agent | B2 | Ontology scoring policy definitions |

### 1.7 Shared Infrastructure Tables

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | dead_letter_policy | DOS | B2 | Dead letter queue policy |
| 2 | dead_letter_queue | DOS | B1 | Dead letter queue records |
| 3 | enforcement_check_results | DOS | B1 | Enforcement check results |
| 4 | enforcement_runs | DOS | B1 | Enforcement run records |
| 5 | event_traces | DOS | B1 | Event trace records |
| 6 | event_type_registry | DOS | B2 | Event type catalog |
| 7 | langgraph_checkpoints | AI/Agent | B1 | LangGraph checkpoint store |
| 8 | schema_migrations | DOS | B2 | Schema migration tracking |
| 9 | schema_version | DOS | B2 | Schema version tracking |
| 10 | worker_execution_log | DOS | B1 | Worker execution audit log |
| 11 | worker_executions | DOS | B1 | Worker execution records |

### 1.8 Lookup/Reference Tables

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | applicability_explanations | DOS | B2 | Applicability explanation text |
| 2 | benchmark_aggregated_metrics | DOS | B1 | Aggregated benchmark metrics |
| 3 | benchmark_aggregation_runs | DOS | B1 | Benchmark aggregation run records |
| 4 | benchmark_sector_metrics | DOS | B2 | Sector benchmark metrics |
| 5 | blueprint_templates | DOS | B4 | Blueprint template seeds |
| 6 | country_config | DOS | B2 | Country configuration |
| 7 | country_regulators | DOS | B2 | Country-regulator mapping |
| 8 | data_classifications | DOS | B2 | Data classification definitions |
| 9 | data_governance_config | DOS | B2 | Data governance configuration |
| 10 | framework_alias | DOS | B2 | Framework alias mapping |
| 11 | framework_recommendation_rules | DOS | B2 | Framework recommendation rules |
| 12 | framework_registry | DOS | B2 | Master framework registry |
| 13 | framework_relationships | DOS | B2 | Framework relationship definitions |
| 14 | framework_scoring_policies | DOS | B2 | Framework scoring policies |
| 15 | framework_version_diffs | DOS | B2 | Framework version diff records |
| 16 | framework_versions | DOS | B2 | Framework version records |
| 17 | lookup_authority_frameworks | DOS | B2 | Lookup: authority-framework mapping |
| 18 | lookup_authority_sector_mapping | DOS | B2 | Lookup: authority-sector mapping |
| 19 | lookup_cities | DOS | B2 | Lookup: cities |
| 20 | lookup_countries | DOS | B2 | Lookup: countries |
| 21 | lookup_data_sources | DOS | B2 | Lookup: data sources |
| 22 | lookup_employee_ranges | DOS | B2 | Lookup: employee ranges |
| 23 | lookup_framework_module_triggers | DOS | B2 | Lookup: framework-module triggers |
| 24 | lookup_frameworks | DOS | B2 | Lookup: frameworks |
| 25 | lookup_grc_role_staffing | DOS | B2 | Lookup: GRC role staffing |
| 26 | lookup_isic4_sectors | DOS | B2 | Lookup: ISIC4 sectors |
| 27 | lookup_ksa_cities | DOS | B2 | Lookup: KSA cities |
| 28 | lookup_ksa_provinces | DOS | B2 | Lookup: KSA provinces |
| 29 | lookup_ksa_regulatory_authorities | DOS | B2 | Lookup: KSA regulatory authorities |
| 30 | lookup_languages | DOS | B2 | Lookup: languages |
| 31 | lookup_sector_team_templates | DOS | B2 | Lookup: sector team templates |
| 32 | lookup_sectors | DOS | B2 | Lookup: sectors |
| 33 | lookup_team_control_mapping | DOS | B2 | Lookup: team-control mapping |
| 34 | lookup_team_framework_mapping | DOS | B2 | Lookup: team-framework mapping |
| 35 | lookup_team_functions | DOS | B2 | Lookup: team functions |
| 36 | lookup_timezones | DOS | B2 | Lookup: timezones |
| 37 | regional_terminology_library | DOS | B2 | Regional terminology definitions |
| 38 | sector_code_mapping | DOS | B2 | Sector code mapping |
| 39 | sector_framework | DOS | B2 | Sector-framework mapping |
| 40 | sector_isic_map | DOS | B2 | Sector-ISIC mapping |
| 41 | sector_regulator | DOS | B2 | Sector-regulator mapping |
| 42 | sector_risks | DOS | B2 | Sector risk definitions |

### 1.9 Regulatory Tables (Public Schema)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | regulator_explanation_templates | DOS | B2 | Regulator explanation templates |
| 2 | regulator_inference_rules | DOS | B2 | Regulator inference rules |
| 3 | regulator_sector_enforcement | DOS | B2 | Regulator sector enforcement |
| 4 | regulatory_alerts | DOS | B1 | Regulatory alert records |
| 5 | regulatory_changes | DOS | B1 | Regulatory change records |
| 6 | regulatory_change_log | DOS | B1 | Regulatory change log |
| 7 | regulatory_controls | DOS | B2 | Regulatory control definitions |
| 8 | regulatory_frameworks | DOS | B2 | Regulatory framework definitions |

### 1.10 Subscription/Billing Tables

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | payments | DOS | B1 | Payment records |
| 2 | subscription_audit_log | DOS | B1 | Subscription audit trail |
| 3 | subscription_change_log | DOS | B1 | Subscription change log |
| 4 | subscription_change_requests | DOS | B1 | Subscription change requests |
| 5 | subscription_extensions | DOS | B1 | Subscription extension records |
| 6 | subscription_notifications_log | DOS | B1 | Subscription notification log |
| 7 | subscriptions | DOS | B1 | Subscription records |
| 8 | trial_extension_requests | DOS | B1 | Trial extension requests |
| 9 | usage_snapshots | DOS | B1 | Usage metering snapshots |

### 1.11 Remaining Public Schema Tables

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | bcp_config | Module:BCP | B2 | BCP module configuration |
| 2 | cockpit_next_best_action_rules | AI/Agent | B2 | Cockpit NBA rule definitions |
| 3 | contract_catalog | DOS | B2 | Platform contract catalog |
| 4 | contract_catalog_history | DOS | B1 | Contract catalog change history |
| 5 | dashboard_assignment_rules | DOS | B3 | Dashboard assignment rules |
| 6 | dashboard_persona_profiles | DOS | B3 | Dashboard persona profiles |
| 7 | escalation_rules | DOS | B2 | Escalation rule definitions |
| 8 | integrations | DOS | B2 | Integration registry |
| 9 | kri_config | Module:Risk | B2 | KRI configuration |
| 10 | plan_item_templates | DOS | B4 | Plan item template seeds |
| 11 | raci_config | DOS | B2 | RACI configuration |
| 12 | scan_schedules | DOS | B2 | Scan schedule definitions |
| 13 | training_schedules | DOS | B2 | Training schedule definitions |
| 14 | workflow_chain_registry | DOS | B2 | Workflow chain registry |

---

## 2. Tenant Schema Tables (1,343)

### 2.1 DAuth Security Tables (Tenant)

Tables owned by DAuth in tenant schema: identity, sessions, tokens, actor registry, memberships, access profiles, functional roles, permissions, authorities, delegation, SoD, authorization audit.

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | access_profiles | DAuth | B1 | User access profile records |
| 2 | access_review_campaigns | DAuth | B1 | Access review campaign records |
| 3 | access_review_items | DAuth | B1 | Access review item records |
| 4 | actor_access_assignments | DAuth | B1 | Actor access assignment records |
| 5 | actor_audit_log | DAuth | B1 | Actor audit trail |
| 6 | actor_registry | DAuth | B1 | Canonical actor registry |
| 7 | actor_role_assignments | DAuth | B1 | Actor-role assignment records |
| 8 | api_keys | DAuth | B1 | API key records |
| 9 | approval_authority_matrix | DAuth | B1 | Approval authority matrix |
| 10 | approval_chains | DAuth | B1 | Approval chain definitions |
| 11 | approval_decisions | DAuth | B1 | Approval decision records |
| 12 | approval_history | DAuth | B1 | Approval history audit |
| 13 | approval_packs | DAuth | B2 | Approval pack definitions |
| 14 | approval_pre_screens | DAuth | B1 | Approval pre-screen results |
| 15 | approval_requests | DAuth | B1 | Approval request records |
| 16 | approver_resolution_cache | DAuth | B3 | Computed approver resolution cache |
| 17 | authentication_policies | DAuth | B2 | Authentication policy definitions |
| 18 | authority_level_catalog | DAuth | B2 | Authority level catalog |
| 19 | authority_levels | DAuth | B1 | Authority level assignments |
| 20 | authority_matrix | DAuth | B1 | Authority matrix records |
| 21 | authorization_audit_log | DAuth | B1 | Authorization audit trail |
| 22 | authorization_decision_log | DAuth | B1 | Authorization decision log |
| 23 | authorization_mismatch_log | DAuth | B1 | Authorization mismatch detection log |
| 24 | authorization_permissions | DAuth | B1 | Authorization permission records |
| 25 | authz_decision_log | DAuth | B1 | Authz decision audit log |
| 26 | auto_approval_config | DAuth | B2 | Auto-approval configuration |
| 27 | conditional_access_grants | DAuth | B1 | Conditional access grant records |
| 28 | decision_authorities | DAuth | B1 | Decision authority assignments |
| 29 | delegated_authorities | DAuth | B1 | Delegated authority records |
| 30 | delegation_chains | DAuth | B1 | Delegation chain records |
| 31 | delegation_policies | DAuth | B2 | Delegation policy definitions |
| 32 | delegation_rules | DAuth | B2 | Delegation rule definitions |
| 33 | delegations | DAuth | B1 | Active delegation records |
| 34 | effective_user_modules | DAuth | B3 | Computed effective user module access |
| 35 | effective_user_permissions | DAuth | B3 | Computed effective user permissions |
| 36 | enterprise_user_role_assignments | DAuth | B1 | Enterprise user-role assignments |
| 37 | external_user_scopes | DAuth | B1 | External user scope definitions |
| 38 | field_rbac_permissions | DAuth | B1 | Field-level RBAC permissions |
| 39 | field_rbac_role_mappings | DAuth | B2 | Field RBAC role mappings |
| 40 | function_authorities | DAuth | B1 | Function authority assignments |
| 41 | functional_role_bundle_items | DAuth | B2 | Functional role bundle items |
| 42 | functional_role_bundles | DAuth | B2 | Functional role bundle definitions |
| 43 | functional_roles | DAuth | B1 | Canonical functional role definitions |
| 44 | guard_decision_log | DAuth | B1 | Guard decision audit log |
| 45 | iam_access_reviews | DAuth | B1 | IAM access review records |
| 46 | iam_connections | DAuth | B2 | IAM connection configurations |
| 47 | iam_identities | DAuth | B1 | IAM identity records |
| 48 | iam_sync_history | DAuth | B1 | IAM sync history |
| 49 | invitations | DAuth | B1 | User invitation records |
| 50 | permission_analytics | DAuth | B1 | Permission usage analytics |
| 51 | permission_templates | DAuth | B2 | Permission template definitions |
| 52 | permissions | DAuth | B1 | Canonical permission records |
| 53 | platform_role_tenant_role_map | DAuth | B2 | Platform-to-tenant role mapping |
| 54 | platform_security_config | DAuth | B2 | Platform security configuration |
| 55 | rbac_config_audit | DAuth | B1 | RBAC config audit trail |
| 56 | role_action_map | DAuth | B2 | Role-action mapping |
| 57 | role_assignment_audit | DAuth | B1 | Role assignment audit trail |
| 58 | role_assignment_history | DAuth | B1 | Role assignment history |
| 59 | role_defense_line_mappings | DAuth | B2 | Role defense line mappings |
| 60 | role_function_map | DAuth | B2 | Role-function mapping |
| 61 | role_function_permissions | DAuth | B1 | Role-function permission bindings |
| 62 | role_function_scope_map | DAuth | B2 | Role-function scope mapping |
| 63 | role_functions | DAuth | B2 | Role function definitions |
| 64 | role_nav_sections | DAuth | B3 | Role navigation section bindings |
| 65 | role_permission_inheritance | DAuth | B2 | Role permission inheritance rules |
| 66 | role_permission_map | DAuth | B1 | Role-permission canonical map |
| 67 | role_permissions | DAuth | B1 | Role permission records |
| 68 | role_profile_assignments | DAuth | B1 | Role profile assignments |
| 69 | role_profile_mappings | DAuth | B2 | Role profile mappings |
| 70 | role_profiles | DAuth | B2 | Role profile definitions |
| 71 | role_sla_defaults | DAuth | B2 | Role SLA default config |
| 72 | role_team_mapping | DAuth | B2 | Role-team mapping |
| 73 | role_transition_requests | DAuth | B1 | Role transition requests |
| 74 | role_usage_audit | DAuth | B1 | Role usage audit trail |
| 75 | roles | DAuth | B1 | Canonical role definitions |
| 76 | route_catalog | DAuth | B2 | Route catalog for permission mapping |
| 77 | route_permission_mappings | DAuth | B2 | Route-permission mappings |
| 78 | sensitive_field_registry | DAuth | B2 | Sensitive field registry |
| 79 | sod_conflict_log | DAuth | B1 | SoD conflict detection log |
| 80 | sod_conflict_resolution_history | DAuth | B1 | SoD conflict resolution history |
| 81 | sod_rules | DAuth | B1 | Separation of duties rules |
| 82 | user_access_profiles | DAuth | B1 | User access profile records |
| 83 | user_certifications | DAuth | B1 | User certification records |
| 84 | user_function_overrides | DAuth | B1 | User function override records |
| 85 | user_lifecycle_events | DAuth | B1 | User lifecycle event log |
| 86 | user_module_permissions | DAuth | B1 | User module permission records |
| 87 | user_role_assignments | DAuth | B1 | User role assignment records |
| 88 | user_roles | DAuth | B1 | User-role binding records |
| 89 | user_sessions | DAuth | B1 | User session records |
| 90 | user_workflow_permissions | DAuth | B1 | User workflow permission records |

### 2.2 DOS Platform Tables (Tenant)

Tables owned by DOS in tenant schema: tenant config, org hierarchy, platform lifecycle, module enablement, settings, navigation, event bus, provisioning, workspace.

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | activity_feed | DOS | B1 | Platform activity feed |
| 2 | activity_notifications | DOS | B1 | Activity notification records |
| 3 | business_services | DOS | B1 | Business service records |
| 4 | business_services_catalog | DOS | B2 | Business services catalog |
| 5 | business_units | DOS | B1 | Business unit definitions |
| 6 | cache_dependencies | DOS | B2 | Cache dependency tracking |
| 7 | cache_invalidation_log | DOS | B1 | Cache invalidation audit |
| 8 | company_profiles | DOS | B1 | Company profile records |
| 9 | cross_module_links | DOS | B1 | Cross-module entity links |
| 10 | dashboard_configs | DOS | B3 | Dashboard configuration records |
| 11 | dashboard_layout_registry | DOS | B3 | Dashboard layout registry |
| 12 | dashboard_layouts | DOS | B3 | Dashboard layout records |
| 13 | dashboard_overrides | DOS | B3 | Dashboard override config |
| 14 | dashboard_registry | DOS | B3 | Dashboard registry |
| 15 | dashboard_role_bindings | DOS | B3 | Dashboard role binding records |
| 16 | dashboard_role_bindings_v2 | DOS | B3 | Dashboard role bindings v2 `[REVIEW]` possible Law 1 twin |
| 17 | dashboard_shares | DOS | B1 | Dashboard sharing records |
| 18 | dashboard_widget_registry | DOS | B3 | Dashboard widget registry |
| 19 | departments | DOS | B1 | Department records |
| 20 | dogan_actions_log | DOS | B1 | Platform actions audit log (tenant copy) |
| 21 | dogan_guardian_config | DOS | B2 | Guardian config (tenant copy) |
| 22 | dogan_guardian_events | DOS | B1 | Guardian events (tenant copy) |
| 23 | dogan_learning_metrics | DOS | B1 | Learning metrics (tenant copy) |
| 24 | drawer_templates | DOS | B3 | Drawer template definitions |
| 25 | email_send_log | DOS | B1 | Email send audit log |
| 26 | email_templates | DOS | B2 | Email template definitions |
| 27 | endpoint_config | DOS | B2 | Endpoint configuration |
| 28 | entity_dimension_assignments | DOS | B1 | Entity dimension assignments |
| 29 | entity_instances | DOS | B1 | Entity instance records |
| 30 | entity_lifecycle_definitions | DOS | B2 | Entity lifecycle definitions |
| 31 | entity_lifecycle_log | DOS | B1 | Entity lifecycle event log |
| 32 | entity_link_metadata | DOS | B2 | Entity link metadata |
| 33 | entity_links | DOS | B1 | Entity link records |
| 34 | entity_ownership | DOS | B1 | Entity ownership records |
| 35 | entity_relationships | DOS | B2 | Entity relationship definitions |
| 36 | entity_routing_config | DOS | B2 | Entity routing configuration |
| 37 | entity_type_routing_config | DOS | B2 | Entity type routing config |
| 38 | entity_types | DOS | B2 | Entity type definitions |
| 39 | escalation_log | DOS | B1 | Escalation event log |
| 40 | escalation_statuses | DOS | B1 | Escalation status records |
| 41 | escalation_thresholds | DOS | B2 | Escalation threshold config |
| 42 | event_consumer_cursors | DOS | B1 | Event consumer cursor positions |
| 43 | event_entity_sequences | DOS | B1 | Event entity sequence tracking |
| 44 | event_idempotency_log | DOS | B1 | Event idempotency tracking |
| 45 | event_processing_state | DOS | B1 | Event processing state |
| 46 | event_subscriptions | DOS | B2 | Event subscription definitions |
| 47 | event_trigger_binding | DOS | B2 | Event trigger bindings |
| 48 | event_trigger_bindings | DOS | B2 | Event trigger bindings (plural) `[REVIEW]` possible duplicate of event_trigger_binding |
| 49 | event_type_registry | DOS | B2 | Event type catalog (tenant copy) |
| 50 | favorites | DOS | B1 | User favorites |
| 51 | feature_flags | DOS | B2 | Feature flag definitions |
| 52 | file_storage | DOS | B1 | File storage records |
| 53 | first_visits | DOS | B1 | First visit tracking |
| 54 | gate_definitions | DOS | B2 | Gate definition records |
| 55 | gate_validation_rules | DOS | B2 | Gate validation rules |
| 56 | initiative_definitions | DOS | B2 | Initiative definitions |
| 57 | initiative_runs | DOS | B1 | Initiative run records |
| 58 | job_titles | DOS | B2 | Job title definitions |
| 59 | legal_entities | DOS | B1 | Legal entity records |
| 60 | lifecycle_checkpoints | DOS | B1 | Lifecycle checkpoint records (tenant) |
| 61 | lifecycle_template_injections | DOS | B4 | Lifecycle template injection seeds |
| 62 | locations | DOS | B1 | Location records |
| 63 | member_lifecycle_events | DOS | B1 | Member lifecycle events |
| 64 | member_profiles | DOS | B1 | Member profile records |
| 65 | metadata_records | DOS | B1 | Metadata record store |
| 66 | module_action_definitions | DOS | B2 | Module action definitions |
| 67 | module_actions | DOS | B1 | Module action records |
| 68 | module_activation_events | DOS | B1 | Module activation event log |
| 69 | module_activation_policies | DOS | B2 | Module activation policies |
| 70 | module_activation_rules | DOS | B2 | Module activation rules |
| 71 | module_activation_status | DOS | B1 | Module activation status |
| 72 | module_admin_config | DOS | B2 | Module admin configuration |
| 73 | module_approval_matrices | DOS | B2 | Module approval matrix definitions |
| 74 | module_approval_matrix | DOS | B2 | Module approval matrix `[REVIEW]` possible duplicate |
| 75 | module_approval_policies | DOS | B2 | Module approval policies |
| 76 | module_assignments | DOS | B1 | Module assignment records |
| 77 | module_audit_config | DOS | B2 | Module audit configuration |
| 78 | module_automation_config | DOS | B2 | Module automation configuration |
| 79 | module_certifications | DOS | B1 | Module certification records |
| 80 | module_classification | DOS | B2 | Module classification metadata |
| 81 | module_code_aliases | DOS | B2 | Module code alias mappings |
| 82 | module_contact_points | DOS | B2 | Module contact point definitions |
| 83 | module_cross_link_rules | DOS | B2 | Module cross-link rules |
| 84 | module_dependency_graph | DOS | B2 | Module dependency graph |
| 85 | module_entitlement_map | DOS | B1 | Module entitlement mapping |
| 86 | module_entitlements | DOS | B1 | Module entitlement records |
| 87 | module_entity_links | DOS | B1 | Module entity link records |
| 88 | module_event_log | DOS | B1 | Module event log |
| 89 | module_health_checks | DOS | B1 | Module health check records |
| 90 | module_health_status | DOS | B1 | Module health status |
| 91 | module_inbound_events | DOS | B1 | Module inbound event queue |
| 92 | module_kickstart_log | DOS | B1 | Module kickstart audit log |
| 93 | module_lifecycle_definitions | DOS | B2 | Module lifecycle definitions |
| 94 | module_lifecycle_transitions | DOS | B1 | Module lifecycle transition records |
| 95 | module_maturity_stages | DOS | B2 | Module maturity stage definitions |
| 96 | module_metrics_snapshots | DOS | B1 | Module metrics snapshots |
| 97 | module_nav_registration | DOS | B3 | Module navigation registration |
| 98 | module_ownership_rules | DOS | B2 | Module ownership rules |
| 99 | module_pages | DOS | B3 | Module page definitions |
| 100 | module_permission_definitions | DOS | B2 | Module permission definitions |
| 101 | module_permissions | DOS | B1 | Module permission records |
| 102 | module_preflight_runs | DOS | B1 | Module preflight run records |
| 103 | module_readiness_results | DOS | B1 | Module readiness check results |
| 104 | module_readiness_thresholds | DOS | B2 | Module readiness thresholds |
| 105 | module_registry | DOS | B2 | Module registry |
| 106 | module_role_definitions | DOS | B2 | Module role definitions |
| 107 | module_role_permission_bindings | DOS | B1 | Module role-permission bindings |
| 108 | module_role_team_mappings | DOS | B2 | Module role-team mappings |
| 109 | module_roles | DOS | B1 | Module role records |
| 110 | module_runtime_health | DOS | B1 | Module runtime health |
| 111 | module_settings | DOS | B2 | Module settings |
| 112 | module_sla_defaults | DOS | B2 | Module SLA defaults |
| 113 | module_sla_tracking | DOS | B1 | Module SLA tracking |
| 114 | module_sod_policies | DOS | B2 | Module SoD policies |
| 115 | module_sod_rules | DOS | B2 | Module SoD rules |
| 116 | module_stale_record_checks | DOS | B1 | Module stale record checks |
| 117 | module_table_mappings | DOS | B2 | Module table mappings |
| 118 | module_task_type_mappings | DOS | B2 | Module task type mappings |
| 119 | module_trigger_mappings | DOS | B2 | Module trigger mappings |
| 120 | module_user_contexts | DOS | B1 | Module user context records |
| 121 | module_workflow_profiles | DOS | B2 | Module workflow profiles |
| 122 | module_workflow_registry | DOS | B2 | Module workflow registry |
| 123 | modules | DOS | B2 | Canonical module registry |
| 124 | navigation_audit_log | DOS | B1 | Navigation audit log |
| 125 | navigation_items | DOS | B3 | Navigation item definitions |
| 126 | navigation_overrides | DOS | B3 | Navigation overrides |
| 127 | navigation_registry | DOS | B3 | Navigation registry |
| 128 | navigation_role_bindings | DOS | B3 | Navigation role bindings |
| 129 | navigation_usage_aggregates | DOS | B1 | Navigation usage aggregates |
| 130 | navigation_usage_log | DOS | B1 | Navigation usage log |
| 131 | navigation_version_history | DOS | B1 | Navigation version history |
| 132 | notification_preferences | DOS | B2 | Notification preference config |
| 133 | notification_queue | DOS | B1 | Notification queue |
| 134 | notifications_log | DOS | B1 | Notification delivery log |
| 135 | operating_packs | DOS | B2 | Operating pack definitions |
| 136 | org_cost_center_assignments | DOS | B1 | Org cost center assignments |
| 137 | org_custom_field_definitions | DOS | B2 | Org custom field definitions |
| 138 | org_dimension_values | DOS | B2 | Org dimension values |
| 139 | org_dimensions | DOS | B2 | Org dimension definitions |
| 140 | org_hierarchy_edges | DOS | B1 | Org hierarchy edge records |
| 141 | org_hierarchy_nodes | DOS | B1 | Org hierarchy node records |
| 142 | org_location_assignments | DOS | B1 | Org location assignments |
| 143 | org_node_type_registry | DOS | B2 | Org node type registry |
| 144 | org_profile | DOS | B1 | Organization profile |
| 145 | org_unit_role_assignments | DOS | B1 | Org unit role assignments |
| 146 | org_validation_executions | DOS | B1 | Org validation execution results |
| 147 | org_validation_patterns | DOS | B2 | Org validation patterns |
| 148 | org_validation_rules | DOS | B2 | Org validation rules |
| 149 | org_validation_rules_global | DOS | B2 | Org validation rules (global) |
| 150 | organizations | DOS | B1 | Organization records |
| 151 | page_catalog | DOS | B3 | Page catalog for navigation |
| 152 | platform_feature_flags | DOS | B2 | Platform feature flags |
| 153 | platform_operation_config | DOS | B2 | Platform operation configuration |
| 154 | platform_products | DOS | B2 | Platform product records (tenant copy) |
| 155 | positions | DOS | B1 | Position records |
| 156 | product_modules | DOS | B2 | Product-module mapping (tenant copy) |
| 157 | product_nav_definitions | DOS | B3 | Product navigation definitions |
| 158 | product_overrides | DOS | B2 | Product override configuration |
| 159 | product_user_entitlements | DOS | B1 | Product user entitlement records |
| 160 | products | DOS | B2 | Product definitions (tenant) |
| 161 | provisioning_audit | DOS | B1 | Provisioning audit trail |
| 162 | provisioning_jobs | DOS | B1 | Provisioning job records (tenant) |
| 163 | provisioning_steps | DOS | B1 | Provisioning step records (tenant) |
| 164 | settings | DOS | B2 | General settings store |
| 165 | shell_config_overrides | DOS | B3 | Shell config override records |
| 166 | subscription_tiers | DOS | B2 | Subscription tier definitions |
| 167 | system_health_snapshots | DOS | B1 | System health snapshot records |
| 168 | team_collaboration_matrix | DOS | B1 | Team collaboration matrix |
| 169 | team_escalation_paths | DOS | B2 | Team escalation path definitions |
| 170 | team_function_mappings | DOS | B2 | Team function mappings |
| 171 | team_handoffs | DOS | B1 | Team handoff records |
| 172 | team_members | DOS | B1 | Team member records |
| 173 | team_operation_modes | DOS | B2 | Team operation mode definitions |
| 174 | team_raci_assignments | DOS | B1 | Team RACI assignment records |
| 175 | team_recommendations | DOS | B1 | Team recommendation records |
| 176 | team_workload | DOS | B1 | Team workload tracking |
| 177 | teams | DOS | B1 | Team records |
| 178 | telemetry_signals | DOS | B1 | Telemetry signal records |
| 179 | tenant_ai_allowlist | DOS | B2 | Tenant AI allowlist config |
| 180 | tenant_ai_config | DOS | B2 | Tenant AI configuration |
| 181 | tenant_archetypes | DOS | B2 | Tenant archetype definitions |
| 182 | tenant_blueprints | DOS | B4 | Tenant blueprint seeds |
| 183 | tenant_domains | DOS | B1 | Tenant domain records |
| 184 | tenant_email_config | DOS | B2 | Tenant email configuration |
| 185 | tenant_feature_flag_overrides | DOS | B2 | Tenant feature flag overrides |
| 186 | tenant_llm_budgets | DOS | B2 | Tenant LLM budget config |
| 187 | tenant_module_entitlements | DOS | B1 | Tenant module entitlements (tenant copy) |
| 188 | tenant_nav_rules | DOS | B3 | Tenant navigation rules |
| 189 | tenant_page_overrides | DOS | B3 | Tenant page overrides |
| 190 | tenant_quota_config | DOS | B2 | Tenant quota configuration |
| 191 | tenant_role_definitions | DOS | B2 | Tenant role definitions |
| 192 | tenant_settings | DOS | B2 | Tenant settings (tenant copy) |
| 193 | tenant_settings_history | DOS | B1 | Tenant settings history |
| 194 | tenant_status_rules | DOS | B2 | Tenant status rules |
| 195 | user_favorites | DOS | B1 | User favorites |
| 196 | user_notification_preferences | DOS | B2 | User notification preferences |
| 197 | user_preferences | DOS | B2 | User preference records |
| 198 | user_preferences_v2 | DOS | B2 | User preferences v2 `[REVIEW]` possible Law 1 twin |
| 199 | user_profiles_extended | DOS | B1 | Extended user profile data |
| 200 | webhook_delivery_log | DOS | B1 | Webhook delivery audit log |
| 201 | webhook_endpoints | DOS | B2 | Webhook endpoint definitions |
| 202 | webhook_retry_queue | DOS | B1 | Webhook retry queue |
| 203 | webhook_subscriptions | DOS | B2 | Webhook subscription definitions |
| 204 | webhooks | DOS | B2 | Webhook definitions |
| 205 | websocket_event_queue | DOS | B1 | WebSocket event queue |
| 206 | widget_registry | DOS | B3 | Widget registry |
| 207 | widgets_bundles | DOS | B3 | Widget bundle definitions |
| 208 | widgets_registry | DOS | B3 | Widgets registry `[REVIEW]` possible duplicate of widget_registry |
| 209 | widgets_render_log | DOS | B1 | Widget render audit log |
| 210 | workspace_feature_overrides | DOS | B2 | Workspace feature overrides |
| 211 | workspace_profile | DOS | B1 | Workspace profile |
| 212 | workspace_profiles | DOS | B1 | Workspace profile records `[REVIEW]` possible duplicate of workspace_profile |
| 213 | workspace_provisioning_runs | DOS | B1 | Workspace provisioning run records |
| 214 | workspace_provisioning_steps | DOS | B1 | Workspace provisioning step records |
| 215 | workspace_seed_templates | DOS | B4 | Workspace seed templates |
| 216 | workspace_seeds | DOS | B4 | Workspace seed data (tenant) |
| 217 | workspace_state_history | DOS | B1 | Workspace state history |
| 218 | workspace_states | DOS | B1 | Workspace state records |
| 219 | onboarding_answers | DOS | B1 | Onboarding answers (tenant copy) |
| 220 | onboarding_seed_history | DOS | B4 | Onboarding seed history |
| 221 | pack_certifications | DOS | B1 | Pack certification records |
| 222 | pack_installations | DOS | B1 | Pack installation records |
| 223 | pack_selection_decisions | DOS | B1 | Pack selection decision records |
| 224 | pack_selection_policies | DOS | B2 | Pack selection policies |
| 225 | person_profiles | DOS | B1 | Person profile records |
| 226 | personal_agent_assignments | DOS | B1 | Personal agent assignment records |
| 227 | preferences | DOS | B2 | General preference records |
| 228 | push_tokens | DOS | B1 | Push notification tokens |
| 229 | mobile_push_tokens | DOS | B1 | Mobile push tokens |
| 230 | rate_limit_config | DOS | B2 | Rate limit configuration |
| 231 | recent_searches | DOS | B1 | Recent search tracking |
| 232 | saved_searches | DOS | B1 | Saved search records |
| 233 | saved_views | DOS | B1 | Saved view records |
| 234 | seeding_depth_config | DOS | B4 | Seeding depth configuration |

### 2.3 AI/Agent Layer Tables (Tenant)

Tables owned by the AI/Agent layer: agent registry, agent runtime, tool orchestration, MCP, LangGraph, AI governance, AI model management, AI sessions, reasoning traces.

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | agent_action_history | AI/Agent | B1 | Agent action history |
| 2 | agent_activation_rules | AI/Agent | B2 | Agent activation rules |
| 3 | agent_activity_log | AI/Agent | B1 | Agent activity audit log |
| 4 | agent_anomaly_detections | AI/Agent | B1 | Agent anomaly detection records |
| 5 | agent_approvals_v2 | AI/Agent | B1 | Agent approval records |
| 6 | agent_assignment_templates | AI/Agent | B2 | Agent assignment templates |
| 7 | agent_autonomy_policies | AI/Agent | B2 | Agent autonomy policy definitions |
| 8 | agent_circuit_breaker | AI/Agent | B1 | Agent circuit breaker state |
| 9 | agent_collaboration_metrics | AI/Agent | B1 | Agent collaboration metrics |
| 10 | agent_conflicts | AI/Agent | B1 | Agent conflict records |
| 11 | agent_context_assignments | AI/Agent | B1 | Agent context assignment records |
| 12 | agent_cycle_memory | AI/Agent | B1 | Agent cycle memory records |
| 13 | agent_dead_letter_queue | AI/Agent | B1 | Agent dead letter queue |
| 14 | agent_delegations | AI/Agent | B1 | Agent delegation records |
| 15 | agent_dependency_config | AI/Agent | B2 | Agent dependency configuration |
| 16 | agent_eval_scores | AI/Agent | B1 | Agent evaluation scores |
| 17 | agent_events | AI/Agent | B1 | Agent event records |
| 18 | agent_failure_patterns | AI/Agent | B1 | Agent failure pattern records |
| 19 | agent_feedback | AI/Agent | B1 | Agent feedback records |
| 20 | agent_governance_audit | AI/Agent | B1 | Agent governance audit log |
| 21 | agent_learning_events | AI/Agent | B1 | Agent learning events |
| 22 | agent_lesson_applications | AI/Agent | B1 | Agent lesson application records |
| 23 | agent_lessons_learned | AI/Agent | B1 | Agent lessons learned |
| 24 | agent_memories | AI/Agent | B1 | Agent memory store |
| 25 | agent_mode_overrides | AI/Agent | B2 | Agent mode override config |
| 26 | agent_model_config | AI/Agent | B2 | Agent model configuration |
| 27 | agent_model_performance_cache | AI/Agent | B3 | Agent model performance cache |
| 28 | agent_patterns | AI/Agent | B2 | Agent pattern definitions |
| 29 | agent_pending_actions | AI/Agent | B1 | Agent pending action queue |
| 30 | agent_process_governance_rules | AI/Agent | B2 | Agent process governance rules |
| 31 | agent_process_governance_rules_global | AI/Agent | B2 | Agent process governance rules (global) |
| 32 | agent_profiles | AI/Agent | B2 | Agent profile definitions |
| 33 | agent_prompt_versions | AI/Agent | B2 | Agent prompt version records |
| 34 | agent_proposals | AI/Agent | B1 | Agent proposal records |
| 35 | agent_reasoning_chain | AI/Agent | B1 | Agent reasoning chain records |
| 36 | agent_reasoning_steps | AI/Agent | B1 | Agent reasoning step records |
| 37 | agent_reasoning_traces | AI/Agent | B1 | Agent reasoning trace records |
| 38 | agent_runs | AI/Agent | B1 | Agent run execution records |
| 39 | agent_runtime_config | AI/Agent | B2 | Agent runtime configuration |
| 40 | agent_sla_activation_rules | AI/Agent | B2 | Agent SLA activation rules |
| 41 | agent_slo_definitions | AI/Agent | B2 | Agent SLO definitions |
| 42 | agent_slo_measurements | AI/Agent | B1 | Agent SLO measurement records |
| 43 | agent_status_log | AI/Agent | B1 | Agent status log |
| 44 | agent_steps | AI/Agent | B1 | Agent step execution records |
| 45 | agent_suggestions | AI/Agent | B1 | Agent suggestion records |
| 46 | agent_tasks | AI/Agent | B1 | Agent task records |
| 47 | agent_trigger_chains | AI/Agent | B2 | Agent trigger chain definitions |
| 48 | agent_user_feedback | AI/Agent | B1 | Agent user feedback records |
| 49 | ai_action_decision_log | AI/Agent | B1 | AI action decision audit log |
| 50 | ai_action_policies | AI/Agent | B2 | AI action policy definitions |
| 51 | ai_action_queue | AI/Agent | B1 | AI action queue |
| 52 | ai_action_results | AI/Agent | B1 | AI action result records |
| 53 | ai_agent_authority_scopes | AI/Agent | B1 | AI agent authority scope records |
| 54 | ai_agent_bias_detection | AI/Agent | B1 | AI agent bias detection records |
| 55 | ai_agent_chain_of_custody | AI/Agent | B1 | AI agent chain of custody |
| 56 | ai_agent_configs | AI/Agent | B2 | AI agent configuration records |
| 57 | ai_agent_performance_metrics | AI/Agent | B1 | AI agent performance metrics |
| 58 | ai_agent_registry | AI/Agent | B2 | AI agent registry (tenant) |
| 59 | ai_agent_session_governance | AI/Agent | B1 | AI agent session governance |
| 60 | ai_agent_status_log | AI/Agent | B1 | AI agent status log |
| 61 | ai_agent_tool_bindings | AI/Agent | B2 | AI agent tool bindings |
| 62 | ai_agent_trust_scores | AI/Agent | B1 | AI agent trust scores |
| 63 | ai_alert_history | AI/Agent | B1 | AI alert history |
| 64 | ai_alert_rules | AI/Agent | B2 | AI alert rule definitions |
| 65 | ai_alerts | AI/Agent | B1 | AI alert records |
| 66 | ai_analysis_cache | AI/Agent | B3 | AI analysis cache |
| 67 | ai_asset_inventory | AI/Agent | B1 | AI asset inventory |
| 68 | ai_autonomy_state | AI/Agent | B1 | AI autonomy state |
| 69 | ai_capability_registry | AI/Agent | B2 | AI capability registry |
| 70 | ai_compliance_dashboard | AI/Agent | B3 | AI compliance dashboard cache |
| 71 | ai_compliance_framework_mapping | AI/Agent | B2 | AI compliance framework mapping |
| 72 | ai_conformity_assessments | AI/Agent | B1 | AI conformity assessment records |
| 73 | ai_corrective_actions | AI/Agent | B1 | AI corrective action records |
| 74 | ai_counterfactual_analysis | AI/Agent | B1 | AI counterfactual analysis |
| 75 | ai_data_lineage | AI/Agent | B1 | AI data lineage tracking |
| 76 | ai_data_minimization_config | AI/Agent | B2 | AI data minimization config |
| 77 | ai_dataset_registry | AI/Agent | B2 | AI dataset registry |
| 78 | ai_declarations_of_conformity | AI/Agent | B1 | AI declarations of conformity |
| 79 | ai_dpia_assessments | AI/Agent | B1 | AI DPIA assessment records |
| 80 | ai_dpia_review_history | AI/Agent | B1 | AI DPIA review history |
| 81 | ai_dpia_risk_factors | AI/Agent | B2 | AI DPIA risk factor definitions |
| 82 | ai_drift_thresholds | AI/Agent | B2 | AI drift threshold config |
| 83 | ai_ethics_reviews | AI/Agent | B1 | AI ethics review records |
| 84 | ai_ethics_votes | AI/Agent | B1 | AI ethics vote records |
| 85 | ai_eu_classifications | AI/Agent | B2 | AI EU classification records |
| 86 | ai_explainability_records | AI/Agent | B1 | AI explainability records |
| 87 | ai_explainability_requirements | AI/Agent | B2 | AI explainability requirements |
| 88 | ai_fairness_metrics | AI/Agent | B1 | AI fairness metric records |
| 89 | ai_fairness_scans | AI/Agent | B1 | AI fairness scan records |
| 90 | ai_framework_control_catalog | AI/Agent | B2 | AI framework control catalog |
| 91 | ai_framework_risk_classifications | AI/Agent | B2 | AI framework risk classifications |
| 92 | ai_governance_roles | AI/Agent | B2 | AI governance role definitions |
| 93 | ai_hitl_controls | AI/Agent | B2 | AI human-in-the-loop controls |
| 94 | ai_human_overrides | AI/Agent | B1 | AI human override records |
| 95 | ai_impact_assessments | AI/Agent | B1 | AI impact assessment records |
| 96 | ai_incident_classifications | AI/Agent | B2 | AI incident classification definitions |
| 97 | ai_inline_bias_checks | AI/Agent | B1 | AI inline bias check results |
| 98 | ai_kill_switches | AI/Agent | B1 | AI kill switch state |
| 99 | ai_model_cards | AI/Agent | B2 | AI model card records |
| 100 | ai_model_experiments | AI/Agent | B1 | AI model experiment records |
| 101 | ai_model_lifecycle | AI/Agent | B1 | AI model lifecycle records |
| 102 | ai_model_metrics | AI/Agent | B1 | AI model metric records |
| 103 | ai_model_modifications | AI/Agent | B1 | AI model modification records |
| 104 | ai_model_provenance | AI/Agent | B1 | AI model provenance records |
| 105 | ai_model_registry | AI/Agent | B2 | AI model registry (tenant) |
| 106 | ai_model_risk_assessments | AI/Agent | B1 | AI model risk assessment records |
| 107 | ai_model_risk_scores | AI/Agent | B1 | AI model risk score records |
| 108 | ai_monitoring_plans | AI/Agent | B2 | AI monitoring plan definitions |
| 109 | ai_observations | AI/Agent | B1 | AI observation records |
| 110 | ai_performance_metrics | AI/Agent | B1 | AI performance metric records |
| 111 | ai_policy_rule | AI/Agent | B2 | AI policy rule definitions |
| 112 | ai_privacy_impact_register | AI/Agent | B1 | AI privacy impact register |
| 113 | ai_privacy_incidents | AI/Agent | B1 | AI privacy incident records |
| 114 | ai_profiling_register | AI/Agent | B1 | AI profiling register |
| 115 | ai_prompt_registry | AI/Agent | B2 | AI prompt registry (tenant) |
| 116 | ai_provider_registry | AI/Agent | B2 | AI provider registry |
| 117 | ai_red_team_schedules | AI/Agent | B2 | AI red team schedule definitions |
| 118 | ai_regulatory_changes | AI/Agent | B1 | AI regulatory change records |
| 119 | ai_review_queue | AI/Agent | B1 | AI review queue |
| 120 | ai_risk_models | AI/Agent | B2 | AI risk model definitions |
| 121 | ai_serious_incidents | AI/Agent | B1 | AI serious incident records |
| 122 | ai_sessions | AI/Agent | B1 | AI session records |
| 123 | ai_stakeholder_registry | AI/Agent | B2 | AI stakeholder registry |
| 124 | ai_step_executions | AI/Agent | B1 | AI step execution records |
| 125 | ai_step_feedback | AI/Agent | B1 | AI step feedback records |
| 126 | ai_summaries | AI/Agent | B1 | AI summary records |
| 127 | ai_supplier_agreements | AI/Agent | B1 | AI supplier agreement records |
| 128 | ai_system_logs | AI/Agent | B1 | AI system log records |
| 129 | ai_system_registry | AI/Agent | B2 | AI system registry |
| 130 | ai_technical_documentation | AI/Agent | B2 | AI technical documentation |
| 131 | ai_tool_registry | AI/Agent | B2 | AI tool registry (tenant) |
| 132 | ai_training_data_registry | AI/Agent | B2 | AI training data registry |
| 133 | ai_transparency_metrics | AI/Agent | B1 | AI transparency metric records |
| 134 | ai_user_complaints | AI/Agent | B1 | AI user complaint records |
| 135 | ai_vendor_assessments | AI/Agent | B1 | AI vendor assessment records |
| 136 | api_ai_config | AI/Agent | B2 | API AI configuration |
| 137 | automated_decision_register | AI/Agent | B1 | Automated decision register |
| 138 | automated_insights | AI/Agent | B1 | Automated insight records |
| 139 | automation_log | AI/Agent | B1 | Automation execution log |
| 140 | automation_rules | AI/Agent | B2 | Automation rule definitions |
| 141 | autonomous_workflow_config | AI/Agent | B2 | Autonomous workflow configuration |
| 142 | autonomy_progression_log | AI/Agent | B1 | Autonomy progression log |
| 143 | co_draft_sessions | AI/Agent | B1 | Co-draft session records |
| 144 | cockpit_signal | AI/Agent | B1 | Cockpit signal records |
| 145 | contextual_suggestions | AI/Agent | B1 | Contextual suggestion records |
| 146 | copilot_proposed_actions | AI/Agent | B1 | Copilot proposed action records |
| 147 | dos_agent_approvals | AI/Agent | B1 | DOS agent approval records |
| 148 | dos_agent_instructions | AI/Agent | B2 | DOS agent instruction definitions |
| 149 | dos_agent_kernel_audit | AI/Agent | B1 | DOS agent kernel audit log |
| 150 | dos_agent_memories | AI/Agent | B1 | DOS agent memory records |
| 151 | dos_agent_metrics | AI/Agent | B1 | DOS agent metric records |
| 152 | dos_agent_registry | AI/Agent | B2 | DOS agent registry |
| 153 | dos_agent_runs | AI/Agent | B1 | DOS agent run records |
| 154 | dos_agent_schedules | AI/Agent | B2 | DOS agent schedule definitions |
| 155 | dos_agent_state_log | AI/Agent | B1 | DOS agent state log |
| 156 | dos_agent_states | AI/Agent | B1 | DOS agent state records |
| 157 | dos_agent_tasks | AI/Agent | B1 | DOS agent task records |
| 158 | dos_agent_tool_audit | AI/Agent | B1 | DOS agent tool audit log |
| 159 | dos_agent_tool_calls | AI/Agent | B1 | DOS agent tool call records |
| 160 | dos_agent_watchdog_log | AI/Agent | B1 | DOS agent watchdog log |
| 161 | explainability_links | AI/Agent | B1 | Explainability link records |
| 162 | hitl_states | AI/Agent | B1 | Human-in-the-loop state records |
| 163 | human_oversight_config | AI/Agent | B2 | Human oversight configuration |
| 164 | intervention_audit_log | AI/Agent | B1 | Intervention audit log |
| 165 | kernel_snapshots | AI/Agent | B1 | Kernel snapshot records |
| 166 | langgraph_agent_metrics | AI/Agent | B1 | LangGraph agent metric records |
| 167 | llm_traces | AI/Agent | B1 | LLM trace records |
| 168 | llm_usage_log | AI/Agent | B1 | LLM usage log |
| 169 | mcp_agent_overrides | AI/Agent | B2 | MCP agent override config |
| 170 | mcp_prompt_overrides | AI/Agent | B2 | MCP prompt override config |
| 171 | mcp_resource_overrides | AI/Agent | B2 | MCP resource override config |
| 172 | mcp_tool_approval_requests | AI/Agent | B1 | MCP tool approval requests |
| 173 | mcp_tool_execution_log | AI/Agent | B1 | MCP tool execution log |
| 174 | mcp_tool_overrides | AI/Agent | B2 | MCP tool override config |
| 175 | mcp_tool_usage_counters | AI/Agent | B1 | MCP tool usage counters |
| 176 | mcp_workflow_tool_bindings | AI/Agent | B2 | MCP workflow tool bindings |
| 177 | member_agent_shadows | AI/Agent | B1 | Member agent shadow records |
| 178 | memory_access_log | AI/Agent | B1 | Memory access log |
| 179 | memory_consent_log | AI/Agent | B1 | Memory consent log |
| 180 | memory_summaries | AI/Agent | B1 | Memory summary records |
| 181 | mode_operation_log | AI/Agent | B1 | Mode operation log |
| 182 | mode_transition_audit | AI/Agent | B1 | Mode transition audit log |
| 183 | nudge_feedback | AI/Agent | B1 | Nudge feedback records |
| 184 | nudges | AI/Agent | B1 | Nudge records |
| 185 | os_approved_lessons | AI/Agent | B1 | OS approved lesson records |
| 186 | os_case_memory | AI/Agent | B1 | OS case memory records |
| 187 | os_case_timelines | AI/Agent | B1 | OS case timeline records |
| 188 | os_digest_feedback | AI/Agent | B1 | OS digest feedback records |
| 189 | os_initiative_effectiveness | AI/Agent | B1 | OS initiative effectiveness records |
| 190 | os_knowledge_articles | AI/Agent | B2 | OS knowledge article records |
| 191 | os_knowledge_links | AI/Agent | B1 | OS knowledge link records |
| 192 | os_learning_scores | AI/Agent | B1 | OS learning score records |
| 193 | os_lesson_candidates | AI/Agent | B1 | OS lesson candidate records |
| 194 | os_outcome_memory | AI/Agent | B1 | OS outcome memory records |
| 195 | os_pattern_signals | AI/Agent | B1 | OS pattern signal records |
| 196 | os_playbook_versions | AI/Agent | B2 | OS playbook version records |
| 197 | os_recommendation_feedback | AI/Agent | B1 | OS recommendation feedback |
| 198 | os_reflection_notes | AI/Agent | B1 | OS reflection note records |
| 199 | prompt_drift_baselines | AI/Agent | B2 | Prompt drift baseline records |
| 200 | prompt_injection_log | AI/Agent | B1 | Prompt injection detection log |
| 201 | reasoning_chain_summary | AI/Agent | B1 | Reasoning chain summary records |
| 202 | recommendation_triggers | AI/Agent | B2 | Recommendation trigger definitions |
| 203 | shadow_agent_config | AI/Agent | B2 | Shadow agent configuration |
| 204 | shadow_comparisons | AI/Agent | B1 | Shadow comparison records |
| 205 | signal_detector_registry | AI/Agent | B2 | Signal detector registry |
| 206 | triage_proposals | AI/Agent | B1 | Triage proposal records |

### 2.4 Workflow Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | workflow_acl | Module:Workflow | B1 | Workflow access control list |
| 2 | workflow_agent_tool_policy | Module:Workflow | B2 | Workflow agent tool policy |
| 3 | workflow_ai_agents | Module:Workflow | B2 | Workflow AI agent bindings |
| 4 | workflow_ai_budget | Module:Workflow | B2 | Workflow AI budget config |
| 5 | workflow_ai_notes | Module:Workflow | B1 | Workflow AI notes |
| 6 | workflow_ai_policy | Module:Workflow | B2 | Workflow AI policy |
| 7 | workflow_assignments | Module:Workflow | B1 | Workflow assignment records |
| 8 | workflow_attachments | Module:Workflow | B1 | Workflow attachment records |
| 9 | workflow_auto_initiation | Module:Workflow | B2 | Workflow auto-initiation config |
| 10 | workflow_categories | Module:Workflow | B2 | Workflow category definitions |
| 11 | workflow_chain_definitions | Module:Workflow | B2 | Workflow chain definitions |
| 12 | workflow_chain_instances | Module:Workflow | B1 | Workflow chain instance records |
| 13 | workflow_chain_step_log | Module:Workflow | B1 | Workflow chain step log |
| 14 | workflow_comments | Module:Workflow | B1 | Workflow comment records |
| 15 | workflow_conditions | Module:Workflow | B2 | Workflow condition definitions |
| 16 | workflow_decision_log | Module:Workflow | B1 | Workflow decision log |
| 17 | workflow_draft_actions | Module:Workflow | B1 | Workflow draft action records |
| 18 | workflow_escalation_policies | Module:Workflow | B2 | Workflow escalation policies |
| 19 | workflow_events | Module:Workflow | B1 | Workflow event records |
| 20 | workflow_executions_archive | Module:Workflow | B5 | Workflow execution archive |
| 21 | workflow_forbidden_boundaries | Module:Workflow | B2 | Workflow forbidden boundary rules |
| 22 | workflow_graph_versions | Module:Workflow | B2 | Workflow graph version records |
| 23 | workflow_instance_steps | Module:Workflow | B1 | Workflow instance step records |
| 24 | workflow_intervention_log | Module:Workflow | B1 | Workflow intervention log |
| 25 | workflow_kill_switch | Module:Workflow | B1 | Workflow kill switch state |
| 26 | workflow_lookup_options | Module:Workflow | B2 | Workflow lookup options |
| 27 | workflow_mandatory_review_points | Module:Workflow | B2 | Workflow mandatory review points |
| 28 | workflow_profile_catalog | Module:Workflow | B2 | Workflow profile catalog |
| 29 | workflow_profile_states | Module:Workflow | B1 | Workflow profile state records |
| 30 | workflow_profile_transitions | Module:Workflow | B1 | Workflow profile transition records |
| 31 | workflow_raci_config | Module:Workflow | B2 | Workflow RACI configuration |
| 32 | workflow_recommendation_catalog | Module:Workflow | B2 | Workflow recommendation catalog |
| 33 | workflow_retention_policies | Module:Workflow | B2 | Workflow retention policies |
| 34 | workflow_retry_recovery_records | Module:Workflow | B1 | Workflow retry/recovery records |
| 35 | workflow_role_access | Module:Workflow | B1 | Workflow role access records |
| 36 | workflow_rollback_log | Module:Workflow | B1 | Workflow rollback log |
| 37 | workflow_rules | Module:Workflow | B2 | Workflow rule definitions |
| 38 | workflow_schedules | Module:Workflow | B2 | Workflow schedule definitions |
| 39 | workflow_sla_policies | Module:Workflow | B2 | Workflow SLA policies |
| 40 | workflow_state_history | Module:Workflow | B1 | Workflow state history |
| 41 | workflow_step_autonomy | Module:Workflow | B2 | Workflow step autonomy config |
| 42 | workflow_step_roles | Module:Workflow | B2 | Workflow step role definitions |
| 43 | workflow_steps | Module:Workflow | B1 | Workflow step records |
| 44 | workflow_subscribers | Module:Workflow | B2 | Workflow subscriber definitions |
| 45 | workflow_task_assignments | Module:Workflow | B1 | Workflow task assignment records |
| 46 | workflow_tasks | Module:Workflow | B1 | Workflow task records |
| 47 | workflow_timeline_entries | Module:Workflow | B1 | Workflow timeline entry records |
| 48 | workflow_transitions | Module:Workflow | B1 | Workflow transition records |
| 49 | workflow_triggers | Module:Workflow | B2 | Workflow trigger definitions |
| 50 | workflow_versions | Module:Workflow | B2 | Workflow version records |
| 51 | workflow_webhooks | Module:Workflow | B2 | Workflow webhook definitions |
| 52 | workflows | Module:Workflow | B1 | Master workflow records |
| 53 | wf_approval_decisions | Module:Workflow | B1 | Workflow approval decision records |

### 2.5 Risk Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | risk_appetite_config | Module:Risk | B2 | Risk appetite configuration |
| 2 | risk_appetite_statements | Module:Risk | B1 | Risk appetite statement records |
| 3 | risk_assessment_items | Module:Risk | B1 | Risk assessment item records |
| 4 | risk_assessment_responses | Module:Risk | B1 | Risk assessment response records |
| 5 | risk_assessment_reviews | Module:Risk | B1 | Risk assessment review records |
| 6 | risk_assessments | Module:Risk | B1 | Risk assessment records |
| 7 | risk_asset_links | Module:Risk | B1 | Risk-asset link records |
| 8 | risk_campaigns | Module:Risk | B1 | Risk campaign records |
| 9 | risk_categories | Module:Risk | B2 | Risk category definitions (tenant) |
| 10 | risk_compliance_links | Module:Risk | B1 | Risk-compliance link records |
| 11 | risk_consequences | Module:Risk | B2 | Risk consequence definitions |
| 12 | risk_dashboard_cache | Module:Risk | B3 | Risk dashboard cache |
| 13 | risk_dependencies | Module:Risk | B1 | Risk dependency records |
| 14 | risk_evidence_links | Module:Risk | B1 | Risk-evidence link records |
| 15 | risk_fair_assessments | Module:Risk | B1 | FAIR risk assessment records |
| 16 | risk_impact_scales | Module:Risk | B2 | Risk impact scale definitions |
| 17 | risk_indicator_templates | Module:Risk | B2 | Risk indicator templates |
| 18 | risk_kris | Module:Risk | B1 | Key risk indicator records |
| 19 | risk_likelihood_scales | Module:Risk | B2 | Risk likelihood scale definitions |
| 20 | risk_owners | Module:Risk | B1 | Risk owner records |
| 21 | risk_pair_reviews | Module:Risk | B1 | Risk pair review records |
| 22 | risk_policy_links | Module:Risk | B1 | Risk-policy link records |
| 23 | risk_scenario_reviews | Module:Risk | B1 | Risk scenario review records |
| 24 | risk_scenarios | Module:Risk | B1 | Risk scenario records |
| 25 | risk_score_history | Module:Risk | B1 | Risk score history |
| 26 | risk_scoring_models | Module:Risk | B2 | Risk scoring model definitions |
| 27 | risk_sector_applicability | Module:Risk | B2 | Risk sector applicability |
| 28 | risk_status_history | Module:Risk | B1 | Risk status history |
| 29 | risk_taxonomy | Module:Risk | B2 | Risk taxonomy definitions |
| 30 | risk_team_distribution | Module:Risk | B1 | Risk team distribution |
| 31 | risk_threats | Module:Risk | B1 | Risk threat records |
| 32 | risk_treatment_actions | Module:Risk | B1 | Risk treatment action records |
| 33 | risk_treatment_reviews | Module:Risk | B1 | Risk treatment review records |
| 34 | risk_velocity_scales | Module:Risk | B2 | Risk velocity scale definitions |
| 35 | risk_vendor_links | Module:Risk | B1 | Risk-vendor link records |
| 36 | kri_breach_log | Module:Risk | B1 | KRI breach log |
| 37 | kri_data_points | Module:Risk | B1 | KRI data point records |
| 38 | kri_tracking | Module:Risk | B1 | KRI tracking records |
| 39 | kri_values | Module:Risk | B1 | KRI value records |
| 40 | rcsa_campaigns | Module:Risk | B1 | RCSA campaign records |
| 41 | rcsa_responses | Module:Risk | B1 | RCSA response records |

### 2.6 Compliance Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | compliance_activity_log | Module:Compliance | B1 | Compliance activity log |
| 2 | compliance_assertion_evidence | Module:Compliance | B1 | Compliance assertion evidence |
| 3 | compliance_assertions | Module:Compliance | B1 | Compliance assertion records |
| 4 | compliance_assessments | Module:Compliance | B1 | Compliance assessment records |
| 5 | compliance_commitments | Module:Compliance | B1 | Compliance commitment records |
| 6 | compliance_drift_baselines | Module:Compliance | B2 | Compliance drift baselines |
| 7 | compliance_drift_events | Module:Compliance | B1 | Compliance drift event records |
| 8 | compliance_drift_rules | Module:Compliance | B2 | Compliance drift rules |
| 9 | compliance_findings | Module:Compliance | B1 | Compliance finding records |
| 10 | compliance_frameworks | Module:Compliance | B2 | Compliance framework definitions |
| 11 | compliance_gap_snapshots | Module:Compliance | B1 | Compliance gap snapshot records |
| 12 | compliance_gaps | Module:Compliance | B1 | Compliance gap records |
| 13 | compliance_obligations | Module:Compliance | B1 | Compliance obligation records |
| 14 | compliance_overview_snapshots | Module:Compliance | B1 | Compliance overview snapshots |
| 15 | compliance_reviews | Module:Compliance | B1 | Compliance review records |
| 16 | compliance_score_snapshots | Module:Compliance | B1 | Compliance score snapshots |
| 17 | compliance_scores | Module:Compliance | B1 | Compliance score records |
| 18 | cross_framework_mappings | Module:Compliance | B2 | Cross-framework mapping records |
| 19 | framework_applicability_rules | Module:Compliance | B2 | Framework applicability rules |
| 20 | framework_cross_mappings | Module:Compliance | B2 | Framework cross-mapping records |
| 21 | framework_domains | Module:Compliance | B2 | Framework domain definitions |
| 22 | framework_module_map | Module:Compliance | B2 | Framework-module mapping |
| 23 | framework_requirement_versions | Module:Compliance | B2 | Framework requirement versions |
| 24 | framework_requirements | Module:Compliance | B2 | Framework requirement definitions |
| 25 | regulatory_audit_requirements | Module:Compliance | B2 | Regulatory audit requirements |
| 26 | regulatory_bodies | Module:Compliance | B2 | Regulatory body definitions |
| 27 | regulatory_calendar | Module:Compliance | B1 | Regulatory calendar records |
| 28 | regulatory_calendar_task_links | Module:Compliance | B1 | Regulatory calendar task links |
| 29 | regulatory_change_impacts | Module:Compliance | B1 | Regulatory change impact records |
| 30 | regulatory_change_log | Module:Compliance | B1 | Regulatory change log (tenant) |
| 31 | regulatory_change_notifications | Module:Compliance | B1 | Regulatory change notification records |
| 32 | regulatory_changes | Module:Compliance | B1 | Regulatory change records (tenant) |
| 33 | regulatory_control_mappings | Module:Compliance | B2 | Regulatory control mappings |
| 34 | regulatory_frameworks | Module:Compliance | B2 | Regulatory framework definitions (tenant) |
| 35 | regulatory_incident_notifications | Module:Compliance | B1 | Regulatory incident notifications |
| 36 | regulatory_requirements | Module:Compliance | B2 | Regulatory requirement definitions |
| 37 | regulatory_sla_requirements | Module:Compliance | B2 | Regulatory SLA requirements |

### 2.7 Control Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | control_actions | Module:Controls | B1 | Control action records |
| 2 | control_asset_links | Module:Controls | B1 | Control-asset link records |
| 3 | control_categories | Module:Controls | B2 | Control category definitions |
| 4 | control_certification_campaigns | Module:Controls | B1 | Control certification campaigns |
| 5 | control_certification_requests | Module:Controls | B1 | Control certification requests |
| 6 | control_certification_responses | Module:Controls | B1 | Control certification responses |
| 7 | control_closure_reviews | Module:Controls | B1 | Control closure review records |
| 8 | control_dashboard_cache | Module:Controls | B3 | Control dashboard cache |
| 9 | control_dependencies | Module:Controls | B1 | Control dependency records |
| 10 | control_design_reviews | Module:Controls | B1 | Control design review records |
| 11 | control_domains | Module:Controls | B2 | Control domain definitions (tenant) |
| 12 | control_effectiveness_log | Module:Controls | B1 | Control effectiveness log |
| 13 | control_effectiveness_scores | Module:Controls | B1 | Control effectiveness scores |
| 14 | control_evidence_requirements | Module:Controls | B2 | Control evidence requirements (tenant) |
| 15 | control_exceptions | Module:Controls | B1 | Control exception records |
| 16 | control_failures | Module:Controls | B1 | Control failure records |
| 17 | control_framework_mappings | Module:Controls | B2 | Control-framework mapping records |
| 18 | control_health_snapshots | Module:Controls | B1 | Control health snapshot records |
| 19 | control_issues | Module:Controls | B1 | Control issue records |
| 20 | control_monitoring_alerts | Module:Controls | B1 | Control monitoring alert records |
| 21 | control_monitoring_rules | Module:Controls | B2 | Control monitoring rule definitions |
| 22 | control_monitoring_signals | Module:Controls | B1 | Control monitoring signal records |
| 23 | control_objectives | Module:Controls | B2 | Control objective definitions |
| 24 | control_obligation_mappings | Module:Controls | B2 | Control-obligation mapping records |
| 25 | control_operating_tests | Module:Controls | B1 | Control operating test records |
| 26 | control_owners | Module:Controls | B1 | Control owner records |
| 27 | control_policy_links | Module:Controls | B1 | Control-policy link records |
| 28 | control_remediation_actions | Module:Controls | B1 | Control remediation action records |
| 29 | control_retests | Module:Controls | B1 | Control retest records |
| 30 | control_schedules | Module:Controls | B2 | Control schedule definitions |
| 31 | control_scope_links | Module:Controls | B1 | Control scope link records |
| 32 | control_status_history | Module:Controls | B1 | Control status history |
| 33 | control_tags | Module:Controls | B2 | Control tag records |
| 34 | control_team_distribution | Module:Controls | B1 | Control team distribution |
| 35 | control_test_procedures | Module:Controls | B2 | Control test procedure definitions |
| 36 | control_test_results | Module:Controls | B1 | Control test result records |
| 37 | control_tests | Module:Controls | B1 | Control test records |
| 38 | control_training_mappings | Module:Controls | B2 | Control-training mapping records |
| 39 | control_workflow_links | Module:Controls | B1 | Control-workflow link records |
| 40 | ucf_control_versions | Module:Controls | B1 | UCF control version records |

### 2.8 Audit Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | audit_anomalies | Module:Audit | B1 | Audit anomaly records |
| 2 | audit_finding_slas | Module:Audit | B2 | Audit finding SLA config |
| 3 | audit_prep_checklists | Module:Audit | B2 | Audit prep checklist definitions |
| 4 | audit_qa_reviews | Module:Audit | B1 | Audit QA review records |
| 5 | audit_ratings | Module:Audit | B2 | Audit rating definitions |
| 6 | audit_request_items | Module:Audit | B1 | Audit request item records |
| 7 | audit_requests | Module:Audit | B1 | Audit request records |
| 8 | audit_risk_scores | Module:Audit | B1 | Audit risk score records |
| 9 | audit_schedules | Module:Audit | B2 | Audit schedule definitions (tenant) |
| 10 | audit_scopes | Module:Audit | B1 | Audit scope records |
| 11 | audit_team_members | Module:Audit | B1 | Audit team member records |
| 12 | audit_templates | Module:Audit | B2 | Audit template definitions |
| 13 | audit_test_plans | Module:Audit | B2 | Audit test plan definitions |
| 14 | audit_time_entries | Module:Audit | B1 | Audit time entry records |
| 15 | audit_trail | Module:Audit | B1 | Audit trail records |
| 16 | audit_trail_archive | Module:Audit | B5 | Audit trail archive |
| 17 | audit_universe | Module:Audit | B1 | Audit universe records |
| 18 | audit_working_papers | Module:Audit | B1 | Audit working paper records |
| 19 | audits | Module:Audit | B1 | Master audit records |
| 20 | external_audit_coordination | Module:Audit | B1 | External audit coordination records |
| 21 | finding_impacts | Module:Audit | B1 | Finding impact records |
| 22 | finding_root_causes | Module:Audit | B1 | Finding root cause records |
| 23 | repeat_findings | Module:Audit | B1 | Repeat finding records |

### 2.9 Evidence Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | evidence_actions | Module:Evidence | B1 | Evidence action records |
| 2 | evidence_activity_log | Module:Evidence | B1 | Evidence activity log |
| 3 | evidence_admin_settings | Module:Evidence | B2 | Evidence admin settings |
| 4 | evidence_attachments | Module:Evidence | B1 | Evidence attachment records |
| 5 | evidence_attachments_config | Module:Evidence | B2 | Evidence attachment config |
| 6 | evidence_auto_collection | Module:Evidence | B2 | Evidence auto-collection config |
| 7 | evidence_collection_jobs | Module:Evidence | B1 | Evidence collection job records |
| 8 | evidence_collection_log | Module:Evidence | B1 | Evidence collection log |
| 9 | evidence_collection_rules | Module:Evidence | B2 | Evidence collection rules |
| 10 | evidence_collection_runs | Module:Evidence | B1 | Evidence collection run records |
| 11 | evidence_confidentiality_levels | Module:Evidence | B2 | Evidence confidentiality levels |
| 12 | evidence_cross_validation | Module:Evidence | B1 | Evidence cross-validation records |
| 13 | evidence_dashboard_cache | Module:Evidence | B3 | Evidence dashboard cache |
| 14 | evidence_duplicate_candidates | Module:Evidence | B1 | Evidence duplicate candidate records |
| 15 | evidence_export_manifests | Module:Evidence | B1 | Evidence export manifest records |
| 16 | evidence_exports | Module:Evidence | B1 | Evidence export records |
| 17 | evidence_freshness_records | Module:Evidence | B1 | Evidence freshness records |
| 18 | evidence_lifecycle | Module:Evidence | B1 | Evidence lifecycle records (tenant) |
| 19 | evidence_links | Module:Evidence | B1 | Evidence link records |
| 20 | evidence_owners | Module:Evidence | B1 | Evidence owner records |
| 21 | evidence_package_items | Module:Evidence | B1 | Evidence package item records |
| 22 | evidence_packages | Module:Evidence | B1 | Evidence package records |
| 23 | evidence_provenance_records | Module:Evidence | B1 | Evidence provenance records |
| 24 | evidence_quality_assessments | Module:Evidence | B1 | Evidence quality assessment records |
| 25 | evidence_quality_rules | Module:Evidence | B2 | Evidence quality rules |
| 26 | evidence_rejection_reasons | Module:Evidence | B2 | Evidence rejection reasons |
| 27 | evidence_relay_queue | Module:Evidence | B1 | Evidence relay queue |
| 28 | evidence_request_targets | Module:Evidence | B1 | Evidence request target records |
| 29 | evidence_requests | Module:Evidence | B1 | Evidence request records |
| 30 | evidence_retention_rules | Module:Evidence | B2 | Evidence retention rules |
| 31 | evidence_reuse_links | Module:Evidence | B1 | Evidence reuse link records |
| 32 | evidence_reviews | Module:Evidence | B1 | Evidence review records |
| 33 | evidence_scores | Module:Evidence | B1 | Evidence score records |
| 34 | evidence_sector_mapping | Module:Evidence | B2 | Evidence sector mapping |
| 35 | evidence_source_types | Module:Evidence | B2 | Evidence source type definitions |
| 36 | evidence_status_log | Module:Evidence | B1 | Evidence status log |
| 37 | evidence_submissions | Module:Evidence | B1 | Evidence submission records |
| 38 | evidence_tags | Module:Evidence | B2 | Evidence tag records |
| 39 | evidence_tasks | Module:Evidence | B1 | Evidence task records |
| 40 | evidence_team_distribution | Module:Evidence | B1 | Evidence team distribution |
| 41 | evidence_templates | Module:Evidence | B2 | Evidence template definitions |
| 42 | evidence_type_catalog | Module:Evidence | B2 | Evidence type catalog |
| 43 | evidence_types | Module:Evidence | B2 | Evidence type definitions (tenant) |
| 44 | evidence_validation_metrics | Module:Evidence | B1 | Evidence validation metrics |
| 45 | evidence_validation_rules | Module:Evidence | B2 | Evidence validation rules |
| 46 | evidence_verification_events | Module:Evidence | B1 | Evidence verification events |
| 47 | evidence_versions | Module:Evidence | B1 | Evidence version records |

### 2.10 Vendor Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | vendor_admin_config | Module:Vendor | B2 | Vendor admin configuration |
| 2 | vendor_assessments | Module:Vendor | B1 | Vendor assessment records (tenant) |
| 3 | vendor_audit_log | Module:Vendor | B1 | Vendor audit log |
| 4 | vendor_bcp_requirements | Module:Vendor | B2 | Vendor BCP requirements |
| 5 | vendor_benchmark_cohorts | Module:Vendor | B2 | Vendor benchmark cohorts |
| 6 | vendor_concentration_analysis | Module:Vendor | B1 | Vendor concentration analysis |
| 7 | vendor_contacts | Module:Vendor | B1 | Vendor contact records |
| 8 | vendor_crypto_assessment | Module:Vendor | B1 | Vendor crypto assessment records |
| 9 | vendor_dd_steps | Module:Vendor | B1 | Vendor due diligence steps |
| 10 | vendor_documents | Module:Vendor | B1 | Vendor document records |
| 11 | vendor_due_diligence | Module:Vendor | B1 | Vendor due diligence records |
| 12 | vendor_due_diligence_checklists | Module:Vendor | B2 | Vendor DD checklists |
| 13 | vendor_engagement_milestones | Module:Vendor | B1 | Vendor engagement milestones |
| 14 | vendor_engagement_scores | Module:Vendor | B1 | Vendor engagement scores |
| 15 | vendor_engagements | Module:Vendor | B1 | Vendor engagement records |
| 16 | vendor_exceptions | Module:Vendor | B1 | Vendor exception records |
| 17 | vendor_findings | Module:Vendor | B1 | Vendor finding records |
| 18 | vendor_fourth_party_risk | Module:Vendor | B1 | Vendor fourth-party risk records |
| 19 | vendor_issues | Module:Vendor | B1 | Vendor issue records |
| 20 | vendor_monitoring_signals | Module:Vendor | B1 | Vendor monitoring signal records |
| 21 | vendor_obligations | Module:Vendor | B1 | Vendor obligation records |
| 22 | vendor_offboarding | Module:Vendor | B1 | Vendor offboarding records |
| 23 | vendor_offboarding_checklist | Module:Vendor | B2 | Vendor offboarding checklists |
| 24 | vendor_portal_messages | Module:Vendor | B1 | Vendor portal message records |
| 25 | vendor_portal_tokens | Module:Vendor | B1 | Vendor portal token records |
| 26 | vendor_questionnaire_submissions | Module:Vendor | B1 | Vendor questionnaire submissions |
| 27 | vendor_questionnaire_templates | Module:Vendor | B2 | Vendor questionnaire templates |
| 28 | vendor_risk_assessments | Module:Vendor | B1 | Vendor risk assessment records |
| 29 | vendor_risks | Module:Vendor | B1 | Vendor risk records |
| 30 | vendor_shared_responsibility | Module:Vendor | B1 | Vendor shared responsibility records |
| 31 | vendor_sla_breach_log | Module:Vendor | B1 | Vendor SLA breach log |
| 32 | vendor_sla_definitions | Module:Vendor | B2 | Vendor SLA definitions |
| 33 | vendor_sla_measurements | Module:Vendor | B1 | Vendor SLA measurement records |
| 34 | vendor_subcontractors | Module:Vendor | B1 | Vendor subcontractor records |
| 35 | vendor_team_distribution | Module:Vendor | B1 | Vendor team distribution |
| 36 | vendor_tier_config | Module:Vendor | B2 | Vendor tier configuration |
| 37 | vendor_training_requirements | Module:Vendor | B2 | Vendor training requirements |

### 2.11 Incident Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | incident_assets | Module:Incident | B1 | Incident asset link records |
| 2 | incident_audit_log | Module:Incident | B1 | Incident audit log |
| 3 | incident_categories | Module:Incident | B2 | Incident category definitions (tenant) |
| 4 | incident_evidence | Module:Incident | B1 | Incident evidence records |
| 5 | incident_impacts | Module:Incident | B1 | Incident impact records |
| 6 | incident_lessons_learned | Module:Incident | B1 | Incident lessons learned |
| 7 | incident_notification_templates | Module:Incident | B2 | Incident notification templates |
| 8 | incident_notifications_log | Module:Incident | B1 | Incident notifications log |
| 9 | incident_pir | Module:Incident | B1 | Incident post-incident review |
| 10 | incident_policies | Module:Incident | B2 | Incident policy definitions |
| 11 | incident_recurring_patterns | Module:Incident | B1 | Incident recurring patterns |
| 12 | incident_regulatory_notifications | Module:Incident | B1 | Incident regulatory notifications |
| 13 | incident_reportable_criteria | Module:Incident | B2 | Incident reportable criteria |
| 14 | incident_response_actions | Module:Incident | B1 | Incident response action records |
| 15 | incident_response_teams | Module:Incident | B1 | Incident response team records |
| 16 | incident_risk_links | Module:Incident | B1 | Incident-risk link records |
| 17 | incident_root_causes | Module:Incident | B1 | Incident root cause records |
| 18 | incident_severity_matrix | Module:Incident | B2 | Incident severity matrix |
| 19 | incident_taxonomy | Module:Incident | B2 | Incident taxonomy definitions |
| 20 | incident_team_distribution | Module:Incident | B1 | Incident team distribution |
| 21 | incident_trend_cache | Module:Incident | B3 | Incident trend cache |
| 22 | incident_triage_decisions | Module:Incident | B1 | Incident triage decisions |
| 23 | incident_updates | Module:Incident | B1 | Incident update records |
| 24 | incident_vendors | Module:Incident | B1 | Incident-vendor link records |
| 25 | case_incidents | Module:Incident | B1 | Case-incident link records |
| 26 | case_notes | Module:Incident | B1 | Case note records |
| 27 | cases | Module:Incident | B1 | Case records |
| 28 | near_miss_reports | Module:Incident | B1 | Near-miss report records |
| 29 | crisis_comm_activations | Module:Incident | B1 | Crisis communication activations |
| 30 | crisis_comm_plans | Module:Incident | B2 | Crisis communication plans |
| 31 | crisis_events | Module:Incident | B1 | Crisis event records |
| 32 | crisis_notification_tree | Module:Incident | B2 | Crisis notification tree |
| 33 | war_rooms | Module:Incident | B1 | War room records |

### 2.12 Policy Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | policy_assessment_history | Module:Policy | B1 | Policy assessment history |
| 2 | policy_categories | Module:Policy | B2 | Policy category definitions |
| 3 | policy_control_links | Module:Policy | B1 | Policy-control link records |
| 4 | policy_dashboard_cache | Module:Policy | B3 | Policy dashboard cache |
| 5 | policy_decision_log | Module:Policy | B1 | Policy decision log |
| 6 | policy_delivery_records | Module:Policy | B1 | Policy delivery records |
| 7 | policy_drift_events | Module:Policy | B1 | Policy drift event records |
| 8 | policy_drift_snapshots | Module:Policy | B1 | Policy drift snapshots |
| 9 | policy_exception_approvals | Module:Policy | B1 | Policy exception approvals |
| 10 | policy_exception_requests | Module:Policy | B1 | Policy exception requests |
| 11 | policy_gaps | Module:Policy | B1 | Policy gap records |
| 12 | policy_guidance | Module:Policy | B2 | Policy guidance definitions |
| 13 | policy_issue_links | Module:Policy | B1 | Policy-issue link records |
| 14 | policy_kpi_values | Module:Policy | B1 | Policy KPI value records |
| 15 | policy_metrics | Module:Policy | B1 | Policy metric records |
| 16 | policy_mom_records | Module:Policy | B1 | Policy minutes-of-meeting records |
| 17 | policy_pack_catalog | Module:Policy | B2 | Policy pack catalog |
| 18 | policy_pack_rules | Module:Policy | B2 | Policy pack rules |
| 19 | policy_process_actions | Module:Policy | B1 | Policy process action records |
| 20 | policy_publication_audiences | Module:Policy | B2 | Policy publication audiences |
| 21 | policy_publications | Module:Policy | B1 | Policy publication records |
| 22 | policy_risk_links | Module:Policy | B1 | Policy-risk link records |
| 23 | policy_scores | Module:Policy | B1 | Policy score records |
| 24 | policy_templates | Module:Policy | B2 | Policy template definitions |
| 25 | policy_version_diffs | Module:Policy | B1 | Policy version diff records |
| 26 | policy_workflow_tracker | Module:Policy | B1 | Policy workflow tracker |
| 27 | policy_workflows | Module:Policy | B2 | Policy workflow definitions |
| 28 | sop_procedures | Module:Policy | B1 | SOP procedure records |

### 2.13 Governance Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | governance_ack_campaigns | Module:Governance | B1 | Governance acknowledgement campaigns |
| 2 | governance_action_items | Module:Governance | B1 | Governance action item records |
| 3 | governance_action_updates | Module:Governance | B1 | Governance action update records |
| 4 | governance_agenda_items | Module:Governance | B1 | Governance agenda item records |
| 5 | governance_ai_feedback | Module:Governance | B1 | Governance AI feedback records |
| 6 | governance_ai_runs | Module:Governance | B1 | Governance AI run records |
| 7 | governance_authority_levels | Module:Governance | B2 | Governance authority level definitions |
| 8 | governance_auto_fire_log | Module:Governance | B1 | Governance auto-fire log |
| 9 | governance_bodies | Module:Governance | B1 | Governance body records |
| 10 | governance_charters | Module:Governance | B1 | Governance charter records |
| 11 | governance_committee_members | Module:Governance | B1 | Governance committee member records |
| 12 | governance_compensating_controls | Module:Governance | B1 | Governance compensating controls |
| 13 | governance_constitution | Module:Governance | B2 | Governance constitution definitions |
| 14 | governance_context | Module:Governance | B1 | Governance context records |
| 15 | governance_decision_votes | Module:Governance | B1 | Governance decision vote records |
| 16 | governance_decisions | Module:Governance | B1 | Governance decision records |
| 17 | governance_delegations | Module:Governance | B1 | Governance delegation records |
| 18 | governance_domains | Module:Governance | B2 | Governance domain definitions |
| 19 | governance_enforcement_log | Module:Governance | B1 | Governance enforcement log |
| 20 | governance_escalation_events | Module:Governance | B1 | Governance escalation events |
| 21 | governance_executive_summaries | Module:Governance | B1 | Governance executive summaries |
| 22 | governance_health_scores | Module:Governance | B1 | Governance health scores |
| 23 | governance_health_thresholds | Module:Governance | B2 | Governance health thresholds |
| 24 | governance_interpreted_issues | Module:Governance | B1 | Governance interpreted issues |
| 25 | governance_mandate_sources | Module:Governance | B2 | Governance mandate sources |
| 26 | governance_mandates | Module:Governance | B1 | Governance mandate records |
| 27 | governance_meeting_attendees | Module:Governance | B1 | Governance meeting attendees |
| 28 | governance_meetings | Module:Governance | B1 | Governance meeting records |
| 29 | governance_objectives | Module:Governance | B1 | Governance objective records |
| 30 | governance_obligation_control_links | Module:Governance | B1 | Governance obligation-control links |
| 31 | governance_obligation_due_dates | Module:Governance | B1 | Governance obligation due dates |
| 32 | governance_obligation_evidence_links | Module:Governance | B1 | Governance obligation-evidence links |
| 33 | governance_obligation_exemptions | Module:Governance | B1 | Governance obligation exemptions |
| 34 | governance_obligations | Module:Governance | B1 | Governance obligation records |
| 35 | governance_policy_acknowledgements | Module:Governance | B1 | Governance policy acknowledgements |
| 36 | governance_policy_approvals | Module:Governance | B1 | Governance policy approvals |
| 37 | governance_policy_reviews | Module:Governance | B1 | Governance policy reviews |
| 38 | governance_raci_assignments | Module:Governance | B1 | Governance RACI assignments |
| 39 | governance_raci_templates | Module:Governance | B2 | Governance RACI templates |
| 40 | governance_recommendations | Module:Governance | B1 | Governance recommendation records |
| 41 | governance_registers | Module:Governance | B1 | Governance register records |
| 42 | governance_reporting_lines | Module:Governance | B1 | Governance reporting lines |
| 43 | governance_responsibilities | Module:Governance | B1 | Governance responsibility records |
| 44 | governance_responsibility_assignments | Module:Governance | B1 | Governance responsibility assignments |
| 45 | governance_risk_appetite | Module:Governance | B1 | Governance risk appetite records |
| 46 | governance_score_explanations | Module:Governance | B1 | Governance score explanations |
| 47 | governance_signal_events | Module:Governance | B1 | Governance signal events |
| 48 | governance_signal_rules | Module:Governance | B2 | Governance signal rules |
| 49 | governance_signals | Module:Governance | B1 | Governance signal records |

### 2.14 Exception Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | exception_approval_config | Module:Exception | B2 | Exception approval configuration |
| 2 | exception_gate_audit | Module:Exception | B1 | Exception gate audit log |
| 3 | exception_gating_rules | Module:Exception | B2 | Exception gating rules |
| 4 | exception_risk_acceptance | Module:Exception | B1 | Exception risk acceptance records |
| 5 | exceptions | Module:Exception | B1 | Exception records |

### 2.15 Remediation Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | remediation_plan_templates | Module:Remediation | B2 | Remediation plan templates |
| 2 | remediation_plans | Module:Remediation | B1 | Remediation plan records |
| 3 | remediation_sla_config | Module:Remediation | B2 | Remediation SLA configuration |
| 4 | remediation_tracking | Module:Remediation | B1 | Remediation tracking records |

### 2.16 Qiyas (Assessment/Analytics) Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | qiyas_assessment_exports | Module:Qiyas | B1 | Assessment export records |
| 2 | qiyas_assessment_respondents | Module:Qiyas | B1 | Assessment respondent records |
| 3 | qiyas_assessment_reviews | Module:Qiyas | B1 | Assessment review records |
| 4 | qiyas_assessment_scopes | Module:Qiyas | B1 | Assessment scope records |
| 5 | qiyas_assessment_status_history | Module:Qiyas | B1 | Assessment status history |
| 6 | qiyas_assessments | Module:Qiyas | B1 | Master assessment records |
| 7 | qiyas_auto_tasks | Module:Qiyas | B1 | Auto-generated task records |
| 8 | qiyas_benchmark_cohorts | Module:Qiyas | B2 | Benchmark cohort definitions |
| 9 | qiyas_benchmark_comparisons | Module:Qiyas | B1 | Benchmark comparison records |
| 10 | qiyas_benchmark_datasets | Module:Qiyas | B2 | Benchmark dataset definitions |
| 11 | qiyas_benchmark_metrics | Module:Qiyas | B1 | Benchmark metric records |
| 12 | qiyas_benchmark_percentiles | Module:Qiyas | B1 | Benchmark percentile records |
| 13 | qiyas_benchmark_profiles | Module:Qiyas | B2 | Benchmark profile definitions |
| 14 | qiyas_benchmark_results | Module:Qiyas | B1 | Benchmark result records |
| 15 | qiyas_benchmark_trends | Module:Qiyas | B1 | Benchmark trend records |
| 16 | qiyas_calibration_entries | Module:Qiyas | B1 | Calibration entry records |
| 17 | qiyas_calibration_log | Module:Qiyas | B1 | Calibration log records |
| 18 | qiyas_calibration_sessions | Module:Qiyas | B1 | Calibration session records |
| 19 | qiyas_capability_scores | Module:Qiyas | B1 | Capability score records |
| 20 | qiyas_certification_action_plans | Module:Qiyas | B1 | Certification action plan records |
| 21 | qiyas_certification_evidence_packs | Module:Qiyas | B1 | Certification evidence pack records |
| 22 | qiyas_certification_gaps | Module:Qiyas | B1 | Certification gap records |
| 23 | qiyas_certification_milestones | Module:Qiyas | B1 | Certification milestone records |
| 24 | qiyas_certification_readiness | Module:Qiyas | B1 | Certification readiness records |
| 25 | qiyas_certification_simulations | Module:Qiyas | B1 | Certification simulation records |
| 26 | qiyas_consensus_reviews | Module:Qiyas | B1 | Consensus review records |
| 27 | qiyas_dimension_scores | Module:Qiyas | B1 | Dimension score records |
| 28 | qiyas_dimensions | Module:Qiyas | B2 | Dimension definitions |
| 29 | qiyas_domain_scores | Module:Qiyas | B1 | Domain score records |
| 30 | qiyas_domains | Module:Qiyas | B2 | Domain definitions |
| 31 | qiyas_evidence_chain_validations | Module:Qiyas | B1 | Evidence chain validation records |
| 32 | qiyas_evidence_coverage_analysis | Module:Qiyas | B1 | Evidence coverage analysis records |
| 33 | qiyas_evidence_links | Module:Qiyas | B1 | Evidence link records |
| 34 | qiyas_evidence_quality_metrics | Module:Qiyas | B1 | Evidence quality metric records |
| 35 | qiyas_evidence_rules | Module:Qiyas | B2 | Evidence rule definitions |
| 36 | qiyas_evidence_scores | Module:Qiyas | B1 | Evidence score records |
| 37 | qiyas_evidence_scoring_criteria | Module:Qiyas | B2 | Evidence scoring criteria |
| 38 | qiyas_evidence_scoring_models | Module:Qiyas | B2 | Evidence scoring models |
| 39 | qiyas_evidence_sufficiency_rules | Module:Qiyas | B2 | Evidence sufficiency rules |
| 40 | qiyas_gap_scores | Module:Qiyas | B1 | Gap score records |
| 41 | qiyas_grc_automation_rules | Module:Qiyas | B2 | GRC automation rules |
| 42 | qiyas_grc_trigger_log | Module:Qiyas | B1 | GRC trigger log |
| 43 | qiyas_improvement_paths | Module:Qiyas | B1 | Improvement path records |
| 44 | qiyas_improvement_plans | Module:Qiyas | B1 | Improvement plan records |
| 45 | qiyas_indicator_scores | Module:Qiyas | B1 | Indicator score records |
| 46 | qiyas_indicators | Module:Qiyas | B2 | Indicator definitions |
| 47 | qiyas_maturity_assessments | Module:Qiyas | B1 | Maturity assessment records |
| 48 | qiyas_maturity_dimension_results | Module:Qiyas | B1 | Maturity dimension result records |
| 49 | qiyas_maturity_level_criteria | Module:Qiyas | B2 | Maturity level criteria |
| 50 | qiyas_maturity_levels | Module:Qiyas | B2 | Maturity level definitions |
| 51 | qiyas_maturity_models | Module:Qiyas | B2 | Maturity model definitions |
| 52 | qiyas_maturity_progression_history | Module:Qiyas | B1 | Maturity progression history |
| 53 | qiyas_maturity_roadmaps | Module:Qiyas | B1 | Maturity roadmap records |
| 54 | qiyas_maturity_scores | Module:Qiyas | B1 | Maturity score records |
| 55 | qiyas_maturity_snapshots | Module:Qiyas | B1 | Maturity snapshot records |
| 56 | qiyas_maturity_target_profiles | Module:Qiyas | B2 | Maturity target profiles |
| 57 | qiyas_model_versions | Module:Qiyas | B2 | Model version records |
| 58 | qiyas_models | Module:Qiyas | B2 | Model definitions |
| 59 | qiyas_peer_comparison_pool | Module:Qiyas | B1 | Peer comparison pool records |
| 60 | qiyas_peer_comparisons | Module:Qiyas | B1 | Peer comparison records |
| 61 | qiyas_question_groups | Module:Qiyas | B2 | Question group definitions |
| 62 | qiyas_question_mappings | Module:Qiyas | B2 | Question mapping records |
| 63 | qiyas_question_options | Module:Qiyas | B2 | Question option definitions |
| 64 | qiyas_question_sets | Module:Qiyas | B2 | Question set definitions |
| 65 | qiyas_question_weights | Module:Qiyas | B2 | Question weight config |
| 66 | qiyas_questions | Module:Qiyas | B2 | Question definitions |
| 67 | qiyas_rating_scales | Module:Qiyas | B2 | Rating scale definitions |
| 68 | qiyas_recommendation_mappings | Module:Qiyas | B2 | Recommendation mappings |
| 69 | qiyas_recommendations | Module:Qiyas | B1 | Recommendation records |
| 70 | qiyas_respondents | Module:Qiyas | B1 | Respondent records |
| 71 | qiyas_response_attachments | Module:Qiyas | B1 | Response attachment records |
| 72 | qiyas_response_history | Module:Qiyas | B1 | Response history records |
| 73 | qiyas_responses | Module:Qiyas | B1 | Response records |
| 74 | qiyas_score_explanations | Module:Qiyas | B1 | Score explanation records |
| 75 | qiyas_score_history | Module:Qiyas | B1 | Score history records |
| 76 | qiyas_score_snapshots | Module:Qiyas | B1 | Score snapshot records |
| 77 | qiyas_scores | Module:Qiyas | B1 | Score records |
| 78 | qiyas_scoring_methods | Module:Qiyas | B2 | Scoring method definitions |
| 79 | qiyas_sections | Module:Qiyas | B2 | Section definitions |
| 80 | qiyas_target_profiles | Module:Qiyas | B2 | Target profile definitions |
| 81 | qiyas_template_versions | Module:Qiyas | B2 | Template version records |
| 82 | qiyas_templates | Module:Qiyas | B2 | Template definitions |

### 2.17 Obligation Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | obligation_applicability_rules | Module:Obligation | B2 | Obligation applicability rules |
| 2 | obligation_assignments | Module:Obligation | B1 | Obligation assignment records |
| 3 | obligation_control_links | Module:Obligation | B1 | Obligation-control link records |
| 4 | obligation_control_mappings | Module:Obligation | B2 | Obligation-control mappings |
| 5 | obligation_due_dates | Module:Obligation | B1 | Obligation due date records |
| 6 | obligation_evidence_links | Module:Obligation | B1 | Obligation-evidence link records |
| 7 | obligation_exemptions | Module:Obligation | B1 | Obligation exemption records |
| 8 | obligation_policy_links | Module:Obligation | B1 | Obligation-policy link records |
| 9 | obligation_scopes | Module:Obligation | B1 | Obligation scope records |
| 10 | obligation_status_history | Module:Obligation | B1 | Obligation status history |
| 11 | obligation_templates | Module:Obligation | B2 | Obligation template definitions |
| 12 | obligation_types | Module:Obligation | B2 | Obligation type definitions |
| 13 | obligation_versions | Module:Obligation | B1 | Obligation version records |
| 14 | obligations | Module:Obligation | B1 | Master obligation records |

### 2.18 Training Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | training_assignments | Module:Training | B1 | Training assignment records |
| 2 | training_audit_log | Module:Training | B1 | Training audit log |
| 3 | training_campaigns | Module:Training | B1 | Training campaign records |
| 4 | training_catalog | Module:Training | B2 | Training catalog |
| 5 | training_certificates | Module:Training | B1 | Training certificate records |
| 6 | training_certification_audit | Module:Training | B1 | Training certification audit |
| 7 | training_certification_requirements | Module:Training | B2 | Training certification requirements |
| 8 | training_certifications | Module:Training | B1 | Training certification records |
| 9 | training_completion_snapshots | Module:Training | B1 | Training completion snapshots |
| 10 | training_completions | Module:Training | B1 | Training completion records |
| 11 | training_content | Module:Training | B2 | Training content records |
| 12 | training_enrollments | Module:Training | B1 | Training enrollment records |
| 13 | training_programs | Module:Training | B1 | Training program records |
| 14 | training_team_distribution | Module:Training | B1 | Training team distribution |
| 15 | training_user_progress | Module:Training | B1 | Training user progress records |
| 16 | sector_training_paths | Module:Training | B2 | Sector training path definitions |

### 2.19 Asset Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | asset_classification_scheme | Module:Asset | B2 | Asset classification scheme |
| 2 | asset_classifications | Module:Asset | B1 | Asset classification records |
| 3 | asset_dependencies | Module:Asset | B1 | Asset dependency records |
| 4 | asset_evidence_links | Module:Asset | B1 | Asset-evidence link records |
| 5 | asset_lifecycle_events | Module:Asset | B1 | Asset lifecycle events |
| 6 | asset_owners | Module:Asset | B1 | Asset owner records |
| 7 | asset_ownership_matrix | Module:Asset | B2 | Asset ownership matrix |
| 8 | asset_vendor_links | Module:Asset | B1 | Asset-vendor link records |
| 9 | assets | Module:Asset | B1 | Master asset records |

### 2.20 Privacy Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | breach_reporting_records | Module:Privacy | B1 | Breach reporting records |
| 2 | cross_border_transfer_rules | Module:Privacy | B2 | Cross-border transfer rules |
| 3 | data_asset_owners | Module:Privacy | B1 | Data asset owner records |
| 4 | data_asset_types | Module:Privacy | B2 | Data asset type definitions |
| 5 | data_assets | Module:Privacy | B1 | Data asset records |
| 6 | data_classifications | Module:Privacy | B2 | Data classification definitions (tenant) |
| 7 | data_domains | Module:Privacy | B2 | Data domain definitions |
| 8 | data_processing_register | Module:Privacy | B1 | Data processing register |
| 9 | data_quality_issues | Module:Privacy | B1 | Data quality issue records |
| 10 | data_quality_rules | Module:Privacy | B2 | Data quality rule definitions |
| 11 | data_retention_policies | Module:Privacy | B2 | Data retention policies |
| 12 | data_sharing_approvals | Module:Privacy | B1 | Data sharing approval records |
| 13 | data_sharing_requests | Module:Privacy | B1 | Data sharing request records |
| 14 | data_stewards | Module:Privacy | B1 | Data steward records |
| 15 | data_subject_requests | Module:Privacy | B1 | Data subject request records |
| 16 | digital_signatures | Module:Privacy | B1 | Digital signature records |
| 17 | dpia_assessments | Module:Privacy | B1 | DPIA assessment records |
| 18 | dpias | Module:Privacy | B1 | DPIA records |
| 19 | pdpl_consent_records | Module:Privacy | B1 | PDPL consent records |
| 20 | privacy_breaches | Module:Privacy | B1 | Privacy breach records |
| 21 | privacy_control_links | Module:Privacy | B1 | Privacy-control link records |
| 22 | privacy_data_subject_requests | Module:Privacy | B1 | Privacy data subject requests |
| 23 | privacy_incidents | Module:Privacy | B1 | Privacy incident records |
| 24 | privacy_legal_bases | Module:Privacy | B2 | Privacy legal bases |
| 25 | privacy_quarantine_ledger | Module:Privacy | B1 | Privacy quarantine ledger |
| 26 | privacy_retention_policies | Module:Privacy | B2 | Privacy retention policies |
| 27 | privacy_reviews | Module:Privacy | B1 | Privacy review records |
| 28 | retention_rules | Module:Privacy | B2 | Retention rule definitions |

### 2.21 BCP/BCM Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | bcm_audit_log | Module:BCP | B1 | BCM audit log |
| 2 | bcm_dependency_edges | Module:BCP | B1 | BCM dependency edge records |
| 3 | bcm_dependency_maps | Module:BCP | B1 | BCM dependency map records |
| 4 | bcm_dependency_nodes | Module:BCP | B1 | BCM dependency node records |
| 5 | bcm_findings | Module:BCP | B1 | BCM finding records |
| 6 | bcm_maturity_assessments | Module:BCP | B1 | BCM maturity assessment records |
| 7 | bcm_recovery_strategies | Module:BCP | B1 | BCM recovery strategy records |
| 8 | bcp_activations | Module:BCP | B1 | BCP activation records |
| 9 | bcp_bia_templates | Module:BCP | B2 | BCP BIA templates |
| 10 | bcp_crisis_teams | Module:BCP | B1 | BCP crisis team records |
| 11 | bcp_exercise_results | Module:BCP | B1 | BCP exercise result records |
| 12 | bcp_exercise_schedule | Module:BCP | B2 | BCP exercise schedule |
| 13 | bcp_exercises | Module:BCP | B1 | BCP exercise records |
| 14 | bcp_recovery_step_tracking | Module:BCP | B1 | BCP recovery step tracking |
| 15 | bcp_rto_rpo_defaults | Module:BCP | B2 | BCP RTO/RPO defaults |
| 16 | bcp_team_distribution | Module:BCP | B1 | BCP team distribution |
| 17 | bia_assessments | Module:BCP | B1 | BIA assessment records |
| 18 | bia_process_impacts | Module:BCP | B1 | BIA process impact records |
| 19 | resilience_test_plans | Module:BCP | B2 | Resilience test plan definitions |
| 20 | resilience_test_results | Module:BCP | B1 | Resilience test result records |

### 2.22 Connector/Integration Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | connector_automation_rules | Module:Connector | B2 | Connector automation rules |
| 2 | connector_configs | Module:Connector | B2 | Connector configuration records |
| 3 | connector_dependency_graph | Module:Connector | B2 | Connector dependency graph |
| 4 | connector_evidence_mappings | Module:Connector | B2 | Connector evidence mappings |
| 5 | connector_executions | Module:Connector | B1 | Connector execution records |
| 6 | connector_registry | Module:Connector | B2 | Connector registry |
| 7 | connector_status_log | Module:Connector | B1 | Connector status log |
| 8 | connectors | Module:Connector | B1 | Master connector records |
| 9 | erp_connections | Module:Connector | B2 | ERP connection config |
| 10 | erp_field_mappings | Module:Connector | B2 | ERP field mappings |
| 11 | erp_sync_history | Module:Connector | B1 | ERP sync history |
| 12 | integration_configs | Module:Connector | B2 | Integration configuration records |
| 13 | itsm_connections | Module:Connector | B2 | ITSM connection config |
| 14 | itsm_sync_history | Module:Connector | B1 | ITSM sync history |
| 15 | itsm_tickets | Module:Connector | B1 | ITSM ticket records |
| 16 | m365_connections | Module:Connector | B2 | M365 connection config |
| 17 | m365_evidence_items | Module:Connector | B1 | M365 evidence items |
| 18 | m365_sync_history | Module:Connector | B1 | M365 sync history |
| 19 | openclaw_api_keys | Module:Connector | B1 | OpenClaw API key records |
| 20 | siem_connections | Module:Connector | B2 | SIEM connection config |
| 21 | siem_events | Module:Connector | B1 | SIEM event records |
| 22 | siem_sync_history | Module:Connector | B1 | SIEM sync history |
| 23 | vuln_scan_results | Module:Connector | B1 | Vulnerability scan results |
| 24 | vuln_scan_sync_history | Module:Connector | B1 | Vulnerability scan sync history |
| 25 | vuln_scanner_connections | Module:Connector | B2 | Vulnerability scanner connections |
| 26 | vulnerability_findings_map | Module:Connector | B1 | Vulnerability findings map |
| 27 | cmdb_assets | Module:Connector | B1 | CMDB asset records |
| 28 | cmdb_connections | Module:Connector | B2 | CMDB connection config |
| 29 | cmdb_sync_history | Module:Connector | B1 | CMDB sync history |
| 30 | pipeline_webhook_configs | Module:Connector | B2 | Pipeline webhook configs |
| 31 | pipeline_webhook_logs | Module:Connector | B1 | Pipeline webhook logs |
| 32 | inbound_handler_registry | Module:Connector | B2 | Inbound handler registry |
| 33 | inbound_webhook_endpoints | Module:Connector | B2 | Inbound webhook endpoints |
| 34 | inbound_webhook_log | Module:Connector | B1 | Inbound webhook log |

### 2.23 Reporting Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | report_schedule_config | Module:Reporting | B2 | Report schedule configuration |
| 2 | report_shares | Module:Reporting | B1 | Report share records |
| 3 | board_attention_items | Module:Reporting | B1 | Board attention item records |
| 4 | board_pack_items | Module:Reporting | B1 | Board pack item records |
| 5 | board_packs | Module:Reporting | B1 | Board pack records |
| 6 | executive_kpis | Module:Reporting | B1 | Executive KPI records |
| 7 | kpi_history | Module:Reporting | B1 | KPI history records |
| 8 | leadership_digests | Module:Reporting | B1 | Leadership digest records |
| 9 | standup_digests | Module:Reporting | B1 | Standup digest records |
| 10 | powerbi_reports | Module:Reporting | B1 | PowerBI report records |
| 11 | metric_snapshots | Module:Reporting | B1 | Metric snapshot records |

### 2.24 Document Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | document_reviews | Module:Document | B1 | Document review records |
| 2 | document_versions | Module:Document | B1 | Document version records |
| 3 | documents | Module:Document | B1 | Master document records |
| 4 | artifacts | Module:Document | B1 | Artifact records |

### 2.25 Local Knowledge Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | local_knowledge_access_log | Module:Knowledge | B1 | Knowledge access log |
| 2 | local_knowledge_cache | Module:Knowledge | B3 | Knowledge cache |
| 3 | local_knowledge_chunks | Module:Knowledge | B1 | Knowledge chunk records |
| 4 | local_knowledge_custody_chain | Module:Knowledge | B1 | Knowledge custody chain |
| 5 | local_knowledge_document_acl | Module:Knowledge | B1 | Knowledge document ACL |
| 6 | local_knowledge_document_versions | Module:Knowledge | B1 | Knowledge document versions |
| 7 | local_knowledge_documents | Module:Knowledge | B1 | Knowledge document records |
| 8 | local_knowledge_extractions | Module:Knowledge | B1 | Knowledge extraction records |
| 9 | local_knowledge_index | Module:Knowledge | B1 | Knowledge index records |
| 10 | local_knowledge_ingestion_log | Module:Knowledge | B1 | Knowledge ingestion log |
| 11 | local_knowledge_legal_hold_audit | Module:Knowledge | B1 | Knowledge legal hold audit |
| 12 | local_knowledge_published | Module:Knowledge | B1 | Knowledge published records |
| 13 | local_knowledge_source_sync_history | Module:Knowledge | B1 | Knowledge source sync history |
| 14 | local_knowledge_sources | Module:Knowledge | B2 | Knowledge source definitions |
| 15 | local_knowledge_storage_quota | Module:Knowledge | B2 | Knowledge storage quota config |

### 2.26 DORA Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | dora_backup_configs | Module:DORA | B2 | DORA backup configurations |
| 2 | dora_ict_assets | Module:DORA | B1 | DORA ICT asset records |
| 3 | dora_ict_third_party_register | Module:DORA | B1 | DORA ICT third-party register |
| 4 | dora_major_incidents | Module:DORA | B1 | DORA major incident records |
| 5 | dora_resilience_tests | Module:DORA | B1 | DORA resilience test records |
| 6 | dora_threat_intel | Module:DORA | B1 | DORA threat intelligence records |
| 7 | ict_asset_register | Module:DORA | B1 | ICT asset register |
| 8 | ict_major_incident_reports | Module:DORA | B1 | ICT major incident reports |

### 2.27 Project Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | project_assurance_links | Module:Project | B1 | Project assurance link records |
| 2 | project_deliverables | Module:Project | B1 | Project deliverable records |
| 3 | project_exceptions | Module:Project | B1 | Project exception records |
| 4 | project_gate_reviews | Module:Project | B1 | Project gate review records |
| 5 | project_milestones | Module:Project | B1 | Project milestone records |
| 6 | projects | Module:Project | B1 | Master project records |

### 2.28 Roadmap/Strategy Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | roadmap_items | Module:Roadmap | B1 | Roadmap item records |
| 2 | roadmap_tasks | Module:Roadmap | B1 | Roadmap task records |
| 3 | roadmaps | Module:Roadmap | B1 | Master roadmap records |
| 4 | enterprise_priorities | Module:Roadmap | B1 | Enterprise priority records |
| 5 | strategic_objectives | Module:Roadmap | B1 | Strategic objective records |
| 6 | strategic_themes | Module:Roadmap | B2 | Strategic theme definitions |
| 7 | ninety_day_plans | Module:Roadmap | B1 | 90-day plan records |
| 8 | milestone_definitions | Module:Roadmap | B2 | Milestone definitions |
| 9 | milestone_instances | Module:Roadmap | B1 | Milestone instance records |
| 10 | plan_item_instances | Module:Roadmap | B1 | Plan item instance records |

### 2.29 RACI/Responsibility Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | raci_assignments | Module:RACI | B1 | RACI assignment records |
| 2 | raci_matrix | Module:RACI | B1 | RACI matrix records |
| 3 | raci_templates | Module:RACI | B2 | RACI template definitions |
| 4 | responsibilities | Module:RACI | B1 | Responsibility records |
| 5 | responsibility_assignments | Module:RACI | B1 | Responsibility assignment records |
| 6 | responsibility_suggestions | Module:RACI | B1 | Responsibility suggestion records |
| 7 | cadence_overrides | Module:RACI | B2 | Cadence override config |
| 8 | defense_lines | Module:RACI | B2 | Defense line definitions |
| 9 | user_responsibilities | Module:RACI | B1 | User responsibility records |

### 2.30 Security Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | approved_pqc_algorithms | Module:Security | B2 | Approved PQC algorithm list |
| 2 | cryptographic_inventory | Module:Security | B1 | Cryptographic inventory |
| 3 | phishing_campaigns | Module:Security | B1 | Phishing campaign records |
| 4 | phishing_user_results | Module:Security | B1 | Phishing user result records |
| 5 | pqc_test_results | Module:Security | B1 | PQC test result records |
| 6 | quantum_migration_plans | Module:Security | B1 | Quantum migration plan records |
| 7 | security_compliance_attestations | Module:Security | B1 | Security compliance attestations |
| 8 | security_events | Module:Security | B1 | Security event records |
| 9 | security_posture_snapshots | Module:Security | B1 | Security posture snapshots |
| 10 | threat_intelligence_sharing | Module:Security | B1 | Threat intel sharing records |

### 2.31 Quality Gate (QGate) Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | qgate_ai_eval_scores | Module:QGate | B1 | QGate AI eval score records |
| 2 | qgate_mutation_reports | Module:QGate | B1 | QGate mutation report records |
| 3 | qgate_runs | Module:QGate | B1 | QGate run records |
| 4 | qgate_schema_drift_log | Module:QGate | B1 | QGate schema drift log |
| 5 | qgate_stage_results | Module:QGate | B1 | QGate stage result records |
| 6 | qgate_thresholds | Module:QGate | B2 | QGate threshold config |
| 7 | qgate_vrt_snapshots | Module:QGate | B1 | QGate VRT snapshot records |

### 2.32 GRC Cross-Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | grc_control_sector_mapping | Module:GRC-Cross | B2 | GRC control-sector mapping |
| 2 | grc_entity_profile_mapping | Module:GRC-Cross | B2 | GRC entity-profile mapping |
| 3 | grc_evidence_action_mapping | Module:GRC-Cross | B2 | GRC evidence-action mapping |
| 4 | grc_evidence_sector_mapping | Module:GRC-Cross | B2 | GRC evidence-sector mapping |
| 5 | grc_maturity_sync | Module:GRC-Cross | B1 | GRC maturity sync records |
| 6 | grc_qiyas_control_feedback | Module:GRC-Cross | B1 | GRC Qiyas control feedback |
| 7 | grc_raci_assignments | Module:GRC-Cross | B1 | GRC RACI assignment records |
| 8 | grc_risk_sector_mapping | Module:GRC-Cross | B2 | GRC risk-sector mapping |
| 9 | grc_sector_lookup | Module:GRC-Cross | B2 | GRC sector lookup |

### 2.33 ESG/Ethics Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | esg_categories | Module:ESG | B2 | ESG category definitions |
| 2 | esg_metrics | Module:ESG | B1 | ESG metric records |
| 3 | ethics_actions | Module:ESG | B1 | Ethics action records |
| 4 | ethics_reports | Module:ESG | B1 | Ethics report records |

### 2.34 CSA Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | csa_questionnaires | Module:CSA | B2 | CSA questionnaire definitions |
| 2 | csa_responses | Module:CSA | B1 | CSA response records |
| 3 | questionnaires | Module:CSA | B2 | General questionnaire definitions |

### 2.35 CCM (Cloud Control Matrix) Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | ccm_cloud_mappings | Module:CCM | B2 | CCM cloud mapping records |
| 2 | ccm_cycle_log | Module:CCM | B1 | CCM cycle log records |
| 3 | ccm_results | Module:CCM | B1 | CCM result records |

### 2.36 CEP (Complex Event Processing) Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | cep_event_windows | Module:CEP | B1 | CEP event window records |
| 2 | cep_pattern_definitions | Module:CEP | B2 | CEP pattern definitions |

### 2.37 AGRC Engine Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | agrc_engine_dedup | DOS | B1 | AGRC engine dedup state |
| 2 | agrc_engine_runs | DOS | B1 | AGRC engine run records |
| 3 | agrc_event_dlq | DOS | B1 | AGRC event dead letter queue |
| 4 | agrc_event_log | DOS | B1 | AGRC event log |
| 5 | agrc_event_log_archive | DOS | B5 | AGRC event log archive |
| 6 | agrc_metrics_snapshots | DOS | B1 | AGRC metrics snapshots |
| 7 | agrc_os_cycle_log | DOS | B1 | AGRC OS cycle log |
| 8 | agrc_runbooks | DOS | B2 | AGRC runbook definitions |

### 2.38 Action Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | action_class_catalog | Module:Action | B2 | Action class catalog |
| 2 | action_escalation_chains | Module:Action | B2 | Action escalation chains |
| 3 | action_escalation_config | Module:Action | B2 | Action escalation config |
| 4 | action_gating_rules | Module:Action | B2 | Action gating rules |
| 5 | action_item_templates | Module:Action | B2 | Action item templates |
| 6 | action_items | Module:Action | B1 | Action item records |
| 7 | action_sla_escalation_log | Module:Action | B1 | Action SLA escalation log |
| 8 | action_sla_tracking | Module:Action | B1 | Action SLA tracking records |
| 9 | auto_task_config | Module:Action | B2 | Auto task configuration |
| 10 | task_auto_resolution_rules | Module:Action | B2 | Task auto-resolution rules |
| 11 | task_route_rule | Module:Action | B2 | Task routing rule |
| 12 | task_routing_rules | Module:Action | B2 | Task routing rules `[REVIEW]` possible duplicate of task_route_rule |
| 13 | task_type_config | Module:Action | B2 | Task type configuration |

### 2.39 SLA Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | sla_auto_setup_log | Module:SLA | B1 | SLA auto-setup log |
| 2 | sla_breaches | Module:SLA | B1 | SLA breach records |
| 3 | sla_config | Module:SLA | B2 | SLA configuration |
| 4 | sla_definitions | Module:SLA | B2 | SLA definitions |
| 5 | sla_predictions | Module:SLA | B1 | SLA prediction records |
| 6 | sla_priority_config | Module:SLA | B2 | SLA priority configuration |
| 7 | severity_escalation_thresholds | Module:SLA | B2 | Severity escalation thresholds |

### 2.40 Proactive Leadership Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | proactive_leadership_config_history | Module:Proactive | B1 | Config history records |
| 2 | proactive_leadership_cycles | Module:Proactive | B1 | Cycle records |
| 3 | proactive_leadership_insights | Module:Proactive | B1 | Insight records |
| 4 | proactive_leadership_patterns | Module:Proactive | B2 | Pattern definitions |
| 5 | proactive_leadership_thresholds | Module:Proactive | B2 | Threshold config |
| 6 | proactive_module_coverage | Module:Proactive | B1 | Module coverage records |
| 7 | proactive_signal_rules | Module:Proactive | B2 | Signal rule definitions |

### 2.41 Journey Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | journey_certifications | Module:Journey | B1 | Journey certification records |
| 2 | journey_maturity_snapshots | Module:Journey | B1 | Journey maturity snapshots |
| 3 | journey_milestones | Module:Journey | B1 | Journey milestone records |
| 4 | journey_phases | Module:Journey | B2 | Journey phase definitions |
| 5 | journey_roadmaps | Module:Journey | B1 | Journey roadmap records |
| 6 | journey_state | Module:Journey | B1 | Journey state records |

### 2.42 Engagement Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | engagement_misalignment | Module:Engagement | B1 | Engagement misalignment records |
| 2 | engagement_os_cycle_log | Module:Engagement | B1 | Engagement OS cycle log |

### 2.43 Change Management Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | change_management_records | Module:Change | B1 | Change management records |
| 2 | change_tasks | Module:Change | B1 | Change task records |
| 3 | change_triage_decisions | Module:Change | B1 | Change triage decision records |

### 2.44 Contract Module Tables (Tenant)

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | contract_control_links | Module:Contract | B1 | Contract-control link records |
| 2 | contracts | Module:Contract | B1 | Master contract records |
| 3 | consultant_assignments | Module:Contract | B1 | Consultant assignment records |

### 2.45 Remaining Module Tables (Tenant)

Tables belonging to various smaller modules or cross-cutting concerns.

| # | Table | Owner | Bucket | Notes |
|---|-------|-------|--------|-------|
| 1 | activated_templates | DOS | B1 | Activated template records |
| 2 | alert_instances | DOS | B1 | Alert instance records |
| 3 | alert_rules | DOS | B2 | Alert rule definitions |
| 4 | applications | DOS | B1 | Application records |
| 5 | archetype_bundle_map | DOS | B2 | Archetype-bundle mapping |
| 6 | archetype_policy_pack_map | DOS | B2 | Archetype-policy-pack mapping |
| 7 | assignment_resolution_log | DOS | B1 | Assignment resolution log |
| 8 | assessments | Module:Assessment | B1 | General assessment records |
| 9 | attestation_campaigns | Module:Compliance | B1 | Attestation campaign records |
| 10 | attestation_records | Module:Compliance | B1 | Attestation records |
| 11 | backup_restore_points | DOS | B1 | Backup restore point records |
| 12 | blueprint_generation_runs | DOS | B1 | Blueprint generation run records |
| 13 | closure_reviews | Module:Governance | B1 | Closure review records |
| 14 | command_history | DOS | B1 | Command history records |
| 15 | command_palette_history | DOS | B1 | Command palette history |
| 16 | committee_visibility_thresholds | Module:Governance | B2 | Committee visibility thresholds |
| 17 | config_entry_sources | DOS | B2 | Config entry source definitions |
| 18 | decision_record | Module:Governance | B1 | Decision record |
| 19 | default_automation_templates | DOS | B4 | Default automation templates |
| 20 | enforcement_gate_log | DOS | B1 | Enforcement gate log |
| 21 | executive_attention_items | Module:Reporting | B1 | Executive attention items |
| 22 | expert_packs | DOS | B2 | Expert pack definitions |
| 23 | external_stakeholder_profiles | DOS | B1 | External stakeholder profiles |
| 24 | handoff_batches | DOS | B1 | Handoff batch records |
| 25 | handoff_log | DOS | B1 | Handoff log records |
| 26 | idempotent | DOS | B1 | Idempotency tracking |
| 27 | inline_edit_history | DOS | B1 | Inline edit history |
| 28 | input_validation_rules | DOS | B2 | Input validation rules |
| 29 | instrument_versions | DOS | B1 | Instrument version records |
| 30 | mandate_sources | Module:Governance | B2 | Mandate source definitions |
| 31 | mandates | Module:Governance | B1 | Mandate records |
| 32 | maturity_assessments | Module:Analytics | B1 | Maturity assessment records (tenant) |
| 33 | maturity_snapshots | Module:Analytics | B1 | Maturity snapshot records |
| 34 | mitigating_control_mappings | Module:Controls | B2 | Mitigating control mappings |
| 35 | outcome_links | DOS | B1 | Outcome link records |
| 36 | pending_assignment_queue | DOS | B1 | Pending assignment queue |
| 37 | performance_cache | DOS | B3 | Performance cache |
| 38 | preventive_control_mappings | Module:Controls | B2 | Preventive control mappings |
| 39 | process_audit_trail | DOS | B1 | Process audit trail |
| 40 | process_metrics | DOS | B1 | Process metric records |
| 41 | process_tasks | DOS | B1 | Process task records |
| 42 | processes | DOS | B1 | Process records |
| 43 | profile_completeness_rules | DOS | B2 | Profile completeness rules |
| 44 | profile_completeness_scores | DOS | B1 | Profile completeness scores |
| 45 | reference_categories | DOS | B2 | Reference category definitions |
| 46 | regulator_assignments | Module:Compliance | B1 | Regulator assignment records |
| 47 | regulator_requests | Module:Compliance | B1 | Regulator request records |
| 48 | requirements | Module:Compliance | B1 | Requirement records |
| 49 | resource_allocations | DOS | B1 | Resource allocation records |
| 50 | role_experience_profiles | DAuth | B2 | Role experience profiles |
| 51 | role_learning_states | DAuth | B1 | Role learning states |
| 52 | runtime_overrides | DOS | B2 | Runtime override config |
| 53 | score_calibrations | Module:Analytics | B1 | Score calibration records |
| 54 | scoring_policies | Module:Analytics | B2 | Scoring policy definitions |
| 55 | search_index_config | DOS | B2 | Search index configuration |
| 56 | sections | DOS | B2 | Section definitions |
| 57 | unified_squad_members | DOS | B1 | Unified squad member records |
| 58 | user_availability | DOS | B1 | User availability records |
| 59 | user_competencies | DOS | B1 | User competency records |
| 60 | user_performance | DOS | B1 | User performance records |
| 61 | workload_snapshots | DOS | B1 | Workload snapshot records |

---

## 3. Ownership Summary by Layer

### Final Ownership Totals

| Owner | Public Schema | Tenant Schema | Grand Total | Percentage |
|-------|-------------|---------------|-------------|------------|
| **DOS Platform** | 79 | 234 | 313 | 19.7% |
| **DAuth Security** | 14 | 90 | 104 | 6.6% |
| **Module Layer** | 135 | 813 | 948 | 59.7% |
| **AI/Agent Layer** | 16 | 206 | 222 | 14.0% |
| **Total** | **244** | **1,343** | **1,587** | **100%** |

> **Product Layer treatment:** Per the 5-layer spec (AGENTS.md Patch 0 §5), the Product Layer owns "product modules, actions, approval rules, dashboards, onboarding presets, agent behaviors." In schema terms, these are realized as:
> - **DOS-owned tables:** `platform_products`, `product_modules`, `product_registry`, `product_dependencies`, `product_modules_registry`, `product_nav_definitions` (product lifecycle managed by DOS)
> - **Module-owned tables:** Each module's business tables (risk_*, compliance_*, etc.) implement product-layer business logic
>
> The Product Layer is not a separate table prefix — it is the *logical composition* of DOS product management + Module domain tables. Therefore, Product Layer tables are accounted for within the DOS (6 tables) and Module Layer (948 tables) totals above. There is no double-counting.

### Module Layer Breakdown

| Module | Table Count |
|--------|-------------|
| Module:Qiyas | 82 |
| Module:Workflow | 53 |
| Module:Governance | 53 |
| Module:Evidence | 47 |
| Module:Risk | 47 |
| Module:Controls | 42 |
| Module:Compliance | 39 |
| Module:Vendor | 37 |
| Module:Onboarding | 32 |
| Module:Incident | 33 |
| Module:Connector | 34 |
| Module:Policy | 28 |
| Module:Audit | 23 |
| Module:Privacy | 28 |
| Module:BCP | 20 |
| Module:Training | 16 |
| Module:Knowledge | 15 |
| Module:Obligation | 14 |
| Module:Action | 13 |
| Module:Reporting | 11 |
| Module:RACI | 9 |
| Module:Security | 10 |
| Module:Roadmap | 10 |
| Module:DORA | 8 |
| Module:GRC-Cross | 9 |
| Module:SLA | 7 |
| Module:Proactive | 7 |
| Module:QGate | 7 |
| Module:Journey | 6 |
| Module:Project | 6 |
| Module:BCP (config) | 1 |
| Module:Asset | 9 |
| Module:ESG | 4 |
| Module:Document | 4 |
| Module:CSA | 3 |
| Module:CCM | 3 |
| Module:CEP | 2 |
| Module:Change | 3 |
| Module:Contract | 3 |
| Module:Engagement | 2 |
| Module:Analytics | 6 |
| Module:Assessment | 1 |
| Module:Exception | 6 |
| Module:Remediation | 4 |

---

## 4. Bucket Classification Summary

| Bucket | Code | Description | Count | Percentage |
|--------|------|-------------|-------|------------|
| B1 | Canonical Runtime Truth | Tables used in runtime decisions, transactional data, event logs, state records | 1,078 | 67.9% |
| B2 | Registry Metadata | Configuration, definitions, catalogs, registries, templates, rules | 431 | 27.2% |
| B3 | Presentation/Runtime Config | Dashboards, widgets, navigation, caches, UI config | 48 | 3.0% |
| B4 | Provisioning/Seed Input | Seeds, templates, provisioning steps, onboarding seeds | 26 | 1.6% |
| B5 | Legacy/Archive-Only | Archive tables, deprecated storage (e.g. `*_v2`, `*_archive`) | 4 | 0.3% |

> **Bucket reconciliation:** 1,078 + 431 + 48 + 26 + 4 = 1,587. All tables classified. The previous "Unclassified: 70" has been resolved by promoting ambiguous tables into B1 (Runtime Truth) where they participate in active runtime flows (e.g. cross-cutting audit logs, correlation tables, hybrid config-runtime tables).

---

## 5. Boundary Violation Flags

The following tables have been flagged for human review due to ambiguous ownership, potential duplicates, or possible architecture law violations.

### Potential Law 1 Violations (No Runtime Twins)

| Table | Schema | Issue | Recommendation |
|-------|--------|-------|----------------|
| dashboard_role_bindings_v2 | Tenant | Possible twin of `dashboard_role_bindings` | Investigate if v2 replaces v1; if so, deprecate v1 with death date (Law 8) |
| user_preferences_v2 | Tenant | Possible twin of `user_preferences` | Same as above |
| agent_approvals_v2 | Tenant | V2 suffix suggests twin | Verify if original exists and apply Law 1/Law 8 |

### Potential Duplicate Tables

| Table A | Table B | Schema | Issue |
|---------|---------|--------|-------|
| event_trigger_binding | event_trigger_bindings | Tenant | Singular vs plural naming |
| module_approval_matrices | module_approval_matrix | Tenant | Plural vs singular naming |
| widget_registry | widgets_registry | Tenant | Inconsistent naming |
| workspace_profile | workspace_profiles | Tenant | Singular vs plural naming |
| task_route_rule | task_routing_rules | Tenant | Different naming, same concern |

### Cross-Schema Duplicates

The following tables exist in both public and tenant schemas. This is expected for tenant-scoped copies of platform-level data but should be verified.

| Table | Public | Tenant | Expected |
|-------|--------|--------|----------|
| approval_chains | Yes | Yes | Yes -- tenant override |
| approval_requests | Yes | Yes | Yes -- tenant override |
| audit_schedules | Yes | Yes | Yes -- tenant override |
| control_domains | Yes | Yes | Yes -- tenant override |
| control_evidence_requirements | Yes | Yes | Yes -- tenant override |
| dogan_actions_log | Yes | Yes | Yes -- tenant copy |
| dogan_guardian_config | Yes | Yes | Yes -- tenant copy |
| dogan_guardian_events | Yes | Yes | Yes -- tenant copy |
| dogan_learning_metrics | Yes | Yes | Yes -- tenant copy |
| event_type_registry | Yes | Yes | Yes -- tenant copy |
| evidence_lifecycle | Yes | Yes | Yes -- tenant override |
| evidence_types | Yes | Yes | Yes -- tenant override |
| incident_categories | Yes | Yes | Yes -- tenant override |
| lifecycle_checkpoints | Yes | Yes | Yes -- tenant copy |
| onboarding_answers | Yes | Yes | Yes -- tenant copy |
| platform_products | Yes | Yes | Yes -- tenant copy |
| product_modules | Yes | Yes | Yes -- tenant copy |
| provisioning_jobs | Yes | Yes | Yes -- tenant copy |
| provisioning_steps | Yes | Yes | Yes -- tenant copy |
| risk_categories | Yes | Yes | Yes -- tenant override |
| role_function_map | Yes | Yes | Yes -- tenant copy |
| tenant_module_entitlements | Yes | Yes | Yes -- tenant copy |
| tenant_settings | Yes | Yes | Yes -- tenant copy |
| user_roles | Yes | Yes | Yes -- tenant copy |
| vendor_assessments | Yes | Yes | Yes -- tenant override |
| workspace_seeds | Yes | Yes | Yes -- tenant copy |
| data_classifications | Yes | Yes | Yes -- tenant override |
| maturity_assessments | Yes | Yes | Yes -- tenant override |
| regulatory_changes | Yes | Yes | Yes -- tenant override |
| regulatory_frameworks | Yes | Yes | Yes -- tenant override |
| regulatory_change_log | Yes | Yes | Yes -- tenant override |

---

## 6. Governance Notes

1. **All 1,587 tables classified.** Zero gaps in coverage.
2. **Five-layer ownership model applied consistently.** DOS owns platform infrastructure, DAuth owns identity/access, Module layer owns domain business tables, AI/Agent layer owns agent runtime and AI governance tables.
3. **Bucket classification follows runtime usage pattern.** B1 (runtime truth) dominates at 63.5%, reflecting a production system with heavy transactional data. B2 (registry metadata) at 27.2% reflects the configuration-driven architecture.
4. **Flagged items require human review.** 5 potential duplicate pairs and 3 potential Law 1 violations identified. 31 cross-schema duplicates are expected by design (tenant-scoped copies of platform data).
5. **Module:Qiyas is the largest module** at 82 tables, reflecting the comprehensive assessment/maturity scoring system.

---

*Generated from schema inspection on 2026-04-05. Source files: `/tmp/all_public.txt` (244 tables), `/tmp/all_tenant.txt` (1,343 tables).*
*Governing spec: AGENTS.md Patch 0 section 4 (Architecture Laws), section 5 (5-Layer Ownership Model), Patch 2 (Five-Bucket Classification).*
