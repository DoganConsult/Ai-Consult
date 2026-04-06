# REF-08 — Full-Stack Table Consumption Specification

> **Scope:** All 1,667 unique tables (61 public + 1,606 tenant) across the entire DOS platform
> **Authority:** AGENTS.md Patch 0 §4 (Architecture Laws), Patch 2 §4 (Five-Bucket Model)
> **Date:** 2026-04-05
> **Status:** SPEC — requires implementation execution

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| **Total unique tables** | 1,667 |
| **Public schema tables** | 61 |
| **Tenant schema tables** | 1,606 |
| **Owning modules (backend)** | 49 |
| **Total service files** | 1,614 |
| **Total route files** | 670 |
| **Total repository files** | 53 |
| **Tables with SQL wiring (queried in code)** | 43 |
| **Tables needing SQL wiring** | 716 |
| **Tables with no code reference** | ~908 |

### Critical Finding

**97.4% of tables have no direct SQL wiring** in the repository layer. Services exist and contain `pool.query` patterns, but overwhelmingly query only the primary aggregate root table (e.g., `issues`) while child/supporting tables (`issue_comments`, `issue_sla_tracking`, etc.) are not yet consumed.

### Wiring Definition

A table is **fully consumed** when it has all 6 layers:

```
L1: Repository   — SQL queries (SELECT, INSERT, UPDATE, soft-DELETE)
L2: Service      — Business logic calling repository
L3: Route/API    — REST endpoint wired to service
L4: Event        — Domain events emitted on write operations
L5: Frontend API — Angular service calling backend endpoint
L6: UI           — Component rendering data from frontend service
```

---

## 2. Ownership Distribution

### 2.1 Platform Layer (DOS + DAuth) — 349 tables

| Owner | Tables | Schema | Role |
|-------|--------|--------|------|
| **DOS (platform-dos)** | 199 | tenant | Tenancy, org structure, lifecycle, config, events, modules |
| **DAuth (platform-dauth + dauth)** | 89 | tenant | Identity, roles, permissions, access, delegation, SoD |
| **DAuth (public bootstrap)** | 61 | public | Lookups, frameworks, onboarding config, provisioning |

### 2.2 Module Layer — 1,257 tables

| Module | Tables | Services | Routes | Repos | SQL-Wired |
|--------|--------|----------|--------|-------|-----------|
| ai | 197 | 147 | 35 | 2 | 4 |
| governance | 102 | 49 | 36 | 2 | 1 |
| workflow | 100 | 62 | 28 | 2 | 1 |
| qiyas | 96 | 10 | 5 | 2 | 1 |
| compliance | 58 | 67 | 52 | 4 | 2 |
| evidence | 58 | 34 | 23 | 2 | 1 |
| controls | 54 | 24 | 12 | 2 | 0 |
| bcp | 51 | 14 | 9 | 3 | 3 |
| incident | 47 | 21 | 5 | 2 | 1 |
| policy | 44 | 25 | 15 | 2 | 1 |
| risk | 42 | 41 | 17 | 4 | 4 |
| vendor | 39 | 30 | 15 | 2 | 1 |
| dora | 31 | 10 | 3 | 2 | 5 |
| audit | 26 | 42 | 33 | 2 | 1 |
| integrations | 28 | 17 | 10 | 2 | 1 |
| privacy | 26 | 15 | 4 | 2 | 1 |
| ai-governance | 18 | 38 | 20 | 2 | 1 |
| training | 22 | 16 | 5 | 2 | 1 |
| governance-os | 18 | 42 | 5 | 2 | 5 |
| action | 21 | 11 | 4 | 2 | 1 |
| remediation | 16 | 13 | 6 | 2 | 1 |
| packs | 16 | 19 | 3 | 2 | 1 |
| local-knowledge | 16 | 50 | 2 | 3 | 2 |
| team | 14 | 7 | 3 | 1 | 0 |
| agrc-engine | 14 | 23 | 30 | 3 | 3 |
| journey | 13 | 7 | 4 | 2 | 3 |
| dashboard | 13 | 19 | 6 | 2 | 0 |
| notification | 12 | 13 | 6 | 2 | 1 |
| reporting | 10 | 26 | 14 | 2 | 0 |
| governance-ai | 11 | 16 | 2 | 2 | 0 |
| asset | 12 | 16 | 14 | 2 | 4 |
| exception | 11 | 18 | 4 | 2 | 1 |
| analytics | 8 | 30 | 10 | 2 | 1 |
| records | 10 | 13 | 3 | 2 | 1 |
| quality-gate | 9 | 9 | 1 | 0 | 0 |
| admin | 9 | 11 | 15 | 2 | 1 |
| navigation | 8 | 18 | 3 | 3 | 3 |
| issues | 7 | 13 | 4 | 2 | 1 |
| portals | 6 | 13 | 4 | 2 | 1 |
| inbox | 6 | 15 | 4 | 2 | 1 |
| widgets | 4 | 15 | 6 | 5 | 6 |
| proactive-leadership | 5 | 17 | 2 | 3 | 2 |
| provisioning | 4 | 12 | 4 | 2 | 0 |
| foundation | 2 | 9 | 18 | 1 | 0 |
| onboarding | 2 | 39 | 6 | 8 | 0 |
| ksa-regulatory | 1 | 18 | 2 | 3 | 2 |
| bootstrap | 1 | 13 | 3 | 2 | 1 |

