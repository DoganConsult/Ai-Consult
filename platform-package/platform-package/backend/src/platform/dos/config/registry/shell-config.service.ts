import { safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';

export interface ShellOverrideRow {
  id: string;
  module_code: string;
  source: 'product-default' | 'tenant-override' | 'role-override' | 'user-preference';
  priority: number;
  scope_key: string;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function getShellOverrides(
  tenantId: string,
  moduleCode: string,
  roleCode?: string,
  userId?: string,
): Promise<ShellOverrideRow[]> {
  const schema = tenantSchema(tenantId);

  const scopeKeys = ['platform', `product:agrc`, `tenant:${tenantId}`];
  if (roleCode) scopeKeys.push(`role:${roleCode}`);
  if (userId) scopeKeys.push(`user:${userId}`);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".shell_config_overrides
     WHERE module_code = $1 AND scope_key = ANY($2)
     ORDER BY priority ASC`,
    [moduleCode, scopeKeys],
  );

  return result.rows as ShellOverrideRow[];
}

export async function upsertShellOverride(
  tenantId: string,
  moduleCode: string,
  source: ShellOverrideRow['source'],
  scopeKey: string,
  priority: number,
  configJson: Record<string, unknown>,
): Promise<ShellOverrideRow> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".shell_config_overrides
       (module_code, source, scope_key, priority, config_json)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (module_code, scope_key) DO UPDATE
       SET config_json = $5, priority = $4, source = $2, updated_at = NOW()
     RETURNING *`,
    [moduleCode, source, scopeKey, priority, JSON.stringify(configJson)],
  );

  return getFirstRow(result) as ShellOverrideRow;
}

export async function deleteShellOverride(
  tenantId: string,
  moduleCode: string,
  scopeKey: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `DELETE FROM "${schema}".shell_config_overrides
     WHERE module_code = $1 AND scope_key = $2`,
    [moduleCode, scopeKey],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getUserShellPreferences(
  tenantId: string,
  userId: string,
): Promise<Record<string, Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT module_code, config_json FROM "${schema}".shell_config_overrides
     WHERE scope_key = $1 AND source = 'user-preference'`,
    [`user:${userId}`],
  );

  const prefs: Record<string, Record<string, unknown>> = {};
  for (const row of result.rows) {
    prefs[(row as ShellOverrideRow).module_code] = (row as ShellOverrideRow).config_json;
  }
  return prefs;
}

export async function getTenantShellConfig(
  tenantId: string,
): Promise<ShellOverrideRow[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".shell_config_overrides
     WHERE source IN ('product-default', 'tenant-override')
     ORDER BY module_code, priority ASC`,
    [],
  );

  return result.rows as ShellOverrideRow[];
}
