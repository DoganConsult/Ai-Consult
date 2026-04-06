// @ts-nocheck
import { safeQuery } from '../../../config/database/database';
import { logger } from '../logger';
import { getFirstRow } from '../../../shared/data/db-utils';
import { resolveMinMwrRowsRequired } from '../../../config/modules/canonical-modules';

export interface ReadinessResult {
  ready: boolean;
  checks: Array<{ table: string; exists: boolean; rowCount?: number }>;
  errors: string[];
}

const REQUIRED_TABLES = [
  'module_workflow_registry',
  'product_modules',
  'navigation_registry',
  'tenant_settings',
  'module_activation_status',
  'workspace_profile',
  'role_profiles',
];

const OPTIONAL_TABLES = [
  'navigation_role_bindings',
  'navigation_overrides',
  'user_access_profiles',
  'enterprise_user_role_assignments',
  'functional_roles',
];

export async function checkProvisioningReadiness(schema: string): Promise<ReadinessResult> {
  const checks: ReadinessResult['checks'] = [];
  const errors: string[] = [];

  for (const table of REQUIRED_TABLES) {
    try {
      const result = await safeQuery(
        `SELECT COUNT(*) AS cnt FROM "${schema}".${table}`
      );
      const cnt = parseInt(getFirstRow(result)?.cnt ?? '0', 10);
      checks.push({ table, exists: true, rowCount: cnt });
    } catch (err) {
      checks.push({ table, exists: false });
      errors.push(`Required table ${schema}.${table} does not exist`);
      logger.warn(`[ProvisioningReadiness] Required table check failed for ${schema}.${table}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const table of OPTIONAL_TABLES) {
    try {
      const result = await safeQuery(
        `SELECT COUNT(*) AS cnt FROM "${schema}".${table}`
      );
      const cnt = parseInt(getFirstRow(result)?.cnt ?? '0', 10);
      checks.push({ table, exists: true, rowCount: cnt });
    } catch {
      checks.push({ table, exists: false });
    }
  }

  const pmCheck = checks.find(c => c.table === 'product_modules');
  const productModulesCount = pmCheck?.exists ? (pmCheck.rowCount ?? 0) : 0;
  if (pmCheck?.exists && productModulesCount === 0) {
    errors.push('product_modules is empty — module activation will fail');
  }

  const mwrCheck = checks.find(c => c.table === 'module_workflow_registry');
  const minMwrRequired = resolveMinMwrRowsRequired(productModulesCount);
  if (mwrCheck?.exists && (mwrCheck.rowCount ?? 0) < minMwrRequired) {
    errors.push(
      `module_workflow_registry has only ${mwrCheck.rowCount} rows (expected >= ${minMwrRequired} from product baseline)`
    );
  }

  const wpCheck = checks.find(c => c.table === 'workspace_profile');
  if (wpCheck?.exists && (wpCheck.rowCount ?? 0) === 0) {
    errors.push('workspace_profile is empty — tenant has no profile configuration');
  }

  const masCheck = checks.find(c => c.table === 'module_activation_status');
  if (masCheck?.exists && (masCheck.rowCount ?? 0) === 0) {
    errors.push('module_activation_status is empty — no modules activated for tenant');
  }

  const rpCheck = checks.find(c => c.table === 'role_profiles');
  if (rpCheck?.exists && (rpCheck.rowCount ?? 0) === 0) {
    errors.push('role_profiles is empty — no role-module mappings defined');
  }

  try {
    const entResult = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM public.tenant_module_entitlements WHERE tenant_id = (
        SELECT tenant_id FROM public.tenants WHERE schema_name = $1 LIMIT 1
      )`,
      [schema]
    );
    const entCnt = parseInt(getFirstRow(entResult)?.cnt ?? '0', 10);
    checks.push({ table: 'tenant_module_entitlements', exists: true, rowCount: entCnt });
    if (entCnt === 0) {
      errors.push('tenant_module_entitlements has no row for this tenant — moduleGuard will deny all modules');
    }
  } catch {
    checks.push({ table: 'tenant_module_entitlements', exists: false });
    errors.push('tenant_module_entitlements table is missing — moduleGuard cannot function');
  }

  const ready = errors.length === 0;
  if (!ready) {
    logger.warn(`[ProvisioningReadiness] Schema ${schema} not ready: ${errors.join('; ')}`);
  }

  return { ready, checks, errors };
}

export async function assertProvisioningReady(schema: string): Promise<void> {
  const result = await checkProvisioningReadiness(schema);
  if (!result.ready) {
    const err = new Error(
      `Provisioning readiness check failed for ${schema}: ${result.errors.join('; ')}`
    ) as Error & { code?: string };
    err.code = 'PROVISIONING_NOT_READY';
    throw err;
  }
}
