// @ts-nocheck
import { logger } from '../../observability/logger.service';
// ============================================
// Module Workflow Registry Service
// Single source of truth for module configuration:
// lifecycle, chains, templates, roles, automation.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../resilience/resilient-catch';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ModuleRegistryEntry {
  moduleCode: string;
  grcModuleName: string | null;
  displayNameEn: string;
  displayNameAr: string | null;
  moduleCategory: 'core_grc' | 'operational' | 'governance' | 'advanced';
  hasLifecycle: boolean;
  lifecycleStatuses: string[];
  initialStatus: string | null;
  terminalStatuses: string[];
  primaryTemplateCode: string | null;
  secondaryTemplates: string[];
  chainCodes: string[];
  chainTriggerEvents: string[];
  kickstartStatus: string | null;
  kickstartAt: string | null;
  permissionPrefix: string;
  primaryRoles: string[];
  slaDefaultHours: number;
  automationLevel: 'manual' | 'semi' | 'full' | 'autonomous';
  eventTypes: string[];
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  licensed: boolean;
  /** Team code that owns this module (Law 5: Explicit Contracts) */
  owningTeam: string | null;
  /** Email of the module owner for escalation */
  ownerEmail: string | null;
  /** Event types this module consumes from the event bus */
  consumedEventTypes: string[];
}

export interface ModuleDependency {
  sourceModule: string;
  targetModule: string;
  dependencyType: 'requires' | 'feeds_into' | 'triggers' | 'validates';
  viaEvent: string | null;
  viaChain: string | null;
}

export interface ModuleAutomationRule {
  id: number;
  moduleCode: string;
  ruleCode: string;
  ruleNameEn: string;
  triggerEvent: string;
  actionType: string;
  actionConfig: Record<string, any>;
  conditions: Record<string, any>;
  enabled: boolean;
}

// ── Registry Queries ───────────────────────────────────────────────────────

export async function getFullRegistry(tenantId: string): Promise<ModuleRegistryEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_workflow_registry WHERE is_active = TRUE ORDER BY sort_order`,
  );
  return result.rows.map(mapRegistryRow);
}

export async function getModuleEntry(tenantId: string, moduleCode: string): Promise<ModuleRegistryEntry | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_workflow_registry WHERE module_code = $1`,
    [moduleCode],
  );
  return result.rows.length ? mapRegistryRow(getFirstRow(result)) : null;
}

export async function getDependencyGraph(tenantId: string): Promise<ModuleDependency[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_dependency_graph WHERE is_active = TRUE ORDER BY source_module, target_module`,
  );
  return result.rows.map((r: GenericRow) => ({
    sourceModule: r.source_module,
    targetModule: r.target_module,
    dependencyType: r.dependency_type,
    viaEvent: r.via_event,
    viaChain: r.via_chain,
  }));
}

export async function getModuleDependencies(tenantId: string, moduleCode: string): Promise<{
  requires: ModuleDependency[];
  feedsInto: ModuleDependency[];
  triggers: ModuleDependency[];
  validates: ModuleDependency[];
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_dependency_graph
     WHERE (source_module = $1 OR target_module = $1) AND is_active = TRUE`,
    [moduleCode],
  );
  const deps = result.rows.map((r: GenericRow) => ({
    sourceModule: r.source_module,
    targetModule: r.target_module,
    dependencyType: r.dependency_type as ModuleDependency['dependencyType'],
    viaEvent: r.via_event,
    viaChain: r.via_chain,
  }));
  return {
    requires: deps.filter(d => d.dependencyType === 'requires'),
    feedsInto: deps.filter(d => d.dependencyType === 'feeds_into'),
    triggers: deps.filter(d => d.dependencyType === 'triggers'),
    validates: deps.filter(d => d.dependencyType === 'validates'),
  };
}

