/**
 * Module Health Service — Checks and reports on module operational health.
 */

import { safeQuery, tenantSchema } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';

export interface ModuleHealthResult {
  moduleCode: string;
  healthy: boolean;
  tableCount: number;
  eventCount: number;
  lastActivity: string | null;
  issues: string[];
}

/**
 * Check the health of a specific module within a tenant.
 */
export async function checkModuleHealth(
  tenantId: string,
  moduleCode: string,
  ownedTables: string[] = [],
): Promise<ModuleHealthResult> {
  const schema = tenantSchema(tenantId);
  const issues: string[] = [];

  let tableCount = 0;
  for (const table of ownedTables) {
    const { rows } = await safeQuery(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
      [schema, table],
    ).catch(() => ({ rows: [] }));
    if (rows.length > 0) tableCount++;
    else issues.push(`Missing table: ${table}`);
  }

  const { rows: eventRows } = await safeQuery(
    `SELECT COUNT(*)::int AS cnt, MAX(created_at) AS last_at
     FROM "${schema}".audit_trail
     WHERE module = $1 AND created_at > NOW() - INTERVAL '7 days'`,
    [moduleCode],
  ).catch(() => ({ rows: [{ cnt: 0, last_at: null }] }));

  return {
    moduleCode,
    healthy: issues.length === 0,
    tableCount,
    eventCount: eventRows[0]?.cnt ?? 0,
    lastActivity: eventRows[0]?.last_at ?? null,
    issues,
  };
}

/**
 * Check health of all modules for a tenant.
 */
export async function checkAllModulesHealth(tenantId: string): Promise<ModuleHealthResult[]> {
  try {
    const { rows } = await safeQuery(
      `SELECT module_code, tables FROM public.module_registry WHERE is_active = TRUE`,
    ).catch(() => ({ rows: [] }));

    const results: ModuleHealthResult[] = [];
    for (const row of rows) {
      const tables = Array.isArray(row.tables) ? row.tables : [];
      results.push(await checkModuleHealth(tenantId, row.module_code as string, tables as string[]));
    }
    return results;
  } catch (err) {
    logger.error('[ModuleHealth] checkAllModulesHealth failed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