---

## 3. Architecture Pattern — Standard Module Stack

Per AGENTS.md Patch 5 + Patch 6, every module table must be consumed through this canonical stack:

```
backend/src/modules/<module>/
├── <module>.module.ts              # Manifest (ownedTables, events, lifecycle)
├── repositories/
│   ├── <module>.repository.ts      # Primary aggregate CRUD
│   ├── <module>-<entity>.repo.ts   # Per-entity repositories (NEW)
│   └── <module>-query.repo.ts      # Complex read queries
├── services/
│   ├── <module>.service.ts         # Core CRUD delegation
│   ├── <module>-lifecycle.service.ts
│   ├── <module>-<concern>.service.ts
│   └── <module>-event.service.ts   # Domain event emission
├── controllers/
│   └── <module>.controller.ts
├── routes/
│   ├── <module>.routes.ts          # Primary routes
│   └── <module>-admin.routes.ts    # Admin routes
├── schemas/
│   └── <module>.schemas.ts         # Zod validation
├── diagnostics/
│   └── <module>-diagnostics.service.ts
└── index.ts                        # Barrel exports
```

### 3.1 Repository Pattern (L1)

Every table gets a repository class or function set:

```typescript
// repositories/<module>-<entity>.repo.ts
export class EntityRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findById(id: string): Promise<GenericRow | null> { ... }
  async findAll(filters: FilterParams): Promise<{ rows: GenericRow[]; total: number }> { ... }
  async create(data: Record<string, unknown>): Promise<GenericRow | null> { ... }
  async update(id: string, data: Record<string, unknown>): Promise<GenericRow | null> { ... }
  async softDelete(id: string, deletedBy?: string): Promise<boolean> { ... }
  async count(filters?: Partial<FilterParams>): Promise<number> { ... }
}
```

### 3.2 Service Pattern (L2)

Services delegate to repositories and add business logic:

```typescript
// services/<module>-<concern>.service.ts
export async function listEntities(tenantId: string, filters: FilterParams) {
  const repo = new EntityRepository(tenantId);
  return repo.findAll(filters);
}
```

### 3.3 Route Pattern (L3)

Routes bind HTTP verbs to controller/service functions:

```typescript
router.get('/<entities>', requirePermission('<module>.<entity>.read'), asyncHandler(listHandler));
router.get('/<entities>/:id', requirePermission('<module>.<entity>.read'), asyncHandler(getHandler));
router.post('/<entities>', requirePermission('<module>.<entity>.create'), validate({ body: createSchema }), asyncHandler(createHandler));
router.put('/<entities>/:id', requirePermission('<module>.<entity>.update'), validate({ body: updateSchema }), asyncHandler(updateHandler));
router.delete('/<entities>/:id', requirePermission('<module>.<entity>.delete'), asyncHandler(deleteHandler));
```

### 3.4 Event Pattern (L4)

Write operations emit domain events:

```typescript
// services/<module>-event.service.ts
import { emitDomainEvent } from '../../../platform/dos/events/event-bus';

export function emitEntityCreated(tenantId: string, entity: GenericRow) {
  emitDomainEvent({ type: '<module>.<entity>.created', tenantId, payload: entity });
}
```

### 3.5 Frontend API Pattern (L5)

```typescript
// frontend/src/app/core/services/api/<module>.api.service.ts
@Injectable({ providedIn: 'root' })
export class ModuleApiService {
  private base = '/api/v1/<module>';
  constructor(private http: HttpClient) {}

  list(params?: FilterParams) { return this.http.get<ApiResponse>(`${this.base}/<entities>`, { params }); }
  getById(id: string) { return this.http.get<ApiResponse>(`${this.base}/<entities>/${id}`); }
  create(data: CreateDto) { return this.http.post<ApiResponse>(`${this.base}/<entities>`, data); }
  update(id: string, data: UpdateDto) { return this.http.put<ApiResponse>(`${this.base}/<entities>/${id}`, data); }
  delete(id: string) { return this.http.delete<ApiResponse>(`${this.base}/<entities>/${id}`); }
}
```

### 3.6 UI Component Pattern (L6)

```typescript
// frontend/src/app/features/<module>/pages/<entity>-list.page.component.ts
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class EntityListPageComponent implements OnInit {
  // Uses ModuleApiService to fetch/render data
}
```

---

## 4. Module-by-Module Consumption Spec

### Legend

- **W** = Wired (SQL queries exist for this table)
- **R** = Repository exists but table not yet queried
- **S** = Service references table by name but no SQL
- **M** = Only in manifest (no code reference)
- **N** = Needs all layers (table exists in migration only)

---

### 4.1 AI Module (197 tables)

**Owner:** Module:AI (MP-03)
**Backend:** `backend/src/modules/ai/` — 147 services, 35 routes, 2 repos
**Frontend:** `frontend/src/app/features/ai/` — 25 pages, 1 service, 1 store
**SQL-Wired:** 4 tables (agent_memories, ai_agent_registry, llm_usage_log, tenant_llm_budgets)

**Tables requiring wiring (193):**

