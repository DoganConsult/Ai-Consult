// ============================================
// Shahin GRC — Platform Advanced Service
// Feature flag admin, system health dashboard,
// bulk data import/export, and custom field
// management
// Requirements: 14.1–14.4
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

// ── 14.1 Feature Flag Admin ─────────────────────────────────────────────────

/**
 * Return all feature flags for the tenant, ordered by key.
 */
export async function getAllFeatureFlags(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".feature_flags ORDER BY feature_key`
  ), { tenantId: tenantId, operation: 'query feature_flags' });
  return result.rows;
}

/**
 * Toggle a single feature flag on or off.  Uses UPSERT so the flag is
 * created if it does not already exist.  Invalidates the in-memory cache
 * so subsequent reads pick up the new value immediately.
 */
export async function toggleFeatureFlag(
  tenantId: string,
  featureKey: string,
  enabled: boolean,
  toggledBy: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".feature_flags (feature_key, enabled, updated_by, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (feature_key) DO UPDATE
       SET enabled = $2, updated_by = $3, updated_at = now()
     RETURNING *`,
    [featureKey, enabled, toggledBy]
  );

  // Invalidate the in-memory feature-flag cache for immediate effect
  try {
    const featureFlagHelper = await import(
      '../../../agrc-engine/helpers/feature-flag.helper'
    );
    const invalidateFeatureFlagCache = (featureFlagHelper as Record<string, any>).invalidateFeatureFlagCache as (schema: string, key: string) => void;
    invalidateFeatureFlagCache(schema, featureKey);
  } catch {
    // Cache helper may not be available in all environments
  }

  return result.rows[0];
}

/**
 * Toggle multiple feature flags in a single call.
 */
export async function bulkToggleFeatureFlags(
  tenantId: string,
  flags: { key: string; enabled: boolean }[],
  toggledBy: string
): Promise<(GenericRow | undefined)[]> {
  const results: (GenericRow | undefined)[] = [];
  for (const flag of flags) {
    const result = await toggleFeatureFlag(tenantId, flag.key, flag.enabled, toggledBy);
    results.push(result);
  }
  return results;
}

// ── 14.2 System Health Dashboard ────────────────────────────────────────────

/**
 * Aggregate system health metrics: DB stats, entity counts, recent errors,
 * and AGRC-OS engine run history.
 */
export async function getSystemHealth(tenantId: string): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);

  const [dbStats, entityCounts, recentErrors, engineStatus] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`
      SELECT
        (SELECT count(*)::int FROM pg_stat_activity WHERE state = 'active') AS active_connections,
        (SELECT pg_database_size(current_database())::bigint) AS db_size_bytes,
        now() AS server_time
    `), { tenantId: tenantId, operation: 'fallback query' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`
      SELECT
        (SELECT COUNT(*)::int FROM "${schema}".risks WHERE deleted_at IS NULL) AS risks,
        (SELECT COUNT(*)::int FROM "${schema}".controls WHERE deleted_at IS NULL) AS controls,
        (SELECT COUNT(*)::int FROM "${schema}".incidents) AS incidents,
        (SELECT COUNT(*)::int FROM "${schema}".action_items) AS action_items,
        (SELECT COUNT(*)::int FROM "${schema}".audits WHERE deleted_at IS NULL) AS audits
    `), { tenantId: tenantId, operation: 'query risks' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT message, created_at FROM "${schema}".agrc_event_log
       WHERE event_type = 'error' ORDER BY created_at DESC LIMIT 10`
    ), { tenantId: tenantId, operation: 'query controls' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".agrc_os_cycle_log ORDER BY started_at DESC LIMIT 5`
    ), { tenantId: tenantId, operation: 'query action_items' }),
  ]);

  return {
    status: 'healthy',
    database: dbStats.rows[0],
    entity_counts: entityCounts.rows[0],
    recent_errors: recentErrors.rows,
    engine_recent_runs: engineStatus.rows,
    checked_at: new Date().toISOString(),
  };
}

// ── 14.3 Bulk Data Import / Export ──────────────────────────────────────────

/**
 * Validate an array of rows against the required fields for a given entity
 * type.  Returns a summary of valid vs invalid rows plus error details.
 */
