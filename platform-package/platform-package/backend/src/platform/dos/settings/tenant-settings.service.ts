// Tenant-Specific Settings Service
// Manages per-tenant settings isolated from tenant identity/config.
// Settings inherit from platform defaults when not explicitly overridden.

import { query, safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../observability/logger.service';

export interface TenantSettingEntry {
  tenantId: string;
  key: string;
  value: unknown;
  setBy: string;
  updatedAt: string;
}

export interface TenantSettingHistoryEntry {
  tenantId: string;
  key: string;
  previousValue: unknown;
  newValue: unknown;
  changedBy: string;
  changedAt: string;
  changeType: 'set' | 'delete' | 'reset' | 'import';
}

export interface TenantSettingsExport {
  tenantId: string;
  exportedAt: string;
  settingCount: number;
  settings: Record<string, unknown>;
}

function tryParseJson(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * Get a single tenant setting by key.
 * Returns null if not found.
 */
export async function getTenantSetting(
  tenantId: string,
  key: string,
): Promise<TenantSettingEntry | null> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT tenant_id, setting_key, setting_value, set_by, updated_at
       FROM "${schema}".tenant_custom_settings
       WHERE setting_key = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [key],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      tenantId: row.tenant_id ?? tenantId,
      key: row.setting_key,
      value: tryParseJson(row.setting_value),
      setBy: row.set_by,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    logger.error(`[TenantSettings] Failed to get setting key="${key}" tenant="${tenantId}": ${(err as Error).message}`);
    return null;
  }
}

/**
 * Set a tenant setting with audit trail.
 * Creates or updates the entry.
 */
export async function setTenantSetting(
  tenantId: string,
  key: string,
  value: unknown,
  setBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const serialized = serializeValue(value);

  try {
    // Capture previous value for audit
    const prev = await safeQuery(
      `SELECT setting_value FROM "${schema}".tenant_custom_settings
       WHERE setting_key = $1 AND deleted_at IS NULL LIMIT 1`,
      [key],
    );
    const previousValue = prev.rows.length > 0 ? prev.rows[0].setting_value : null;

    await query(
      `INSERT INTO "${schema}".tenant_custom_settings
         (tenant_id, setting_key, setting_value, set_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET
         setting_value = $3,
         set_by = $4,
         updated_at = NOW(),
         deleted_at = NULL`,
      [tenantId, key, serialized, setBy],
    );

    // Record audit history
    await safeQuery(
      `INSERT INTO "${schema}".tenant_settings_history
         (tenant_id, setting_key, previous_value, new_value, changed_by, changed_at, change_type)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'set')`,
      [tenantId, key, previousValue, serialized, setBy],
    );

    logger.info(`[TenantSettings] Setting set key="${key}" tenant="${tenantId}" by="${setBy}"`);
  } catch (err) {
    logger.error(`[TenantSettings] Failed to set setting key="${key}" tenant="${tenantId}": ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get all settings for a tenant, optionally filtered by key prefix.
 */
export async function getTenantSettings(
  tenantId: string,
  prefix?: string,
): Promise<TenantSettingEntry[]> {
  try {
    const schema = tenantSchema(tenantId);
    let sql = `SELECT tenant_id, setting_key, setting_value, set_by, updated_at
               FROM "${schema}".tenant_custom_settings
               WHERE deleted_at IS NULL`;
    const params: unknown[] = [];

    if (prefix) {
      sql += ` AND setting_key LIKE $1`;
      params.push(`${prefix}%`);
    }

    sql += ` ORDER BY setting_key`;

    const result = await safeQuery(sql, params);

    return result.rows.map((row: any) => ({
      tenantId: row.tenant_id ?? tenantId,
      key: row.setting_key,
      value: tryParseJson(row.setting_value),
      setBy: row.set_by,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    logger.error(`[TenantSettings] Failed to list settings tenant="${tenantId}": ${(err as Error).message}`);
    return [];
  }
}

/**
 * Soft-delete a tenant setting with audit trail.
 */
export async function deleteTenantSetting(
  tenantId: string,
  key: string,
  deletedBy: string,
): Promise<boolean> {
  try {
    const schema = tenantSchema(tenantId);

    const prev = await safeQuery(
      `SELECT setting_value FROM "${schema}".tenant_custom_settings
       WHERE setting_key = $1 AND deleted_at IS NULL LIMIT 1`,
      [key],
    );

    if (prev.rows.length === 0) return false;

    await query(
      `UPDATE "${schema}".tenant_custom_settings
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE setting_key = $1`,
      [key],
    );

    await safeQuery(
      `INSERT INTO "${schema}".tenant_settings_history
         (tenant_id, setting_key, previous_value, new_value, changed_by, changed_at, change_type)
       VALUES ($1, $2, $3, NULL, $4, NOW(), 'delete')`,
      [tenantId, key, prev.rows[0].setting_value, deletedBy],
    );

    logger.info(`[TenantSettings] Setting deleted key="${key}" tenant="${tenantId}" by="${deletedBy}"`);
    return true;
  } catch (err) {
    logger.error(`[TenantSettings] Failed to delete setting key="${key}" tenant="${tenantId}": ${(err as Error).message}`);
    return false;
  }
}

/**
 * Get a tenant setting with fallback to the platform-wide default.
 * Checks tenant-specific settings first, then falls back to runtime_config table.
 */
export async function getTenantSettingWithDefault(
  tenantId: string,
  key: string,
  defaultValue: unknown,
): Promise<unknown> {
  // Check tenant-specific setting first
  const tenantEntry = await getTenantSetting(tenantId, key);
  if (tenantEntry !== null) return tenantEntry.value;

  // Fall back to platform-level runtime config
  try {
    const platformResult = await safeQuery(
      `SELECT config_value FROM runtime_config
       WHERE config_key = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [key],
    );

    if (platformResult.rows.length > 0) {
      return tryParseJson(platformResult.rows[0].config_value);
    }
  } catch {
    // Platform config table may not exist; fall through to default
  }

  return defaultValue;
}