| Group | Tables | Status | Priority |
|-------|--------|--------|----------|
| Agent Core | agent_action_history, agent_activation_rules, agent_activity_log, agent_anomaly_detections, agent_approvals_v2, agent_assignment_templates, agent_autonomy_policies, agent_circuit_breaker, agent_collaboration_metrics, agent_conflicts, agent_context_assignments, agent_cycle_memory, agent_cycle_summaries | N | P1 |
| Agent Runtime | agent_dead_letter_queue, agent_delegations, agent_dependency_config, agent_discoveries, agent_eval_scores, agent_events, agent_failure_patterns, agent_feedback, agent_governance_audit, agent_handoffs, agent_learning_events, agent_lesson_applications, agent_lessons_learned | N | P1 |
| Agent Config | agent_mode_overrides, agent_model_config, agent_model_performance_cache, agent_patterns, agent_pending_actions, agent_process_governance_rules, agent_profiles, agent_prompt_versions, agent_proposals, agent_reasoning_chain, agent_reasoning_steps, agent_reasoning_traces | N | P1 |
| Agent Ops | agent_runs, agent_runtime_config, agent_sla_activation_rules, agent_slo_definitions, agent_slo_measurements, agent_status_log, agent_steps, agent_suggestions, agent_tasks, agent_tool_permissions, agent_trigger_chains, agent_user_feedback | N | P1 |
| AI Sessions | ai_session_artifacts, ai_session_messages, ai_session_tool_calls, ai_sessions, ai_session_evaluations, ai_session_feedback, ai_session_summaries | N | P2 |
| AI Tools | ai_tool_definitions, ai_tool_execution_log, ai_tool_permissions, ai_tool_registry | N | P2 |
| AI Config | ai_agent_config, ai_agent_personas, ai_agent_tool_bindings, ai_agent_workflows, ai_context_providers, ai_model_configs | N | P2 |
| MCP | mcp_agent_overrides, mcp_prompt_overrides, mcp_resource_overrides, mcp_tool_approval_requests, mcp_tool_execution_log, mcp_tool_overrides, mcp_tool_usage_counters, mcp_workflow_tool_bindings | N | P2 |
| HITL | hitl_gates, hitl_states, human_oversight_config, intervention_audit_log | N | P2 |
| LLM | llm_traces | N | P2 |
| Reasoning | reasoning_chain_summary | N | P3 |
| Prompts | prompt_drift_baselines, prompt_injection_log | N | P3 |
| Autonomous | autonomous_workflow_config, autonomy_progression_log | N | P3 |
| Memory | memory_access_log, memory_consent_log, memory_summaries | N | P3 |
| Other AI | automated_decision_register, automated_insights, consultant_assignments, contextual_suggestions, copilot_proposed_actions, langgraph_agent_metrics, nudge_feedback, nudges, personal_agent_assignments, recommendation_triggers | N | P3 |

**Required new repositories:** ~15 (grouped by entity cluster)
**Required new routes:** ~20 endpoint groups
**Required events:** agent.run.started, agent.run.completed, agent.run.failed, agent.tool.called, ai.session.created, ai.hitl.requested, ai.hitl.resolved

---

### 4.2 Governance Module (102 tables)

**Owner:** Module:Governance (MP-04)
**Backend:** `backend/src/modules/governance/` — 49 services, 36 routes, 2 repos
**Frontend:** `frontend/src/app/features/governance/` — 31 pages, 1 service, 1 store
**SQL-Wired:** 1 table (governance_charters)

**Tables requiring wiring (101):**

| Group | Tables | Priority |
|-------|--------|----------|
| Bodies & Meetings | governance_bodies, governance_body_members, governance_committee_meetings, governance_meeting_attendance, governance_meeting_minutes, governance_meeting_resolutions | P1 |
| Board Packs | governance_board_packs, governance_board_pack_items, board_attention_items, board_pack_items, board_packs | P1 |
| Action Items | governance_action_items, governance_action_updates, governance_agenda_items | P1 |
| Authority | governance_authority_levels, governance_delegation_rules, governance_decision_frameworks | P1 |
| Calendar | governance_calendar_entries, governance_calendar_recurrences | P2 |
| Effectiveness | governance_effectiveness_reviews, governance_effectiveness_scores, governance_performance_metrics | P2 |
| Policies | governance_policy_reviews, governance_policy_versions, governance_policy_attestations | P2 |
| Documents | governance_document_library, governance_templates, governance_reports | P2 |
| Ethics/ESG | esg_categories, esg_metrics, ethics_actions, ethics_reports | P3 |
| Strategic | strategic_objectives, strategic_themes, enterprise_priorities, initiative_definitions, initiative_runs | P3 |
| RACI | raci_assignments, raci_matrix, raci_templates | P3 |
| Resources | resource_allocations, responsibilities, responsibility_assignments, responsibility_suggestions | P3 |
| AI Integration | governance_ai_feedback, governance_ai_runs, governance_auto_fire_log | P3 |

**Required new repositories:** ~10
**Required new routes:** ~15 endpoint groups
**Required events:** governance.body.created, governance.meeting.scheduled, governance.resolution.adopted, governance.action.assigned

---

### 4.3 Workflow Module (100 tables)