export async function getAutomationRules(tenantId: string, moduleCode?: string): Promise<ModuleAutomationRule[]> {
  const schema = tenantSchema(tenantId);
  const where = moduleCode ? 'WHERE module_code = $1' : '';
  const params = moduleCode ? [moduleCode] : [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_automation_config ${where} ORDER BY module_code, rule_code`,
    params,
  );
  return result.rows.map((r: GenericRow) => ({
    id: r.id,
    moduleCode: r.module_code,
    ruleCode: r.rule_code,
    ruleNameEn: r.rule_name_en,
    triggerEvent: r.trigger_event,
    actionType: r.action_type,
    actionConfig: r.action_config || {},
    conditions: r.conditions || {},
    enabled: r.enabled,
  }));
}

// ── Registry Mutations ─────────────────────────────────────────────────────

export async function updateModuleConfig(
  tenantId: string,
  moduleCode: string,
  updates: Partial<Pick<ModuleRegistryEntry, 'automationLevel' | 'slaDefaultHours' | 'isActive' | 'licensed' | 'icon' | 'color'>>,
): Promise<ModuleRegistryEntry | null> {
  const schema = tenantSchema(tenantId);
  const allowed: Record<string, string> = {
    automationLevel: 'automation_level',
    slaDefaultHours: 'sla_default_hours',
    isActive: 'is_active',
    licensed: 'licensed',
    icon: 'icon',
    color: 'color',
  };
  const sets: string[] = [];
  const vals: any[] = [moduleCode];
  let idx = 2;
  for (const [key, col] of Object.entries(allowed)) {
    if ((updates)[key] !== undefined) {
      sets.push(`${col} = $${idx}`);
      vals.push((updates)[key]);
      idx++;
    }
  }
  if (sets.length === 0) return getModuleEntry(tenantId, moduleCode);

  const result = await safeQuery(
    `UPDATE "${schema}".module_workflow_registry SET ${sets.join(', ')}, updated_at = NOW()
     WHERE module_code = $1 RETURNING *`,
    vals,
  );
  return result.rows.length ? mapRegistryRow(getFirstRow(result)) : null;
}

export async function toggleAutomationRule(
  tenantId: string,
  ruleId: number,
  enabled: boolean,
): Promise<ModuleAutomationRule | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".module_automation_config SET enabled = $2
     WHERE id = $1 RETURNING *`,
    [ruleId, enabled],
  );
  if (!result.rows.length) return null;
  const r = getFirstRow(result);
  return {
    id: r.id,
    moduleCode: r.module_code,
    ruleCode: r.rule_code,
    ruleNameEn: r.rule_name_en,
    triggerEvent: r.trigger_event,
    actionType: r.action_type,
    actionConfig: r.action_config || {},
    conditions: r.conditions || {},
    enabled: r.enabled,
  };
}

// ── Orchestration Summary ──────────────────────────────────────────────────

