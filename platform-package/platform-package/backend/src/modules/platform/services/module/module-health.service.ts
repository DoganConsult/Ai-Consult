// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { CANONICAL_AGRC_MODULE_CODES } from '../../../../config/canonical-modules';

const LOG_TAG = '[ModuleHealth]';

export interface ModuleHealthResult {
  moduleCode: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'any';
  checks: HealthCheckDetail[];
  responseMs: number;
  checkedAt: string;
}

export interface HealthCheckDetail {
  check: string;
  passed: boolean;
  detail: string;
}

export async function checkModuleHealth(tenantId: string, moduleCode: string): Promise<ModuleHealthResult> {
  const start = Date.now();
  const schema = tenantSchema(tenantId);
  const checks: HealthCheckDetail[] = [];

  const dbOk = await checkDbTables(schema, moduleCode, checks);
  await checkPermissions(schema, moduleCode, checks);
  await checkLifecycle(schema, moduleCode, checks);
  await checkActivation(schema, moduleCode, checks);

  const failed = checks.filter(c => !c.passed).length;
  let status: ModuleHealthResult['status'] = 'healthy';
  if (!dbOk) status = 'unhealthy';
  else if (failed > 0) status = 'degraded';

  const result: ModuleHealthResult = {
    moduleCode,
    status,
    checks,
    responseMs: Date.now() - start,
    checkedAt: new Date().toISOString(),
  };

  try {
    await safeQuery(
      `INSERT INTO "${schema}".module_health_checks (module_code, check_type, status, response_ms, details)
       VALUES ($1, 'full', $2, $3, $4)`,
      [moduleCode, status, result.responseMs, JSON.stringify({ checks })],
    );
    await safeQuery(
      `UPDATE "${schema}".module_registry
       SET health_status = $1, health_checked_at = NOW(), updated_at = NOW()
       WHERE module_code = $2`,
      [status, moduleCode],
    );
  } catch (err) {
    logger.warn(`${LOG_TAG} Failed to persist health check for ${moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

export async function checkAllModulesHealth(tenantId: string): Promise<ModuleHealthResult[]> {
  const results: ModuleHealthResult[] = [];
  for (const mod of CANONICAL_AGRC_MODULE_CODES) {
    try {
      results.push(await checkModuleHealth(tenantId, mod));
    } catch (err) {
      results.push({
        moduleCode: mod,
        status: 'any',
        checks: [{ check: 'execution', passed: false, detail: `Health check threw: ${err instanceof Error ? err.message : String(err)}` }],
        responseMs: 0,
        checkedAt: new Date().toISOString(),
      });
    }
  }
  return results;
}

async function checkDbTables(schema: string, moduleCode: string, checks: HealthCheckDetail[]): Promise<boolean> {
  try {
    const { rows } = await safeQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_name LIKE $2
       LIMIT 50`,
      [schema, `%${moduleCode.replace(/-/g, '_')}%`],
    );
    checks.push({
      check: 'db_tables',
      passed: rows.length > 0,
      detail: rows.length > 0 ? `${rows.length} tables found` : 'No module-specific tables found',
    });
    return rows.length > 0;
  } catch (err) {
    checks.push({ check: 'db_tables', passed: false, detail: `DB check failed: ${err instanceof Error ? err.message : String(err)}` });
    return false;
  }
}

async function checkPermissions(schema: string, moduleCode: string, checks: HealthCheckDetail[]): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".module_permissions WHERE module_code = $1 AND is_active = true`,
      [moduleCode],
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    checks.push({
      check: 'permissions',
      passed: cnt > 0,
      detail: cnt > 0 ? `${cnt} active permissions` : 'No permissions defined',
    });
  } catch {
    checks.push({ check: 'permissions', passed: false, detail: 'module_permissions table not available' });
  }
}

async function checkLifecycle(schema: string, moduleCode: string, checks: HealthCheckDetail[]): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT has_lifecycle, lifecycle_statuses FROM "${schema}".module_workflow_registry WHERE module_code = $1 AND is_active = true`,
      [moduleCode],
    );
    if (rows.length > 0) {
      const r = rows[0];
      checks.push({
        check: 'lifecycle',
        passed: true,
        detail: `Lifecycle: ${r.has_lifecycle ? 'enabled' : 'disabled'}, statuses: ${JSON.stringify(r.lifecycle_statuses || [])}`,
      });
    } else {
      checks.push({ check: 'lifecycle', passed: false, detail: 'Not registered in module_workflow_registry' });
    }
  } catch {
    checks.push({ check: 'lifecycle', passed: false, detail: 'module_workflow_registry not available' });
  }
}

async function checkActivation(schema: string, moduleCode: string, checks: HealthCheckDetail[]): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT is_active FROM "${schema}".module_activation_rules WHERE module_code = $1`,
      [moduleCode],
    );
    if (rows.length > 0) {
      checks.push({
        check: 'activation',
        passed: !!rows[0].is_active,
        detail: rows[0].is_active ? 'Module is active' : 'Module is deactivated',
      });
    } else {
      checks.push({ check: 'activation', passed: false, detail: 'No activation rule found' });
    }
  } catch {
    checks.push({ check: 'activation', passed: false, detail: 'module_activation_rules not available' });
  }
}