**Owner:** Module:Workflow (MP-02)
**Backend:** `backend/src/modules/workflow/` — 62 services, 28 routes, 2 repos
**Frontend:** `frontend/src/app/features/workflow/` — 47 pages, 4 services, 2 stores
**SQL-Wired:** 1 table (workflow_instances)

**Tables requiring wiring (99):**

| Group | Tables | Priority |
|-------|--------|----------|
| Core Engine | workflows, workflow_definitions, workflow_steps, workflow_transitions, workflow_conditions | P1 |
| Instances | workflow_instance_steps, workflow_instance_variables, workflow_instance_history | P1 |
| Approvals | approval_chains, approval_requests, approval_decisions, approval_history, approval_packs, approval_pre_screens, approval_authority_matrix, approver_resolution_cache, auto_approval_config | P1 |
| SLA | sla_definitions, sla_config, sla_breaches, sla_predictions, sla_priority_config, sla_auto_setup_log | P1 |
| Tasks | task_auto_resolution_rules, task_route_rule, task_routing_rules, task_type_config | P2 |
| Automation | automation_log, automation_rules, default_automation_templates | P2 |
| Process | process_audit_trail, process_metrics, process_tasks, processes | P2 |
| Change Mgmt | change_management_records, change_tasks, change_triage_decisions | P2 |
| Assignment | assignment_resolution_log, pending_assignment_queue | P3 |
| Pipeline | pipeline_webhook_configs, pipeline_webhook_logs | P3 |

**Required new repositories:** ~12
**Required new routes:** ~18 endpoint groups
**Required events:** workflow.instance.created, workflow.step.completed, workflow.approval.requested, workflow.approval.decided, workflow.sla.breached

---

### 4.4 Platform-DOS (199 tables)

**Owner:** DOS Platform Layer
**Backend:** `backend/src/platform/dos/` — 158 services, `backend/src/modules/platform/` — 427 services
**SQL-Wired:** ~60 tables (via platform services)

**Tables requiring wiring (~139):**

| Group | Tables | Priority |
|-------|--------|----------|
| Module System | module_registry, module_activation_status, module_activation_events, module_activation_policies, module_activation_rules, module_admin_config, module_approval_matrices, module_assignments, module_audit_config, module_automation_config, module_certifications, module_code_aliases, module_contact_points, module_cross_link_rules, module_dependency_graph, module_entitlement_map, module_entitlements, module_entity_links, module_event_log, module_health_checks, module_health_status, module_inbound_events, module_kickstart_log, module_lifecycle_definitions, module_lifecycle_transitions, module_maturity_stages, module_metrics_snapshots, module_nav_registration, module_ownership_rules, module_pages, module_permission_definitions, module_permissions, module_preflight_runs, module_readiness_results, module_readiness_thresholds, module_role_definitions, module_role_permission_bindings, module_role_team_mappings, module_roles, module_runtime_health, module_settings, module_sla_tracking, module_sod_policies, module_sod_rules, module_stale_record_checks, module_table_mappings, module_task_type_mappings, module_trigger_mappings, module_user_contexts, module_workflow_profiles, module_workflow_registry, modules | P1 |
| Org Structure | org_cost_center_assignments, org_custom_field_definitions, org_dimension_values, org_dimensions, org_hierarchy_edges, org_hierarchy_nodes, org_location_assignments, org_profile, org_unit_role_assignments, org_validation_executions, org_validation_patterns, org_validation_rules, organizations, departments, positions, locations, legal_entities, business_units, business_services, business_services_catalog, company_profiles | P1 |
| Event Bus | event_consumer_cursors, event_entity_sequences, event_idempotency_log, event_processing_state, event_subscriptions, event_trigger_binding, event_trigger_bindings, event_type_registry | P1 |
| Lifecycle | lifecycle_checkpoints, lifecycle_template_injections | P1 |
| Entity System | entity_dimension_assignments, entity_instances, entity_lifecycle_log, entity_link_metadata, entity_links, entity_relationships, entity_routing_config, entity_type_routing_config, entity_types, cross_module_links | P2 |
| Tenant Config | tenant_ai_allowlist, tenant_ai_config, tenant_archetypes, tenant_blueprints, tenant_domains, tenant_email_config, tenant_llm_budgets, tenant_module_entitlements, tenant_nav_rules, tenant_page_overrides, tenant_quota_config, tenant_role_definitions, tenant_settings, tenant_settings_history | P2 |
| DOS Agent | dos_agent_approvals, dos_agent_instructions, dos_agent_kernel_audit, dos_agent_memories, dos_agent_metrics, dos_agent_registry, dos_agent_runs, dos_agent_schedules, dos_agent_state_log, dos_agent_states, dos_agent_tasks, dos_agent_tool_audit, dos_agent_tool_calls, dos_agent_watchdog_log | P2 |
| Products | platform_products, product_modules, product_overrides, product_user_entitlements, products | P2 |
| Config/Settings | settings, platform_feature_flags, platform_operation_config, platform_security_config, feature_flags, api_keys, endpoint_config, rate_limit_config | P2 |
| UI/Shell | shell_config_overrides, drawer_templates, command_history, command_palette_history, cockpit_signal, inline_edit_history, saved_searches, saved_views, recent_searches, favorites, first_visits | P3 |
| Other Infra | cache_dependencies, cache_invalidation_log, performance_cache, websocket_event_queue, applications, api_ai_config, inbound_handler_registry, profile_completeness_rules, profile_completeness_scores | P3 |