export async function validateBulkImport(
  _tenantId: string,
  entityType: string,
  rows: Record<string, any>[]
): Promise<Record<string, any>> {
  const requiredFields: Record<string, string[]> = {
    risks: ['title', 'risk_level'],
    controls: ['title', 'control_type'],
    vendors: ['name'],
    policies: ['title'],
    incidents: ['title', 'severity'],
  };

  const required = requiredFields[entityType] || ['title'];
  const errors: { row: number; missing_fields: string[] }[] = [];
  const valid: Record<string, any>[] = [];

  rows.forEach((row, idx) => {
    const missing = required.filter((f) => !row[f]);
    if (missing.length) {
      errors.push({ row: idx + 1, missing_fields: missing });
    } else {
      valid.push(row);
    }
  });

  return {
    entity_type: entityType,
    total: rows.length,
    valid: valid.length,
    errors: errors.length,
    error_details: errors,
    validated_rows: valid,
  };
}

/**
 * Execute a bulk import — insert each validated row into the target table.
 */
export async function executeBulkImport(
  tenantId: string,
  entityType: string,
  rows: Record<string, any>[]
): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);
  let imported = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const fields = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      await safeQuery(
        `INSERT INTO "${schema}".${entityType} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
      imported++;
    } catch {
      failed++;
    }
  }

  return { entity_type: entityType, imported, failed, total: rows.length };
}

/**
 * Export all rows for a given entity type (capped at 50 000 rows).
 */
export async function exportEntityData(tenantId: string, entityType: string): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);
  const allowedEntities = [
    'risks',
    'controls',
    'policies',
    'incidents',
    'vendors',
    'action_items',
    'audits',
  ];
  if (!allowedEntities.includes(entityType)) {
    throw new Error('Invalid entity type');
  }

  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".${entityType} ORDER BY created_at DESC LIMIT 50000`
  ), { tenantId: tenantId, operation: 'fallback query' });

  return {
    entity_type: entityType,
    count: result.rows.length,
    data: result.rows,
    exported_at: new Date().toISOString(),
  };
}

// ── 14.4 Custom Field Management ────────────────────────────────────────────

/**
 * Define a new custom field for a given entity type.
 */
export async function addCustomField(tenantId: string, data: { entity_type: string; field_name: string; field_type?: string; label: string; required?: boolean; options?: any[]; sort_order?: number }): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".custom_field_definitions
     (entity_type, field_name, field_type, label, required, options, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING *`,
    [
      data.entity_type,
      data.field_name,
      data.field_type || 'text',
      data.label,
      data.required || false,
      JSON.stringify(data.options || []),
      data.sort_order || 0,
    ]
  );
  return result.rows[0];
}

/**
 * List custom field definitions, optionally filtered by entity type.
 */
export async function getCustomFields(tenantId: string, entityType?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".custom_field_definitions`;
  const params: unknown[] = [];
  if (entityType) {
    sql += ` WHERE entity_type = $1`;
    params.push(entityType);
  }
  sql += ` ORDER BY sort_order`;
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(sql, params), { tenantId: tenantId, operation: 'query custom_field_definitions' });
  return result.rows;
}

/**
 * Delete a custom field definition by ID.
 */
export async function deleteCustomField(tenantId: string, fieldId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `DELETE FROM "${schema}".custom_field_definitions WHERE field_id = $1::uuid RETURNING field_id`,
    [fieldId]
  ), { tenantId: tenantId, operation: 'query custom_field_definitions' });
  return result.rows.length > 0;
}

/**
 * Set (upsert) a custom field value for a specific entity instance.
 */
export async function setCustomFieldValue(
  tenantId: string,
  entityType: string,
  entityId: string,
  fieldName: string,
  value: any
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".custom_field_values (entity_type, entity_id, field_name, field_value)
     VALUES ($1, $2::uuid, $3, $4::jsonb)
     ON CONFLICT (entity_type, entity_id, field_name)
       DO UPDATE SET field_value = $4::jsonb, updated_at = now()
     RETURNING *`,
    [entityType, entityId, fieldName, JSON.stringify(value)]
  );
  return result.rows[0];
}

/**
 * Get all custom field values for a specific entity instance.
 */
export async function getCustomFieldValues(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".custom_field_values
     WHERE entity_type = $1 AND entity_id = $2::uuid`,
    [entityType, entityId]
  ), { tenantId: tenantId, operation: 'query custom_field_values' });
  return result.rows;
}
