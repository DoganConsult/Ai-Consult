// @ts-nocheck
/**
 * DOS Module System — manages module registry extensions, activation, assignments, and config.
 * Tables: module_action_definitions, module_activation_events, module_approval_policies,
 *         module_assignments, module_audit_config, module_code_aliases, module_cross_link_rules,
 *         module_entitlement_map, module_entity_links, module_event_log, module_lifecycle_definitions,
 *         module_metrics_snapshots, module_nav_registration, module_permission_definitions,
 *         module_role_team_mappings, module_settings, module_sod_policies, module_stale_record_checks,
 *         module_table_mappings, module_task_type_mappings, module_trigger_mappings, module_workflow_profiles
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import type { GenericRow } from '../../../types/db-rows.types';
import { getFirstRow } from '../../../shared/data/db-utils';

// ── module_settings ──

export async function getModuleSettings(tenantId: string, moduleCode: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_settings WHERE module_code = $1`, [moduleCode]);
  return getFirstRow(result);
}

export async function upsertModuleSettings(tenantId: string, moduleCode: string, settings: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".module_settings (module_code, settings) VALUES ($1, $2)
     ON CONFLICT (module_code) DO UPDATE SET settings = $2, updated_at = NOW() RETURNING *`,
    [moduleCode, JSON.stringify(settings)],
  );
  return getFirstRow(result);
}

// ── module_action_definitions ──

export async function listModuleActions(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_action_definitions WHERE module_code = $1 AND is_active = TRUE ORDER BY action_code`, [moduleCode]);
  return result.rows;
}

// ── module_activation_events ──

export async function logModuleActivationEvent(tenantId: string, moduleCode: string, eventType: string, details: Record<string, unknown> = {}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".module_activation_events (module_code, event_type, details) VALUES ($1, $2, $3)`,
    [moduleCode, eventType, JSON.stringify(details)],
  );
}

// ── module_approval_policies ──

export async function getModuleApprovalPolicies(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_approval_policies WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]);
  return result.rows;
}

// ── module_assignments ──

export async function getModuleAssignments(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_assignments WHERE module_code = $1`, [moduleCode]);
  return result.rows;
}

// ── module_audit_config ──

export async function getModuleAuditConfig(tenantId: string, moduleCode: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_audit_config WHERE module_code = $1`, [moduleCode]);
  return getFirstRow(result);
}

// ── module_code_aliases ──

export async function resolveModuleAlias(tenantId: string, alias: string): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT canonical_code FROM "${schema}".module_code_aliases WHERE alias_code = $1`, [alias]);
  return getFirstRow(result)?.canonical_code ?? null;
}

// ── module_cross_link_rules ──

export async function getModuleCrossLinkRules(tenantId: string, sourceModule: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_cross_link_rules WHERE source_module = $1 AND is_active = TRUE`, [sourceModule]);
  return result.rows;
}

// ── module_entitlement_map ──

export async function getModuleEntitlementMap(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_entitlement_map WHERE module_code = $1`, [moduleCode]);
  return result.rows;
}

// ── module_entity_links ──

export async function getModuleEntityLinks(tenantId: string, moduleCode: string, entityType?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = entityType ? 'WHERE module_code = $1 AND entity_type = $2' : 'WHERE module_code = $1';
  const params = entityType ? [moduleCode, entityType] : [moduleCode];
  const result = await safeQuery(`SELECT * FROM "${schema}".module_entity_links ${where}`, params);
  return result.rows;
}

// ── module_event_log ──

export async function logModuleEvent(tenantId: string, moduleCode: string, eventType: string, payload: Record<string, unknown> = {}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".module_event_log (module_code, event_type, payload) VALUES ($1, $2, $3)`,
    [moduleCode, eventType, JSON.stringify(payload)],
  );
}

export async function getModuleEventLog(tenantId: string, moduleCode: string, limit = 50): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_event_log WHERE module_code = $1 ORDER BY created_at DESC LIMIT $2`, [moduleCode, limit]);
  return result.rows;
}

// ── module_lifecycle_definitions ──

export async function getModuleLifecycleDefinition(tenantId: string, moduleCode: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_lifecycle_definitions WHERE module_code = $1`, [moduleCode]);
  return getFirstRow(result);
}

// ── module_metrics_snapshots ──

export async function getModuleMetricsSnapshot(tenantId: string, moduleCode: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_metrics_snapshots WHERE module_code = $1 ORDER BY snapshot_date DESC LIMIT 1`, [moduleCode]);
  return getFirstRow(result);
}

export async function createModuleMetricsSnapshot(tenantId: string, moduleCode: string, metrics: Record<string, unknown>): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".module_metrics_snapshots (module_code, snapshot_date, metrics) VALUES ($1, CURRENT_DATE, $2)`,
    [moduleCode, JSON.stringify(metrics)],
  );
}

// ── module_nav_registration ──

export async function getModuleNavRegistration(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_nav_registration WHERE module_code = $1 ORDER BY sort_order`, [moduleCode]);
  return result.rows;
}

// ── module_permission_definitions ──

export async function getModulePermissionDefinitions(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_permission_definitions WHERE module_code = $1 ORDER BY permission_code`, [moduleCode]);
  return result.rows;
}

// ── module_role_team_mappings ──

export async function getModuleRoleTeamMappings(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_role_team_mappings WHERE module_code = $1`, [moduleCode]);
  return result.rows;
}

// ── module_sod_policies ──

export async function getModuleSodPolicies(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_sod_policies WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]);
  return result.rows;
}

// ── module_stale_record_checks ──

export async function getModuleStaleRecordChecks(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_stale_record_checks WHERE module_code = $1`, [moduleCode]);
  return result.rows;
}

// ── module_table_mappings ──

export async function getModuleTableMappings(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_table_mappings WHERE module_code = $1`, [moduleCode]);
  return result.rows;
}

// ── module_task_type_mappings ──

export async function getModuleTaskTypeMappings(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_task_type_mappings WHERE module_code = $1`, [moduleCode]);
  return result.rows;
}

// ── module_trigger_mappings ──

export async function getModuleTriggerMappings(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_trigger_mappings WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]);
  return result.rows;
}

// ── module_workflow_profiles ──

export async function getModuleWorkflowProfiles(tenantId: string, moduleCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".module_workflow_profiles WHERE module_code = $1`, [moduleCode]);
  return result.rows;
}