---

### 4.5 Platform-DAuth (89 tables)

**Owner:** DAuth Layer
**Backend:** `backend/src/platform/dauth/` — 42 services

**Tables requiring wiring (~70):**

| Group | Tables | Priority |
|-------|--------|----------|
| Identity | user_profiles_extended, user_lifecycle_events, user_certifications, user_competencies, user_preferences, user_preferences_v2, user_sessions, user_availability, member_profiles, member_lifecycle_events, person_profiles | P1 |
| Roles & Permissions | roles, role_permissions, role_permission_map, role_permission_inheritance, role_profiles, role_profile_assignments, role_profile_mappings, role_functions, role_function_map, role_function_permissions, role_function_scope_map, functional_roles, functional_role_bundles, functional_role_bundle_items, permission_templates, permission_analytics | P1 |
| Access Control | access_profiles, access_review_campaigns, access_review_items, conditional_access_grants, external_user_scopes, effective_user_modules, effective_user_permissions, user_module_permissions, user_access_profiles, user_role_assignments, user_function_overrides | P1 |
| Delegation & SoD | delegation_chains, delegation_policies, delegation_rules, delegations, delegated_authorities, sod_conflict_log, sod_conflict_resolution_history, sod_rules | P1 |
| Actor System | actor_registry, actor_role_assignments, actor_access_assignments, actor_audit_log | P1 |
| Authorization | authorization_audit_log, authorization_decision_log, authorization_mismatch_log, authorization_permissions, authz_decision_log, authentication_policies | P1 |
| Enterprise Roles | enterprise_user_role_assignments, enterprise_priorities, authority_level_catalog, authority_levels, authority_matrix, decision_authorities, function_authorities | P2 |
| Security | security_compliance_attestations, security_events, security_posture_snapshots, field_rbac_permissions, field_rbac_role_mappings, guard_decision_log, rbac_config_audit | P2 |
| Audit | role_assignment_audit, role_assignment_history, role_usage_audit, role_transition_requests | P3 |

---

### 4.6 Qiyas Module (96 tables)

**Owner:** Module:Qiyas (MP-41)
**Backend:** `backend/src/modules/qiyas/` — 10 services, 5 routes, 2 repos
**SQL-Wired:** 1 table (qiyas_assessments)

**Key table groups:** benchmarks, frameworks, gap_analysis, roadmap_items, strategy_directions, trend_analysis, maturity_assessments, maturity_snapshots, score_calibrations, scoring_policies, assessments + ~85 supporting tables.

**Service gap:** 96 tables / 10 services = **9.6 tables per service** (highest ratio). Needs service expansion.

---

### 4.7 Compliance Module (58 tables)

**Owner:** Module:Compliance (MP-06)
**Backend:** 67 services, 52 routes, 4 repos — **Best-staffed module**
**SQL-Wired:** 2 tables

**Key table groups:** compliance_assessments, compliance_findings, compliance_frameworks, compliance_obligations, compliance_controls, attestation_campaigns, attestation_records, obligation_*, regulatory_*, framework_*, mandate*, questionnaires, sector_training_paths

---

### 4.8 Evidence Module (58 tables)

**Owner:** Module:Evidence (MP-09)
**Backend:** 34 services, 23 routes, 2 repos
**SQL-Wired:** 1 table (evidence)

**Key table groups:** evidence_artifacts, evidence_chain_of_custody, evidence_classifications, evidence_collections, evidence_freshness_records, evidence_lifecycle_transitions, evidence_quality_scores, evidence_reviews, evidence_schedules, evidence_tags, evidence_templates, evidence_version_history, digital_signatures

---

### 4.9 Controls Module (54 tables)

**Owner:** Module:Controls (MP-14)
**Backend:** 24 services, 12 routes, 2 repos
**SQL-Wired:** 0 tables

**Key table groups:** control_assessments, control_categories, control_effectiveness, control_implementations, control_libraries, control_monitoring, control_objectives, control_test_results, control_tests, controls, ccm_*, csa_*, instrument_versions, mitigating_control_mappings, preventive_control_mappings, ucf_control_versions

---

### 4.10 BCP Module (51 tables)

**Owner:** Module:BCP (MP-XX)
**Backend:** 14 services, 9 routes, 3 repos
**SQL-Wired:** 3 tables

**Key table groups:** bcp_activities, bcp_assessments, bcp_audit_log, bcp_communication_plans, bcp_contact_lists, bcp_crisis_simulations, bcp_dependency_maps, bcp_documents, bcp_exercises, bcp_impact_analysis, bcp_incidents, bcp_plans, bcp_recovery_strategies, bcp_risk_scenarios, bcp_training_records, bcm_*, bia_*, crisis_*, backup_restore_points, plan_item_instances

---

### 4.11–4.50 Remaining Modules (Summary)