export async function getOrchestrationSummary(tenantId: string): Promise<{
  modules: { total: number; active: number; autonomous: number; withLifecycle: number };
  chains: { total: number; active: number };
  automationRules: { total: number; enabled: number };
  dependencies: { total: number };
  transitionCount: number;
}> {
  const schema = tenantSchema(tenantId);
  const [mods, chains, rules, deps, transitions] = await Promise.all([
    safeQuery(`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_active)::int AS active,
      COUNT(*) FILTER (WHERE automation_level = 'autonomous')::int AS autonomous,
      COUNT(*) FILTER (WHERE has_lifecycle)::int AS with_lifecycle
      FROM "${schema}".module_workflow_registry`),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, active: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active
      FROM "${schema}".workflow_chain_definitions`), { tenantId: tenantId, operation: 'query module_workflow_registry' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, enabled: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE enabled)::int AS enabled
      FROM "${schema}".module_automation_config`), { tenantId: tenantId, operation: 'query module_workflow_registry' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".module_dependency_graph WHERE is_active = TRUE`), { tenantId: tenantId, operation: 'query workflow_chain_definitions' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".module_lifecycle_transitions`), { tenantId: tenantId, operation: 'query module_automation_config' }),
  ]);
  return {
    modules: getFirstRow(mods),
    chains: getFirstRow(chains),
    automationRules: getFirstRow(rules),
    dependencies: getFirstRow(deps),
    transitionCount: getFirstRow(transitions)?.total || 0,
  };
}

// ── Module Descriptor (Event Routing) ────────────────────────────────────

export interface ModuleDescriptor {
  moduleCode: string;
  grcModuleName: string;        // plural name used by automation_rules table (e.g., "risks", "controls", "policies")
  routeAliases: string[];       // all names automationMiddleware("xxx") uses
  entityTypes: string[];        // audit entity types this module owns
  dashboardTarget: string;      // canonical name for cache invalidation
  eventActionMap: Record<string, string>;  // CUD action → event type
  grcEventMap: Record<string, string>;     // detailed GRC event → AGRC canonical type
  raciScopeType: string | null; // RACI scope type for process orchestration
  entityTableName: string | null; // DB table name for cross-module lookups
  entityIdColumn: string | null;  // PK column name for cross-module lookups
}

/**
 * Hardcoded boot-time fallback mirroring all current static maps.
 * Used before any tenant DB is available.
 * After migration 355, the DB values override these at runtime.
 */
export const BOOT_DESCRIPTORS: ModuleDescriptor[] = [
  {
    moduleCode: 'risk', grcModuleName: 'risks',
    routeAliases: ['risk', 'risks', 'digital-twin', 'risk-scoring'],
    entityTypes: ['risk'], dashboardTarget: 'risk',
    raciScopeType: 'risk', entityTableName: 'risks', entityIdColumn: 'risk_id',
    eventActionMap: { create: 'risk.created', update: 'risk.score_changed', delete: 'risk.changed' },
    grcEventMap: { created: 'risk.created', updated: 'risk.score_changed', deleted: 'risk.changed', status_changed: 'risk.score_changed', approved: 'risk.treatment_updated' },
  },
  {
    moduleCode: 'compliance', grcModuleName: 'controls',
    routeAliases: ['compliance', 'controls', 'control-lifecycle', 'compliance-attestation', 'maturity', 'quick-grc-accelerator', 'auto-task', 'privacy-budget', 'ontology', 'ucf', 'compliance-drift', 'compliance-workspace', 'scoring', 'scoring-policies', 'task-board', 'registry', 'monitoring', 'ksa', 'rcsa', 'sama-assessment'],
    entityTypes: ['control'], dashboardTarget: 'compliance',
    raciScopeType: 'control', entityTableName: 'controls', entityIdColumn: 'control_id',
    eventActionMap: { create: 'compliance.gap_detected', update: 'compliance.posture_changed', delete: 'control.state_changed' },
    grcEventMap: { remediation_created: 'audit.remediation_due', remediation_updated: 'audit.remediation_due', drift_detected: 'compliance.drift_detected' },
  },
  {
    moduleCode: 'policy', grcModuleName: 'policies',
    routeAliases: ['policy', 'policy-attestation', 'policy-template', 'policy-code', 'policy-lifecycle', 'governance', 'cadence', 'comment', 'copilot', 'bulk-action', 'autonomy', 'content-pack', 'privacy', 'consultant-center', 'contextual-ai', 'inference', 'role-matrix', 'role-profile', 'roadmap', 'ethics-governance', 'unified-squad', 'pack-management', 'governance-registers', 'governance-raci-templates', 'governance-workload', 'governance-ai', 'governance-os'],
    entityTypes: ['policy'], dashboardTarget: 'governance',
    raciScopeType: 'policy', entityTableName: 'policies', entityIdColumn: 'policy_id',
    eventActionMap: { create: 'policy.created', update: 'policy.approved', delete: 'policy.expired' },
    grcEventMap: { created: 'policy.created', updated: 'policy.approved', deleted: 'policy.expired', status_changed: 'policy.approved', approved: 'policy.approved', raci_assigned: 'raci.assigned', raci_removed: 'raci.removed', owner_assigned: 'raci.assigned' },
  },
  {
    moduleCode: 'evidence', grcModuleName: 'evidence',
    routeAliases: ['evidence', 'evidence-catalog', 'evidence-tasks'],
    entityTypes: ['evidence'], dashboardTarget: 'evidence',
    raciScopeType: 'evidence', entityTableName: 'evidence_tasks', entityIdColumn: 'task_id',
    eventActionMap: { create: 'evidence.uploaded', update: 'evidence.uploaded', delete: 'evidence.expired' },
    grcEventMap: { created: 'evidence.uploaded', updated: 'evidence.uploaded', deleted: 'evidence.expired', approved: 'evidence.approved', rejected: 'evidence.rejected', submitted: 'evidence.submitted', version_created: 'evidence.version_created', collected: 'evidence.collected', task_submitted: 'evidence.task_submitted', task_approved: 'evidence.task_approved', task_rejected: 'evidence.task_rejected', action_created: 'evidence.requested', action_updated: 'evidence.collected' },
  },
  {
    moduleCode: 'audit', grcModuleName: 'assessments',
    routeAliases: ['audit', 'assessments', 'assessment', 'audit-finding-trends', 'audit-ratings', 'audit-packages', 'audit-finding-slas', 'audit-repeat-findings', 'audit-capa-effectiveness', 'audit-committee', 'audit-risk-scoring', 'audit-evidence-versions', 'audit-team', 'audit-cross-module', 'audit-external', 'audit-reminders', 'audit-time-tracking', 'audit-working-papers', 'audit-qa-reviews', 'audit-regulatory', 'audit-universe', 'audit-test-plans', 'explainability', 'red-team', 'contract-tests'],
    entityTypes: ['assessment'], dashboardTarget: 'audit',
    raciScopeType: 'assessment', entityTableName: 'assessment_items', entityIdColumn: 'item_id',
    eventActionMap: { create: 'audit.finding_created', update: 'audit.completed', delete: 'audit.completed' },
    grcEventMap: { created: 'audit.finding_created', updated: 'compliance.assessment_completed', deleted: 'audit.completed', status_changed: 'compliance.assessment_completed', launched: 'compliance.assessment_completed', response_submitted: 'compliance.assessment_completed' },
  },
  {
    moduleCode: 'incident', grcModuleName: 'incidents',
    routeAliases: ['incidents'],
    entityTypes: ['incident'], dashboardTarget: 'incidents',
    raciScopeType: 'incident', entityTableName: 'incidents', entityIdColumn: 'incident_id',
    eventActionMap: { create: 'incident.created', update: 'incident.resolved', delete: 'incident.resolved' },
    grcEventMap: { created: 'incident.created', updated: 'incident.resolved', deleted: 'incident.resolved', status_changed: 'incident.resolved', escalated: 'incident.escalated', near_miss_reported: 'incident.near_miss_reported', near_miss_converted: 'incident.near_miss_converted', pir_created: 'incident.pir_created', pir_updated: 'incident.pir_created', pir_sign_off: 'incident.pir_signed_off', pir_signed_off: 'incident.pir_signed_off', taxonomy_created: 'incident.created', taxonomy_updated: 'incident.created', regulatory_notification_created: 'incident.regulatory_notification_due', regulatory_submitted: 'incident.regulatory_submitted', risk_linked: 'incident.risk_linked', risk_auto_updated: 'incident.risk_linked', trend_detected: 'incident.trend_detected' },
  },
  {
    moduleCode: 'exception', grcModuleName: 'exceptions',
    routeAliases: ['exceptions', 'exception'],
    entityTypes: ['exception'], dashboardTarget: 'exceptions',
    raciScopeType: 'exception', entityTableName: 'control_exceptions', entityIdColumn: 'exception_id',
    eventActionMap: { create: 'compliance.gap_detected', update: 'compliance.posture_changed', delete: 'compliance.posture_changed' },
    grcEventMap: { created: 'exception.created', updated: 'exception.status_changed', deleted: 'exception.status_changed', approved: 'exception.approved', rejected: 'exception.rejected', status_changed: 'exception.status_changed' },
  },
  {
    moduleCode: 'governance', grcModuleName: 'governance',
    routeAliases: ['position', 'roles', 'sod-check', 'access-review', 'role-detail'],
    entityTypes: [], dashboardTarget: 'governance',
    raciScopeType: 'governance', entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'policy.created', update: 'policy.approved', delete: 'policy.expired' },
    grcEventMap: { raci_assigned: 'raci.assigned', raci_removed: 'raci.removed', owner_assigned: 'raci.assigned' },
  },
  {
    moduleCode: 'vendor', grcModuleName: 'vendors',
    routeAliases: ['vendors', 'vendor-risk-ext'],
    entityTypes: ['vendor'], dashboardTarget: 'vendors',
    raciScopeType: 'vendor', entityTableName: 'vendors', entityIdColumn: 'vendor_id',
    eventActionMap: { create: 'vendor.onboarded', update: 'vendor.risk_changed', delete: 'vendor.risk_changed' },
    grcEventMap: { created: 'vendor.onboarded', updated: 'vendor.risk_changed', deleted: 'vendor.risk_changed', dd_initiated: 'vendor.dd_initiated', dd_completed: 'vendor.dd_completed', dd_step_updated: 'vendor.dd_initiated', fourth_party_added: 'vendor.fourth_party_flagged', sla_breached: 'vendor.sla_breached', sla_metric_recorded: 'vendor.sla_warning', offboarding_initiated: 'vendor.offboarding_initiated', offboarding_step_updated: 'vendor.offboarding_initiated', offboarding_completed: 'vendor.offboarding_completed', monitoring_signal: 'vendor.monitoring_signal', auto_tiered: 'vendor.risk_changed' },
  },
  {
    moduleCode: 'bcp', grcModuleName: 'bcp',
    routeAliases: ['bcp'],
    entityTypes: ['bcp'], dashboardTarget: 'bcp',
    raciScopeType: 'bcp', entityTableName: 'bcp_plans', entityIdColumn: 'plan_id',
    eventActionMap: { create: 'ops.capacity_warning', update: 'ops.capacity_warning', delete: 'ops.capacity_warning' },
    grcEventMap: { created: 'bcp.plan_created', updated: 'bcp.plan_created', deleted: 'bcp.plan_deactivated', dr_test_scheduled: 'bcp.exercise_scheduled', recovery_documented: 'bcp.recovery_step_completed', bia_created: 'bcp.bia_completed', bia_criticality_calculated: 'bcp.bia_criticality_high', exercise_created: 'bcp.exercise_scheduled', exercise_completed: 'bcp.exercise_completed', exercise_result_recorded: 'bcp.exercise_completed', crisis_comm_created: 'bcp.crisis_comm_activated', crisis_comm_activated: 'bcp.crisis_comm_activated', recovery_strategy_created: 'bcp.recovery_step_completed', plan_activated: 'bcp.plan_activated', plan_deactivated: 'bcp.plan_deactivated', dependency_created: 'bcp.dependency_critical', maturity_assessed: 'bcp.maturity_assessed' },
  },
  {
    moduleCode: 'asset', grcModuleName: 'assets',
    routeAliases: ['assets', 'asset'],
    entityTypes: ['asset'], dashboardTarget: 'assets',
    raciScopeType: 'asset', entityTableName: 'assets', entityIdColumn: 'asset_id',
    eventActionMap: { create: 'delta.detected', update: 'delta.impact_assessed', delete: 'delta.detected' },
    grcEventMap: { created: 'asset.created', updated: 'asset.status_changed', deleted: 'asset.decommissioned', status_changed: 'asset.status_changed', classified: 'asset.classified' },
  },
  {
    moduleCode: 'remediation', grcModuleName: 'remediation',
    routeAliases: ['remediation'],
    entityTypes: ['remediation'], dashboardTarget: 'remediation',
    raciScopeType: 'remediation', entityTableName: 'remediation_plans', entityIdColumn: 'plan_id',
    eventActionMap: { create: 'remediation.created', update: 'remediation.status_changed', delete: 'remediation.status_changed' },
    grcEventMap: { created: 'remediation.created', updated: 'remediation.status_changed', deleted: 'remediation.status_changed', completed: 'remediation.completed', status_changed: 'remediation.status_changed' },
  },
  {
    moduleCode: 'action', grcModuleName: 'action_items',
    routeAliases: ['action'],
    entityTypes: ['action_item'], dashboardTarget: 'action',
    raciScopeType: 'action_item', entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'action.created', update: 'action.status_changed', delete: 'action.status_changed' },
    grcEventMap: { created: 'action.created', updated: 'action.status_changed', deleted: 'action.status_changed', completed: 'action.completed', status_changed: 'action.status_changed' },
  },
  {
    moduleCode: 'workflows', grcModuleName: 'workflows',
    routeAliases: ['workflows', 'workflow-ext', 'cooperative-workflows', 'autonomous-workflow', 'automation', 'journey', 'messaging', 'connector', 'approval-requests', 'process-tasks', 'processes'],
    entityTypes: ['workflow'], dashboardTarget: 'workflows',
    raciScopeType: 'workflow', entityTableName: 'workflows', entityIdColumn: 'workflow_id',
    eventActionMap: { create: 'workflow.approval_required', update: 'cycle.completed', delete: 'cycle.completed' },
    grcEventMap: { created: 'workflow.created', updated: 'workflow.updated', deleted: 'workflow.deleted', published: 'workflow.published', execution_started: 'workflow.execution_started', execution_completed: 'workflow.execution_completed', execution_failed: 'workflow.execution_failed', execution_cancelled: 'workflow.execution_cancelled', step_entered: 'workflow.step_entered', step_completed: 'workflow.step_completed', step_failed: 'workflow.step_failed', task_assigned: 'workflow.task_assigned', task_completed: 'workflow.task_completed', task_rejected: 'workflow.task_rejected', approval_requested: 'workflow.approval_requested', approval_approved: 'workflow.approval_approved', approval_rejected: 'workflow.approval_rejected', escalation_raised: 'workflow.escalation_raised', sla_warning: 'workflow.sla_warning', sla_breached: 'workflow.sla_breached', trigger_fired: 'workflow.trigger_fired' },
  },
  {
    moduleCode: 'frameworks', grcModuleName: 'frameworks',
    routeAliases: ['mapping'],
    entityTypes: ['framework'], dashboardTarget: 'frameworks',
    raciScopeType: 'framework', entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'framework.mapped', update: 'framework.updated', delete: 'framework.updated' },
    grcEventMap: { created: 'framework.mapped', updated: 'framework.updated', deleted: 'framework.updated' },
  },
  {
    moduleCode: 'training', grcModuleName: 'training',
    routeAliases: ['training', 'training-data'],
    entityTypes: ['training'], dashboardTarget: 'training',
    raciScopeType: 'training', entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'training.content_published', update: 'training.campaign_launched', delete: 'training.campaign_launched' },
    grcEventMap: { content_created: 'training.content_published', campaign_created: 'training.campaign_launched', campaign_launched: 'training.campaign_launched', assignment_created: 'training.assignment_completed', assignment_completed: 'training.assignment_completed', certification_issued: 'training.certification_issued', certification_expiring: 'training.certification_expiring', phishing_created: 'training.phishing_launched', phishing_launched: 'training.phishing_launched', phishing_result_recorded: 'training.phishing_completed' },
  },
  {
    moduleCode: 'teams', grcModuleName: 'teams',
    routeAliases: ['team-management', 'team', 'teams'],
    entityTypes: ['team'], dashboardTarget: 'team',
    raciScopeType: 'team', entityTableName: 'teams', entityIdColumn: 'team_id',
    eventActionMap: { create: 'team.created', update: 'team.role_changed', delete: 'team.member_removed' },
    grcEventMap: { created: 'team.created', updated: 'team.role_changed', deleted: 'team.member_removed' },
  },
  {
    moduleCode: 'profiles', grcModuleName: 'profiles',
    routeAliases: ['profiles', 'users'],
    entityTypes: [], dashboardTarget: 'profiles',
    raciScopeType: null, entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'admin.role_changed', update: 'admin.role_changed', delete: 'admin.role_changed' },
    grcEventMap: {},
  },
  {
    moduleCode: 'workspaces', grcModuleName: 'workspaces',
    routeAliases: ['workspaces', 'admin', 'agrc-os', 'activity-feed', 'feature-tables', 'tenant-config', 'tenant-email-config', 'security-config', 'platform-config', 'analytics', 'dashboard', 'workspace-lifecycle', 'mobile', 'tier', 'event-dlq', 'workspace', 'tenant-home', 'field-rbac', 'modules', 'products', 'bulk-import', 'business_unit', 'organization', 'location', 'department', 'ai-squad', 'knowledge', 'member-lifecycle'],
    entityTypes: [], dashboardTarget: 'workspaces',
    raciScopeType: null, entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'admin.config_changed', update: 'admin.config_changed', delete: 'admin.config_changed' },
    grcEventMap: {},
  },
  {
    moduleCode: 'findings', grcModuleName: 'findings',
    routeAliases: ['findings'],
    entityTypes: ['finding'], dashboardTarget: 'findings',
    raciScopeType: 'finding', entityTableName: 'assessment_items', entityIdColumn: 'item_id',
    eventActionMap: { create: 'audit.finding_created', update: 'audit.remediation_due', delete: 'audit.completed' },
    grcEventMap: { created: 'audit.finding_created', updated: 'audit.remediation_due', deleted: 'audit.completed', closed: 'audit.completed', issued: 'audit.finding.issued' },
  },
  {
    moduleCode: 'foundation', grcModuleName: 'workspaces',
    routeAliases: ['foundation', 'user-lifecycle', 'committee-management'],
    entityTypes: [], dashboardTarget: 'workspaces',
    raciScopeType: null, entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'admin.config_changed', update: 'admin.config_changed', delete: 'admin.config_changed' },
    grcEventMap: {},
  },
  {
    moduleCode: 'reporting', grcModuleName: 'workspaces',
    routeAliases: ['reporting', 'board-reports', 'report-hub', 'report-generator', 'report-ext', 'report-center', 'report-scenario'],
    entityTypes: [], dashboardTarget: 'workspaces',
    raciScopeType: null, entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'admin.config_changed', update: 'admin.config_changed', delete: 'admin.config_changed' },
    grcEventMap: {},
  },
  {
    moduleCode: 'model-risk', grcModuleName: 'model-risk',
    routeAliases: ['model-risk'],
    entityTypes: [], dashboardTarget: 'model-risk',
    raciScopeType: null, entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'advanced.model_risk_high', update: 'risk.score_changed', delete: 'risk.changed' },
    grcEventMap: {},
  },
  {
    moduleCode: 'vulnerabilities', grcModuleName: 'vulnerabilities',
    routeAliases: ['vulnerabilities'],
    entityTypes: [], dashboardTarget: 'vulnerabilities',
    raciScopeType: null, entityTableName: null, entityIdColumn: null,
    eventActionMap: { create: 'advanced.vulnerability_found', update: 'risk.score_changed', delete: 'risk.changed' },
    grcEventMap: {},
  },
];

// ── Descriptor Cache ─────────────────────────────────────────────────────

// Build reverse-lookup indices from BOOT_DESCRIPTORS (synchronous, no DB)
const _bootByRoute = new Map<string, ModuleDescriptor>();
const _bootByEntity = new Map<string, ModuleDescriptor>();
const _bootByCode = new Map<string, ModuleDescriptor>();
const _bootByGrcName = new Map<string, ModuleDescriptor>();
for (const d of BOOT_DESCRIPTORS) {
  _bootByCode.set(d.moduleCode, d);
  _bootByGrcName.set(d.grcModuleName, d);
  for (const alias of d.routeAliases) _bootByRoute.set(alias, d);
  for (const et of d.entityTypes) _bootByEntity.set(et, d);
}

// Per-tenant DB cache (5-min TTL)
interface DescriptorCacheEntry {
  byRoute: Map<string, ModuleDescriptor>;
  byEntity: Map<string, ModuleDescriptor>;
  byCode: Map<string, ModuleDescriptor>;
  byGrcName: Map<string, ModuleDescriptor>;
  expiresAt: number;
}

const _tenantCache = new Map<string, DescriptorCacheEntry>();
const DESCRIPTOR_TTL_MS = 5 * 60 * 1000;

function mapDescriptorRow(r: any): ModuleDescriptor {
  return {
    moduleCode: r.module_code,
    grcModuleName: r.grc_module_name || r.module_code,
    routeAliases: r.route_aliases || [],
    entityTypes: r.entity_types || [],
    dashboardTarget: r.dashboard_target || r.module_code,
    eventActionMap: r.event_action_map || {},
    grcEventMap: r.grc_event_map || {},
    raciScopeType: r.raci_scope_type || null,
    entityTableName: r.entity_table_name || null,
    entityIdColumn: r.entity_id_column || null,
  };
}

async function loadDescriptorCache(tenantId: string): Promise<DescriptorCacheEntry> {
  const existing = _tenantCache.get(tenantId);
  if (existing && existing.expiresAt > Date.now()) return existing;

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT module_code, grc_module_name, route_aliases, entity_types, dashboard_target,
              event_action_map, grc_event_map, raci_scope_type, entity_table_name, entity_id_column
       FROM "${schema}".module_workflow_registry WHERE is_active = TRUE`,
    );
    const descriptors = result.rows.map(mapDescriptorRow);

    const byRoute = new Map<string, ModuleDescriptor>();
    const byEntity = new Map<string, ModuleDescriptor>();
    const byCode = new Map<string, ModuleDescriptor>();
    const byGrcName = new Map<string, ModuleDescriptor>();
    for (const d of descriptors) {
      byCode.set(d.moduleCode, d);
      byGrcName.set(d.grcModuleName, d);
      for (const alias of d.routeAliases) byRoute.set(alias, d);
      for (const et of d.entityTypes) byEntity.set(et, d);
    }
    const entry: DescriptorCacheEntry = { byRoute, byEntity, byCode, byGrcName, expiresAt: Date.now() + DESCRIPTOR_TTL_MS };
    _tenantCache.set(tenantId, entry);
    return entry;
  } catch {
    // DB not available (e.g. migration not yet run) — return boot descriptors
    return { byRoute: _bootByRoute, byEntity: _bootByEntity, byCode: _bootByCode, byGrcName: _bootByGrcName, expiresAt: Date.now() + 30_000 };
  }
}

