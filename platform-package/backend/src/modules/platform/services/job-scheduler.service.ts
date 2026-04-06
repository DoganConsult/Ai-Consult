/**
 * Job Scheduler Utilities — provides tenant iteration helpers for batch jobs.
 *
 * Queries the public.tenants table for all active, fully provisioned tenants.
 * Used by all scheduled jobs (SLA checks, integrity guards, compliance scans, etc.)
 * to iterate across the multi-tenant fleet.
 *
 * @owner DOS
 */

import { safeQuery } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/services/logger.service';

export interface ProvisionedTenant {
  tenantId: string;
  tenantCode: string;
  status: string;
  schemaName: string;
  planCode?: string;
}

/**
 * Get all active, fully provisioned tenants.
 * Queries public.tenants where status is active and provisioning is complete.
 */
export async function getProvisionedTenants(): Promise<ProvisionedTenant[]> {
  const result = await safeQuery(
    `SELECT id, tenant_code, status, schema_name, plan_code
     FROM public.tenants
     WHERE status = 'active'
       AND provisioning_status = 'complete'
     ORDER BY created_at ASC`,
  );

  return result.rows.map((r: any) => ({
    tenantId: r.id,
    tenantCode: r.tenant_code,
    status: r.status,
    schemaName: r.schema_name ?? `tenant_${r.id}`,
    planCode: r.plan_code ?? undefined,
  }));
}

/**
 * Execute a callback for every provisioned tenant with error isolation.
 * Failures in one tenant do not block processing of subsequent tenants.
 *
 * @returns Summary of successes and failures
 */
export async function forEachTenant<T>(
  jobName: string,
  fn: (tenant: ProvisionedTenant) => Promise<T>,
): Promise<{ total: number; succeeded: number; failed: number; results: Array<{ tenantId: string; result?: T; error?: string }> }> {
  const tenants = await getProvisionedTenants();
  const results: Array<{ tenantId: string; result?: T; error?: string }> = [];
  let succeeded = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
      const result = await fn(tenant);
      results.push({ tenantId: tenant.tenantId, result });
      succeeded++;
    } catch (err) {
      const message = (err as Error).message ?? 'unknown error';
      results.push({ tenantId: tenant.tenantId, error: message });
      failed++;
      logger.error(
        `[JOB_SCHEDULER] ${jobName} failed for tenant=${tenant.tenantId}: ${message}`,
      );
    }
  }

  if (tenants.length > 0) {
    logger.info(
      `[JOB_SCHEDULER] ${jobName}: total=${tenants.length} succeeded=${succeeded} failed=${failed}`,
    );
  }

  return { total: tenants.length, succeeded, failed, results };
}

/**
 * Get a single tenant record by ID.
 */
export async function getTenantById(
  tenantId: string,
): Promise<ProvisionedTenant | null> {
  const result = await safeQuery(
    `SELECT id, tenant_code, status, schema_name, plan_code
     FROM public.tenants
     WHERE id = $1
     LIMIT 1`,
    [tenantId],
  );

  if (!result.rows.length) return null;

  const r = result.rows[0];
  return {
    tenantId: r.id,
    tenantCode: r.tenant_code,
    status: r.status,
    schemaName: r.schema_name ?? `tenant_${r.id}`,
    planCode: r.plan_code ?? undefined,
  };
}