| Module | Tables | Services | Wired | Key Gap |
|--------|--------|----------|-------|---------|
| incident | 47 | 21 | 1 | alert_rules, case_*, escalation_*, near_miss_*, pir_*, triage_*, war_rooms |
| policy | 44 | 25 | 1 | policy_*, sop_procedures |
| risk | 42 | 41 | 4 | risk_assessments, kri_*, rcsa_*, risk_appetite, risk_treatments |
| vendor | 39 | 30 | 1 | vendor_*, contract*, consultant_assignments |
| dora | 31 | 10 | 5 | dora_*, ict_*, resilience_*, vuln_*, cryptographic_*, pqc_*, quantum_*, threat_* |
| integrations | 28 | 17 | 1 | connector_*, erp_*, itsm_*, m365_*, siem_*, webhook_*, openclaw_* |
| audit | 26 | 42 | 1 | audit_*, external_audit_*, finding_*, repeat_findings, artifacts, requirements |
| privacy | 26 | 15 | 1 | privacy_*, data_*, dpias, dpia_*, breach_*, cross_border_*, pdpl_* |
| training | 22 | 16 | 1 | training_*, phishing_*, sector_training_paths |
| action | 21 | 11 | 1 | action_items through action_time_tracking |
| ai-governance | 18 | 38 | 1 | ai_gov_* (registry, inventory, model_cards, policies, risk/impact assessments, bias, fairness, explainability, transparency, ethical reviews, data lineage, monitoring alerts, use cases, validation, audit log) |
| governance-os | 18 | 42 | 5 | governance_os_*, engagement_*, os_*, outcome_links |
| remediation | 16 | 13 | 1 | remediation_*, capa_effectiveness_tests, closure_reviews |
| packs | 16 | 19 | 1 | pack_*, archetype_*, activated_templates, expert_packs, operating_packs |
| local-knowledge | 16 | 50 | 2 | local_knowledge_*, knowledge_* |
| team | 14 | 7 | 0 | team_definitions, team_members, team_*, unified_squad_members |
| agrc-engine | 14 | 23 | 3 | agrc_engine_*, agrc_config_defaults |
| journey | 13 | 7 | 3 | journey_* |
| dashboard | 13 | 19 | 0 | dashboards, dashboard_widgets, dashboard_zones, dashboard_* |
| governance-ai | 11 | 16 | 0 | governance_ai_signals, governance_ai_narratives, governance_ai_recommendations, etc. |
| notification | 12 | 13 | 1 | notification_*, email_*, mobile_push_tokens, push_tokens, notifications_log |
| reporting | 10 | 26 | 0 | reporting_*, report_* |
| exception | 11 | 18 | 1 | exception_* |
| asset | 12 | 16 | 4 | asset_*, cmdb_* |
| analytics | 8 | 30 | 1 | analytics_dashboards, analytics_widgets, analytics_metrics, analytics_datasets, analytics_queries, analytics_snapshots, analytics_refresh_schedules, analytics_cache |
| records | 10 | 13 | 1 | records, record_versions, record_access_log, record_retention_policies, record_holds, record_categories, document_*, retention_rules |
| admin | 9 | 11 | 1 | admin_configurations, admin_audit_log, admin_feature_flags, admin_system_health, admin_maintenance_windows, admin_announcements, admin_scheduled_tasks, admin_data_retention_policies, system_health_snapshots |
| quality-gate | 9 | 9 | 0 | qgate_*, gate_definitions, gate_validation_rules |
| navigation | 8 | 18 | 3 | navigation_registry, navigation_overrides, navigation_role_bindings, etc. |
| issues | 7 | 13 | 1 | issue_comments, issue_attachments, issue_links, issue_escalations, issue_sla_tracking, issue_history |
| portals | 6 | 13 | 1 | portal_* |
| inbox | 6 | 15 | 1 | inbox_messages, inbox_* |
| widgets | 4 | 15 | 6 | **FULLY WIRED** — best coverage |
| proactive-leadership | 5 | 17 | 2 | proactive_leadership_initiatives, proactive_leadership_actions, leadership_digests, ninety_day_plans, standup_digests |
| provisioning | 4 | 12 | 0 | provisioning_diagnostics, provisioning_*, workspace_provisioning_* |
| foundation | 2 | 9 | 0 | foundation_principles, foundation_values |
| ksa-regulatory | 1 | 18 | 2 | ksa_regulatory_requirements |
| onboarding | 2 | 39 | 0 | onboarding_* (mostly public schema, tenant tables minimal) |
| bootstrap | 1 | 13 | 1 | bootstrap_execution_log |

---

## 5. Execution Plan — Phased Wiring

### Phase 1: Critical Path (P1) — ~400 tables

**Scope:** Tables required for first tenant operation + core platform function

| Wave | Modules | Tables | Deliverable |
|------|---------|--------|-------------|
| P1-W1 | DAuth (access, roles, actors, auth) | ~50 | Identity + access control fully wired |
| P1-W2 | DOS (module system, org, events, lifecycle) | ~80 | Platform infrastructure wired |
| P1-W3 | Workflow (core engine, approvals, SLA) | ~35 | Approval + state machine wired |
| P1-W4 | Governance (bodies, meetings, actions) | ~25 | Governance core wired |
| P1-W5 | Compliance (frameworks, obligations, attestations) | ~30 | Compliance core wired |
| P1-W6 | Risk (register, assessments, KRIs) | ~20 | Risk core wired |
| P1-W7 | Controls, Evidence, Audit (core tables) | ~40 | GRC triad wired |
| P1-W8 | AI (agent core, sessions, tools) | ~50 | Agent runtime wired |
| P1-W9 | Issues, Incident, Exception (core) | ~30 | Operational modules wired |
| P1-W10 | Dashboard, Notification, Navigation | ~25 | User experience layer wired |