/**
 * Synchronous resolve by route alias. Uses boot descriptors if tenant cache not yet loaded.
 * Call `primeDescriptorCache(tenantId)` at request start for DB-backed resolution.
 */
export function resolveByRoute(routeAlias: string, tenantId?: string): ModuleDescriptor | null {
  if (tenantId) {
    const cached = _tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.byRoute.get(routeAlias) || null;
  }
  return _bootByRoute.get(routeAlias) || null;
}

/** Synchronous resolve by audit entity type. */
export function resolveByEntity(entityType: string, tenantId?: string): ModuleDescriptor | null {
  if (tenantId) {
    const cached = _tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.byEntity.get(entityType) || null;
  }
  return _bootByEntity.get(entityType) || null;
}

/** Synchronous resolve by GRC module name (plural form used in automation_rules). */
export function resolveByGrcName(grcName: string, tenantId?: string): ModuleDescriptor | null {
  if (tenantId) {
    const cached = _tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.byGrcName.get(grcName) || null;
  }
  return _bootByGrcName.get(grcName) || null;
}

/** Synchronous resolve by module code. */
export function resolveByCode(moduleCode: string, tenantId?: string): ModuleDescriptor | null {
  if (tenantId) {
    const cached = _tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.byCode.get(moduleCode) || null;
  }
  return _bootByCode.get(moduleCode) || null;
}

