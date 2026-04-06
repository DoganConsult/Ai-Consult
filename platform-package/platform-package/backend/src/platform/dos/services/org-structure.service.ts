// @ts-nocheck
/**
 * DOS Org Structure — manages org dimensions, hierarchy extensions, and validation.
 * Tables: org_cost_center_assignments, org_custom_field_definitions, org_dimension_values,
 *         org_dimensions, org_location_assignments, org_unit_role_assignments,
 *         org_validation_executions, org_validation_patterns, org_validation_rules,
 *         business_services, business_services_catalog, legal_entities, job_titles,
 *         member_lifecycle_events
 */
import { safeQuery, tenantSchema } from '../../../config/database/database';
import type { GenericRow } from '../../../types/db-rows.types';
import { getFirstRow } from '../../../shared/data/db-utils';

// ── org_dimensions ──

export async function listOrgDimensions(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_dimensions WHERE is_active = TRUE ORDER BY dimension_name`, []);
  return result.rows;
}

// ── org_dimension_values ──

export async function getOrgDimensionValues(tenantId: string, dimensionId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_dimension_values WHERE dimension_id = $1 ORDER BY value_name`, [dimensionId]);
  return result.rows;
}

// ── org_custom_field_definitions ──

export async function listOrgCustomFields(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_custom_field_definitions WHERE is_active = TRUE ORDER BY field_name`, []);
  return result.rows;
}

// ── org_cost_center_assignments ──

export async function getOrgCostCenters(tenantId: string, orgUnitId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_cost_center_assignments WHERE org_unit_id = $1`, [orgUnitId]);
  return result.rows;
}

// ── org_location_assignments ──

export async function getOrgLocationAssignments(tenantId: string, orgUnitId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_location_assignments WHERE org_unit_id = $1`, [orgUnitId]);
  return result.rows;
}

// ── org_unit_role_assignments ──

export async function getOrgUnitRoleAssignments(tenantId: string, orgUnitId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_unit_role_assignments WHERE org_unit_id = $1`, [orgUnitId]);
  return result.rows;
}

// ── org_validation_rules + org_validation_patterns + org_validation_executions ──

export async function listOrgValidationRules(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_validation_rules WHERE is_active = TRUE ORDER BY rule_name`, []);
  return result.rows;
}

export async function getOrgValidationPatterns(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".org_validation_patterns WHERE is_active = TRUE`, []);
  return result.rows;
}

export async function logOrgValidationExecution(tenantId: string, ruleId: string, passed: boolean, details: Record<string, unknown> = {}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".org_validation_executions (rule_id, passed, details) VALUES ($1, $2, $3)`,
    [ruleId, passed, JSON.stringify(details)],
  );
}

// ── business_services + business_services_catalog ──

export async function listBusinessServices(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".business_services WHERE deleted_at IS NULL ORDER BY service_name`, []);
  return result.rows;
}

export async function getBusinessServicesCatalog(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".business_services_catalog WHERE is_active = TRUE ORDER BY category, service_name`, []);
  return result.rows;
}

// ── legal_entities ──

export async function listLegalEntities(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".legal_entities WHERE deleted_at IS NULL ORDER BY entity_name`, []);
  return result.rows;
}

export async function getLegalEntity(tenantId: string, entityId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".legal_entities WHERE entity_id = $1 AND deleted_at IS NULL`, [entityId]);
  return getFirstRow(result);
}

// ── job_titles ──

export async function listJobTitles(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".job_titles WHERE is_active = TRUE ORDER BY title_name`, []);
  return result.rows;
}

// ── member_lifecycle_events ──

export async function logMemberLifecycleEvent(tenantId: string, memberId: string, eventType: string, details: Record<string, unknown> = {}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".member_lifecycle_events (member_id, event_type, details) VALUES ($1, $2, $3)`,
    [memberId, eventType, JSON.stringify(details)],
  );
}

export async function getMemberLifecycleEvents(tenantId: string, memberId: string, limit = 50): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".member_lifecycle_events WHERE member_id = $1 ORDER BY created_at DESC LIMIT $2`, [memberId, limit]);
  return result.rows;
}