**Estimated effort per wave:** Each wave = ~5 repository files + ~8 service files + ~5 route handlers + ~10 events + Zod schemas
**Gate per wave:** All tables in scope have L1 (repo) + L2 (service) + L3 (route) coverage. Events (L4) for write operations.

### Phase 2: Extended Coverage (P2) — ~350 tables

**Scope:** Secondary tables, config, and integration tables

| Wave | Focus | Tables |
|------|-------|--------|
| P2-W1 | AI extended (MCP, HITL, reasoning, memory) | ~60 |
| P2-W2 | DOS extended (tenant config, DOS agents, products, entity system) | ~60 |
| P2-W3 | DAuth extended (enterprise roles, security, delegation) | ~40 |
| P2-W4 | Governance extended + Governance-OS + Governance-AI | ~50 |
| P2-W5 | BCP + DORA + Remediation | ~50 |
| P2-W6 | Integrations + Vendor + Privacy | ~50 |
| P2-W7 | Qiyas + AGRC-Engine + Analytics + Reporting | ~40 |

### Phase 3: Full Coverage (P3) — ~250 tables

**Scope:** Audit trails, AI feedback, strategic tables, UI preferences

| Wave | Focus | Tables |
|------|-------|--------|
| P3-W1 | All remaining AI tables (prompts, nudges, autonomous) | ~40 |
| P3-W2 | All remaining governance (ethics, strategic, RACI, resources) | ~40 |
| P3-W3 | All remaining DOS (UI/shell, cache, misc infra) | ~40 |
| P3-W4 | All remaining modules (training, packs, local-knowledge, etc.) | ~50 |
| P3-W5 | All remaining DAuth (audit, transition, usage) | ~30 |
| P3-W6 | All remaining tables + cross-module verification | ~50 |

### Phase 4: Frontend Wiring (L5 + L6)

**Scope:** After backend L1–L4 is complete for a module, wire frontend.

Per module:
1. Create/update API service in `frontend/src/app/core/services/api/<module>.api.service.ts`
2. Update feature store to consume API service
3. Wire existing page components to use real data (replace mock/stub data)
4. Add missing page components for new entity types
5. Update route definitions if new pages added

### Phase 5: Agent Integration

**Scope:** After L1–L6, register tables as agent-accessible tools.

Per module:
1. Register entity CRUD as agent tools in `ai_tool_definitions`
2. Add tool permissions in `agent_tool_permissions`
3. Wire agent service to call module APIs
4. Add HITL gates for write operations per `human_oversight_config`

---

## 6. Verification Criteria

### Per-Table Verification

| Check | Criteria |
|-------|----------|
| L1 | Table name appears in a `.repository.ts` or `.repo.ts` SQL string |
| L2 | Repository is imported and called in a `.service.ts` file |
| L3 | Service is imported and called in a `.routes.ts` handler |
| L4 | Write operations call `emitDomainEvent()` or equivalent |
| L5 | Frontend `.api.service.ts` has method matching the route |
| L6 | A `.component.ts` file calls the API service method |

### Module-Level Gate

- All `ownedTables` in manifest have L1–L3 coverage
- Primary aggregate root has L1–L6 coverage
- Event emission exists for create/update/delete on primary entities
- Diagnostics service queries table counts for health check
- At least one integration test exercises the route→repo path

### Platform-Level Gate

- Every table in `all_tables_complete.txt` has at least L1 coverage
- No orphan queries (SQL references tables not in migrations)
- No phantom tables (manifest claims tables not in migrations)
- Event bus has consumers registered for all emitted events
- Frontend can render at least a list view for every module

---

## 7. Appendix A — Public Schema Tables (61)

These tables live in the `public` schema and are owned by DOS or DAuth platform services.