/** Resolve CUD action → event type from descriptor. Accepts moduleCode, grcModuleName, or route alias. */
export function resolveEventTypeFromDescriptor(moduleOrAlias: string, action: string, tenantId?: string): string {
  const d = resolveByCode(moduleOrAlias, tenantId)
    || resolveByGrcName(moduleOrAlias, tenantId)
    || resolveByRoute(moduleOrAlias, tenantId);
  return d?.eventActionMap[action] || 'delta.detected';
}

/** Resolve detailed GRC event → AGRC canonical event type. Accepts moduleCode, grcModuleName, or route alias. */
export function resolveGrcEventType(moduleOrAlias: string, event: string, tenantId?: string): string {
  // Try by code first, then by grcModuleName, then by route alias
  const d = resolveByCode(moduleOrAlias, tenantId)
    || resolveByGrcName(moduleOrAlias, tenantId)
    || resolveByRoute(moduleOrAlias, tenantId);
  return d?.grcEventMap[event] || 'automation.rule_triggered';
}

/**
 * Returns null if (module, event) is valid for automation_rules; otherwise a human-readable error.
 * Module may be moduleCode, grcModuleName (e.g. risks), or a route alias.
 * If grcEventMap is empty on the descriptor, any event is allowed.
 */
export function getModuleEventValidationError(module: string, event: string, tenantId?: string): string | null {
  if (!module || typeof module !== 'string') {
    return 'Automation rule module is required.';
  }
  if (!event || typeof event !== 'string') {
    return 'Automation rule event is required.';
  }
  const d = resolveByCode(module, tenantId)
    || resolveByGrcName(module, tenantId)
    || resolveByRoute(module, tenantId);
  if (!d) {
    return `Unknown automation module "${module}". Use a module code, GRC module name (e.g. risks), or a registered route alias.`;
  }
  const keys = Object.keys(d.grcEventMap || {});
  if (keys.length === 0) return null;
  if (!keys.includes(event)) {
    const sample = keys.slice(0, 40).join(', ');
    const more = keys.length > 40 ? ', …' : '';
    return `Event "${event}" is not valid for module "${module}" (${d.moduleCode}). Allowed: ${sample}${more}`;
  }
  return null;
}

