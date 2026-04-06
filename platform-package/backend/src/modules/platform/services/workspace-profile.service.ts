import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/services/logger.service';

/**
 * Write a workspace setting to the tenant-schema workspace_settings table.
 * No fallback to public.tenants — Law 6 (real scope).
 */
export async function updateWorkspaceSetting(
  tenantId: string,
  settingKey: string,
  settingValue: string,
  updatedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".workspace_settings (tenant_id, setting_key, setting_value, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id, setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
      [tenantId, settingKey, settingValue, updatedBy],
    );
  } catch (err) {
    logger.warn(
      `[workspace-profile] workspace_settings table not available in schema "${schema}" for tenant ${tenantId}. ` +
      `Setting "${settingKey}" was NOT persisted. Ensure tenant schema is fully provisioned.`,
    );
    throw err;
  }
}

/**
 * Read a workspace setting from the tenant-schema workspace_settings table.
 * No fallback to public.tenants.settings — Law 6 (real scope).
 */
export async function getWorkspaceSetting(
  tenantId: string,
  settingKey: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT setting_value FROM "${schema}".workspace_settings
       WHERE tenant_id = $1 AND setting_key = $2 LIMIT 1`,
      [tenantId, settingKey],
    );

    if (result.rows.length > 0) return result.rows[0].setting_value;
    return null;
  } catch (err) {
    logger.warn(
      `[workspace-profile] workspace_settings table not available in schema "${schema}" for tenant ${tenantId}. ` +
      `Cannot read setting "${settingKey}". Ensure tenant schema is fully provisioned.`,
    );
    return null;
  }
}