| Table | Owner | Wired In |
|-------|-------|----------|
| schema_migrations | DOS | migration runner |
| platform_config | DOS | config.repository.ts |
| tenants | DOS | provisioning services |
| tenant_user_memberships | DOS | dauth membership services |
| users | DAuth | auth services |
| sessions | DAuth | session.service.ts |
| provisioning_step_definitions | DOS | provisioning services |
| lookup_frameworks | DOS | onboarding inference |
| lookup_countries | DOS | onboarding UI |
| lookup_sectors | DOS | onboarding inference |
| lookup_cities | DOS | onboarding UI |
| lookup_ksa_cities | DOS | KSA-specific flows |
| lookup_ksa_provinces | DOS | KSA-specific flows |
| lookup_ksa_regulatory_authorities | DOS | KSA regulatory |
| lookup_timezones | DOS | onboarding UI |
| lookup_languages | DOS | i18n |
| lookup_employee_ranges | DOS | onboarding UI |
| lookup_data_sources | DOS | evidence module |
| lookup_isic4_sectors | DOS | sector inference |
| lookup_grc_role_staffing | DOS | role inference |
| lookup_authority_frameworks | DOS | framework inference |
| lookup_authority_sector_mapping | DOS | sector→authority |
| onboarding_sessions | DOS | onboarding service |
| onboarding_stage_definitions | DOS | onboarding config |
| onboarding_questions | DOS | question bank |
| onboarding_question_options | DOS | question bank |
| onboarding_question_types | DOS | question bank |
| onboarding_user_answers | DOS | answer service |
| onboarding_answer_history | DOS | audit trail |
| onboarding_progress | DOS | progress tracker |
| onboarding_compliance_mapping | DOS | framework inference |
| onboarding_country_framework_cascade | DOS | cascade rules |
| onboarding_dynamic_lookups | DOS | dynamic options |
| onboarding_field_guidance | DOS | UX hints |
| onboarding_config_audit | DOS | audit |
| onboarding_translations | DOS | i18n |
| onboarding_ui_config | DOS | UI config |
| onboarding_tenant_overrides | DOS | tenant customization |
| regulatory_frameworks | DOS | framework registry |
| regulatory_controls | DOS | control registry |
| control_requirements | DOS | control library |
| control_domains | DOS | control taxonomy |
| control_sectors | DOS | sector mapping |
| control_evidence_requirements | DOS | evidence requirements |
| control_cross_mappings | DOS | cross-framework |
| control_regulator_mapping | DOS | regulator links |
| evidence_types | DOS | evidence taxonomy |
| evidence_requirements | DOS | evidence rules |
| evidence_lifecycle | DOS | lifecycle config |
| framework_relationships | DOS | framework graph |
| framework_versions | DOS | versioning |
| framework_version_diffs | DOS | diff tracking |
| country_regulators | DOS | regulator registry |
| regulator_sector_enforcement | DOS | enforcement |
| risk_categories | DOS | risk taxonomy |
| risks | DOS | risk seed data |
| compliance_risks | DOS | compliance-risk link |
| risk_control_mappings | DOS | risk-control link |
| sector_risks | DOS | sector risk profiles |
| sector_code_mapping | DOS | sector codes |
| role_permission_overrides | DAuth | permission overrides |
| table_system_flags | DOS | table metadata |

---

## 8. Appendix B — Migration File Index

| Migration | Tables | Module Coverage |
|-----------|--------|-----------------|
| master/001–113 | 61 | Public schema (lookups, onboarding, frameworks) |
| master/114 | 4 | DAuth bootstrap (actors, access_profiles) |
| tenant/001–939 | 1,305 | Original tenant migrations |
| tenant/940 | 25 | Governance gap fill |
| tenant/941 | 10 | Evidence gap fill |
| tenant/942 | 16 | Policy gap fill |
| tenant/943 | 18 | Workflow gap fill |
| tenant/944 | 6 | Controls gap fill |
| tenant/945 | 28 | BCP gap fill |
| tenant/946 | 14 | Action gap fill |
| tenant/947 | 12 | DORA gap fill |
| tenant/948 | 11 | Remediation gap fill |
| tenant/949 | 9 | Incident gap fill |
| tenant/950 | 7 | Exception gap fill |
| tenant/951 | 16 | AI module gap fill |
| tenant/952 | 17 | AI governance gap fill |
| tenant/953 | 9 | Governance-AI gap fill |
| tenant/954 | 16 | Analytics + Reporting gap fill |
| tenant/955 | 12 | Qiyas + AGRC-Engine gap fill |
| tenant/956 | 36 | Experience modules gap fill |
| tenant/957 | 39 | Platform operations gap fill |
| **Total** | **1,667** | |

---

## 9. Appendix C — Event Catalog (Required)

Every module must emit events for write operations. Minimum event types per module:

| Module | Events Required |
|--------|----------------|
| ai | agent.run.started, agent.run.completed, agent.run.failed, agent.tool.executed, ai.session.created, ai.session.ended, ai.hitl.requested, ai.hitl.resolved |
| governance | governance.body.created, governance.meeting.scheduled, governance.meeting.completed, governance.resolution.adopted, governance.action.assigned, governance.action.completed |
| workflow | workflow.instance.created, workflow.step.advanced, workflow.approval.requested, workflow.approval.decided, workflow.sla.approaching, workflow.sla.breached, workflow.instance.completed |
| compliance | compliance.assessment.started, compliance.assessment.completed, compliance.finding.created, compliance.obligation.due, compliance.attestation.requested, compliance.attestation.completed |
| risk | risk.created, risk.assessed, risk.treatment.assigned, risk.kri.breached, risk.appetite.exceeded |
| controls | control.created, control.test.executed, control.test.failed, control.effectiveness.changed |
| evidence | evidence.collected, evidence.reviewed, evidence.approved, evidence.expired, evidence.freshness.stale |
| audit | audit.created, audit.finding.created, audit.completed, audit.management.response.due |
| incident | incident.created, incident.escalated, incident.resolved, incident.pir.created |
| policy | policy.created, policy.published, policy.review.due, policy.attestation.requested |
| vendor | vendor.created, vendor.assessment.due, vendor.risk.changed, vendor.contract.expiring |
| All modules | <module>.entity.created, <module>.entity.updated, <module>.entity.deleted |

---

*End of REF-08 — Full-Stack Table Consumption Specification*