/** Validate (module, event) for automation_rules: module must resolve to a descriptor; event must be in that descriptor's grcEventMap (or allowed if map is empty). */
export function validateModuleEvent(module: string, event: string, tenantId?: string): boolean {
  return getModuleEventValidationError(module, event, tenantId) === null;
}

/** Prime the descriptor cache for a tenant (call at request start). */
export async function primeDescriptorCache(tenantId: string): Promise<void> {
  await loadDescriptorCache(tenantId);
}

/** Invalidate cached descriptors for a tenant (e.g. after admin updates). */
export function invalidateDescriptorCache(tenantId: string): void {
  _tenantCache.delete(tenantId);
}

/**
 * Invalidate ALL tenant-scoped caches (descriptors + allowlist + platform config).
 * Call after admin operations that affect module visibility or configuration.
 */
export function invalidateAllTenantCaches(tenantId: string): void {
  _tenantCache.delete(tenantId);
  try {
    // Lazy import to avoid circular deps
    const { invalidateTenantAllowlist } = require('../middleware/tenant-module-allowlist');
    invalidateTenantAllowlist(tenantId);
  } catch { /* allowlist middleware not loaded */ }
  try {
    const { invalidatePlatformConfigCache } = require('./platform-db-config.service');
    invalidatePlatformConfigCache();
  } catch { /* platform config service not loaded */ }
}