/**
 * Reset a tenant setting to the platform default by removing the tenant override.
 */
export async function resetTenantSettingToDefault(
  tenantId: string,
  key: string,
  resetBy: string,
): Promise<boolean> {
  try {
    const schema = tenantSchema(tenantId);

    const prev = await safeQuery(
      `SELECT setting_value FROM "${schema}".tenant_custom_settings
       WHERE setting_key = $1 AND deleted_at IS NULL LIMIT 1`,
      [key],
    );

    if (prev.rows.length === 0) return false;

    await query(
      `UPDATE "${schema}".tenant_custom_settings
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE setting_key = $1`,
      [key],
    );

    await safeQuery(
      `INSERT INTO "${schema}".tenant_settings_history
         (tenant_id, setting_key, previous_value, new_value, changed_by, changed_at, change_type)
       VALUES ($1, $2, $3, NULL, $4, NOW(), 'reset')`,
      [tenantId, key, prev.rows[0].setting_value, resetBy],
    );

    logger.info(`[TenantSettings] Setting reset to default key="${key}" tenant="${tenantId}" by="${resetBy}"`);
    return true;
  } catch (err) {
    logger.error(`[TenantSettings] Failed to reset setting key="${key}" tenant="${tenantId}": ${(err as Error).message}`);
    return false;
  }
}

/**
 * Get audit history for tenant settings, optionally filtered by key.
 */
export async function getTenantSettingsHistory(
  tenantId: string,
  key?: string,
): Promise<TenantSettingHistoryEntry[]> {
  try {
    const schema = tenantSchema(tenantId);

    let sql = `SELECT tenant_id, setting_key, previous_value, new_value, changed_by, changed_at, change_type
               FROM "${schema}".tenant_settings_history
               WHERE tenant_id = $1`;
    const params: unknown[] = [tenantId];

    if (key) {
      sql += ` AND setting_key = $2`;
      params.push(key);
    }

    sql += ` ORDER BY changed_at DESC`;

    const result = await safeQuery(sql, params);

    return result.rows.map((row: any) => ({
      tenantId: row.tenant_id,
      key: row.setting_key,
      previousValue: tryParseJson(row.previous_value),
      newValue: tryParseJson(row.new_value),
      changedBy: row.changed_by,
      changedAt: row.changed_at,
      changeType: row.change_type,
    }));
  } catch (err) {
    logger.error(`[TenantSettings] Failed to get history tenant="${tenantId}": ${(err as Error).message}`);
    return [];
  }
}

/**
 * Export all active tenant settings as a serializable object.
 */
export async function exportTenantSettings(
  tenantId: string,
): Promise<TenantSettingsExport> {
  const entries = await getTenantSettings(tenantId);
  const settings: Record<string, unknown> = {};

  for (const entry of entries) {
    settings[entry.key] = entry.value;
  }

  return {
    tenantId,
    exportedAt: new Date().toISOString(),
    settingCount: entries.length,
    settings,
  };
}

/**
 * Bulk import settings for a tenant, overwriting existing values.
 * Records each change in the audit history with change_type 'import'.
 */
export async function importTenantSettings(
  tenantId: string,
  settings: Record<string, unknown>,
  importedBy: string,
): Promise<{ imported: number; failed: string[] }> {
  const schema = tenantSchema(tenantId);
  const keys = Object.keys(settings);
  let imported = 0;
  const failed: string[] = [];

  for (const key of keys) {
    const value = settings[key];
    const serialized = serializeValue(value);

    try {
      // Capture previous value
      const prev = await safeQuery(
        `SELECT setting_value FROM "${schema}".tenant_custom_settings
         WHERE setting_key = $1 AND deleted_at IS NULL LIMIT 1`,
        [key],
      );
      const previousValue = prev.rows.length > 0 ? prev.rows[0].setting_value : null;

      await query(
        `INSERT INTO "${schema}".tenant_custom_settings
           (tenant_id, setting_key, setting_value, set_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (setting_key) DO UPDATE SET
           setting_value = $3,
           set_by = $4,
           updated_at = NOW(),
           deleted_at = NULL`,
        [tenantId, key, serialized, importedBy],
      );

      await safeQuery(
        `INSERT INTO "${schema}".tenant_settings_history
           (tenant_id, setting_key, previous_value, new_value, changed_by, changed_at, change_type)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'import')`,
        [tenantId, key, previousValue, serialized, importedBy],
      );

      imported++;
    } catch (err) {
      logger.warn(`[TenantSettings] Import failed for key="${key}" tenant="${tenantId}": ${(err as Error).message}`);
      failed.push(key);
    }
  }

  logger.info(`[TenantSettings] Import complete tenant="${tenantId}" imported=${imported} failed=${failed.length} by="${importedBy}"`);
  return { imported, failed };
}
