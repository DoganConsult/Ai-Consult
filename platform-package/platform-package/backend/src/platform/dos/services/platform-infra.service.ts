// @ts-nocheck
/**
 * DOS Platform Infrastructure — manages events, tenant config, entity system, and observability.
 * Tables: event_processing_state, event_subscriptions, event_trigger_binding, event_trigger_bindings,
 *         entity_dimension_assignments, cross_module_links, lifecycle_template_injections,
 *         tenant_archetypes, tenant_blueprints, tenant_page_overrides, tenant_quota_config,
 *         tenant_role_definitions, platform_feature_flags, platform_role_tenant_role_map,
 *         workspace_feature_overrides, workspace_profiles, workspace_provisioning_runs,
 *         workspace_provisioning_steps, workspace_state_history, workspace_states,
 *         applications, api_ai_config, endpoint_config, route_catalog, route_permission_mappings,
 *         search_index_config, config_entry_sources
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import type { GenericRow } from '../../../types/db-rows.types';
import { getFirstRow } from '../../../shared/data/db-utils';

// ── event_processing_state ──

export async function getEventProcessingState(tenantId: string, consumerId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".event_processing_state WHERE consumer_id = $1`, [consumerId]);
  return getFirstRow(result);
}

export async function updateEventProcessingState(tenantId: string, consumerId: string, lastProcessedId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".event_processing_state (consumer_id, last_processed_id, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (consumer_id) DO UPDATE SET last_processed_id = $2, updated_at = NOW()`,
    [consumerId, lastProcessedId],
  );
}

// ── event_subscriptions ──

export async function listEventSubscriptions(tenantId: string, eventType?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = eventType ? 'WHERE event_type = $1 AND is_active = TRUE' : 'WHERE is_active = TRUE';
  const params = eventType ? [eventType] : [];
  const result = await safeQuery(`SELECT * FROM "${schema}".event_subscriptions ${where}`, params);
  return result.rows;
}

// ── event_trigger_bindings ──

export async function listEventTriggerBindings(tenantId: string, eventType?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = eventType ? 'WHERE event_type = $1 AND is_active = TRUE' : 'WHERE is_active = TRUE';
  const params = eventType ? [eventType] : [];
  const result = await safeQuery(`SELECT * FROM "${schema}".event_trigger_bindings ${where}`, params);
  return result.rows;
}

export async function getEventTriggerBinding(tenantId: string, bindingId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".event_trigger_binding WHERE binding_id = $1`, [bindingId]);
  return getFirstRow(result);
}

// ── entity_dimension_assignments ──

export async function getEntityDimensionAssignments(tenantId: string, entityType: string, entityId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".entity_dimension_assignments WHERE entity_type = $1 AND entity_id = $2`, [entityType, entityId]);
  return result.rows;
}

// ── cross_module_links ──

export async function getCrossModuleLinks(tenantId: string, sourceModule: string, sourceEntityId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".cross_module_links WHERE source_module = $1 AND source_entity_id = $2`, [sourceModule, sourceEntityId]);
  return result.rows;
}

export async function createCrossModuleLink(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".cross_module_links (source_module, source_entity_type, source_entity_id, target_module, target_entity_type, target_entity_id, link_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.source_module, data.source_entity_type, data.source_entity_id, data.target_module, data.target_entity_type, data.target_entity_id, data.link_type],
  );
  return getFirstRow(result);
}

// ── lifecycle_template_injections ──

export async function getLifecycleTemplateInjections(tenantId: string, entityType: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".lifecycle_template_injections WHERE entity_type = $1 AND is_active = TRUE`, [entityType]);
  return result.rows;
}

// ── tenant_archetypes ──

export async function listTenantArchetypes(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".tenant_archetypes WHERE is_active = TRUE ORDER BY archetype_name`, []);
  return result.rows;
}

// ── tenant_blueprints ──

export async function listTenantBlueprints(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".tenant_blueprints WHERE is_active = TRUE ORDER BY blueprint_name`, []);
  return result.rows;
}

// ── tenant_page_overrides ──

export async function getTenantPageOverrides(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".tenant_page_overrides WHERE is_active = TRUE ORDER BY page_code`, []);
  return result.rows;
}

// ── tenant_quota_config ──

export async function getTenantQuotaConfig(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".tenant_quota_config ORDER BY quota_key`, []);
  return result.rows;
}

// ── tenant_role_definitions ──

export async function listTenantRoleDefinitions(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".tenant_role_definitions WHERE is_active = TRUE ORDER BY role_name`, []);
  return result.rows;
}

// ── platform_feature_flags ──

export async function listPlatformFeatureFlags(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".platform_feature_flags ORDER BY flag_key`, []);
  return result.rows;
}

export async function getPlatformFeatureFlag(tenantId: string, flagKey: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT flag_value FROM "${schema}".platform_feature_flags WHERE flag_key = $1 AND is_active = TRUE`, [flagKey]);
  return getFirstRow(result)?.flag_value ?? false;
}

// ── platform_role_tenant_role_map ──

export async function getPlatformRoleTenantRoleMap(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".platform_role_tenant_role_map`, []);
  return result.rows;
}

// ── workspace_states + workspace_state_history ──

export async function getWorkspaceState(tenantId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workspace_states ORDER BY created_at DESC LIMIT 1`, []);
  return getFirstRow(result);
}

export async function getWorkspaceStateHistory(tenantId: string, limit = 20): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workspace_state_history ORDER BY created_at DESC LIMIT $1`, [limit]);
  return result.rows;
}

// ── workspace_profiles + workspace_feature_overrides ──

export async function getWorkspaceProfile(tenantId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workspace_profiles ORDER BY created_at DESC LIMIT 1`, []);
  return getFirstRow(result);
}

export async function getWorkspaceFeatureOverrides(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workspace_feature_overrides WHERE is_active = TRUE`, []);
  return result.rows;
}

// ── workspace_provisioning_runs + workspace_provisioning_steps ──

export async function getWorkspaceProvisioningRuns(tenantId: string, limit = 10): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workspace_provisioning_runs ORDER BY created_at DESC LIMIT $1`, [limit]);
  return result.rows;
}

export async function getWorkspaceProvisioningSteps(tenantId: string, runId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workspace_provisioning_steps WHERE run_id = $1 ORDER BY step_sequence`, [runId]);
  return result.rows;
}

// ── applications ──

export async function listApplications(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".applications WHERE is_active = TRUE ORDER BY app_name`, []);
  return result.rows;
}

// ── api_ai_config ──

export async function getApiAiConfig(tenantId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".api_ai_config WHERE is_active = TRUE LIMIT 1`, []);
  return getFirstRow(result);
}

// ── endpoint_config ──

export async function listEndpointConfigs(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".endpoint_config WHERE is_active = TRUE`, []);
  return result.rows;
}

// ── route_catalog + route_permission_mappings ──

export async function getRouteCatalog(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".route_catalog ORDER BY route_path`, []);
  return result.rows;
}

export async function getRoutePermissionMappings(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".route_permission_mappings ORDER BY route_path`, []);
  return result.rows;
}

// ── search_index_config ──

export async function getSearchIndexConfig(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".search_index_config WHERE is_active = TRUE`, []);
  return result.rows;
}

// ── config_entry_sources ──

export async function getConfigEntrySources(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".config_entry_sources ORDER BY source_name`, []);
  return result.rows;
}