/**
 * Get all module descriptors for a tenant (from cache or boot descriptors)
 */
export function getAllModuleDescriptors(tenantId?: string): ModuleDescriptor[] {
  if (tenantId) {
    const cached = _tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return Array.from(cached.byCode.values());
    }
  }
  // Fallback to boot descriptors
  return Array.from(_bootByCode.values());
}

/** Startup validation: log warnings for boot descriptor issues. */
export function validateRegistryCompleteness(): void {
  const routesSeen = new Set<string>();
  const entitySeen = new Set<string>();
  const grcNamesSeen = new Set<string>();

  for (const d of BOOT_DESCRIPTORS) {
    // Check required fields
    if (!d.grcModuleName) {
      logger.warn(`[ModuleRegistry] Missing grcModuleName for module "${d.moduleCode}"`);
    }
    if (!d.dashboardTarget) {
      logger.warn(`[ModuleRegistry] Missing dashboardTarget for module "${d.moduleCode}"`);
    }
    if (!d.eventActionMap || !d.eventActionMap.create) {
      logger.warn(`[ModuleRegistry] Missing eventActionMap.create for module "${d.moduleCode}"`);
    }

    // Check duplicate grcModuleNames (multiple modules sharing same GRC name is expected for foundation/reporting→workspaces)
    if (d.grcModuleName && grcNamesSeen.has(d.grcModuleName) && d.grcModuleName !== 'workspaces') {
      logger.warn(`[ModuleRegistry] Shared grcModuleName "${d.grcModuleName}" in module "${d.moduleCode}" (may cause automation rule ambiguity)`);
    }
    if (d.grcModuleName) grcNamesSeen.add(d.grcModuleName);

    // Check duplicate route aliases
    for (const alias of d.routeAliases) {
      if (routesSeen.has(alias)) {
        logger.warn(`[ModuleRegistry] Duplicate route alias "${alias}" in BOOT_DESCRIPTORS (module: ${d.moduleCode})`);
      }
      routesSeen.add(alias);
    }

    // Check duplicate entity types
    for (const et of d.entityTypes) {
      if (entitySeen.has(et)) {
        logger.warn(`[ModuleRegistry] Duplicate entity type "${et}" in BOOT_DESCRIPTORS (module: ${d.moduleCode})`);
      }
      entitySeen.add(et);
    }

    // Check entity table consistency: if entityTableName is set, entityIdColumn must also be set
    if ((d.entityTableName && !d.entityIdColumn) || (!d.entityTableName && d.entityIdColumn)) {
      logger.warn(`[ModuleRegistry] Inconsistent entity table config for "${d.moduleCode}": table=${d.entityTableName}, idCol=${d.entityIdColumn}`);
    }
  }

  logger.info(`[ModuleRegistry] Validated ${BOOT_DESCRIPTORS.length} descriptors, ${routesSeen.size} route aliases, ${entitySeen.size} entity types`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapRegistryRow(r: any): ModuleRegistryEntry {
  return {
    moduleCode: r.module_code,
    grcModuleName: r.grc_module_name || null,
    displayNameEn: r.display_name_en,
    displayNameAr: r.display_name_ar,
    moduleCategory: r.module_category,
    hasLifecycle: r.has_lifecycle,
    lifecycleStatuses: r.lifecycle_statuses || [],
    initialStatus: r.initial_status,
    terminalStatuses: r.terminal_statuses || [],
    primaryTemplateCode: r.primary_template_code,
    secondaryTemplates: r.secondary_templates || [],
    chainCodes: r.chain_codes || [],
    chainTriggerEvents: r.chain_trigger_events || [],
    kickstartStatus: r.kickstart_status,
    kickstartAt: r.kickstart_at,
    permissionPrefix: r.permission_prefix,
    primaryRoles: r.primary_roles || [],
    slaDefaultHours: r.sla_default_hours,
    automationLevel: r.automation_level,
    eventTypes: r.event_types || [],
    icon: r.icon,
    color: r.color,
    sortOrder: r.sort_order,
    isActive: r.is_active,
    licensed: r.licensed,
    owningTeam: r.owning_team || null,
    ownerEmail: r.owner_email || null,
    consumedEventTypes: r.consumed_event_types || [],
  };
}
