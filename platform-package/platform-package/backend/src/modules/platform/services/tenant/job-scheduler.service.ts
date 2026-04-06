/**
 * Job Scheduler Service — Tenant-aware background job utilities.
 *
 * Provides tenant resolution for batch operations and scheduled jobs.
 */

import { query } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/logger.service';

/**
 * Returns all provisioned tenants (status = 'active' or 'provisioned').
 * Used by batch jobs to iterate over all tenants.
 */
export async function getProvisionedTenants(): Promise<
  { tenantId: string; schemaName: string; tenantCode: string; status: string }[]
> {
  try {
    const { rows } = await query(
      `SELECT tenant_id, schema_name, tenant_code, status
       FROM public.tenants
       WHERE status IN ('active', 'provisioned', 'trial')
       ORDER BY tenant_id`,
    );
    return rows.map((r: any) => ({
      tenantId: r.tenant_id as string,
      schemaName: (r.schema_name as string) || `tenant_${r.tenant_id}`,
      tenantCode: (r.tenant_code as string) || '',
      status: r.status as string,
    }));
  } catch (err) {
    logger.error('[JobScheduler] Failed to fetch provisioned tenants', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Returns tenant IDs only (lightweight version for jobs that just need the list).
 */
export async function getProvisionedTenantIds(): Promise<string[]> {
  const tenants = await getProvisionedTenants();
  return tenants.map(t => t.tenantId);
}

/**
 * Run a function for each provisioned tenant in batches to avoid pool exhaustion.
 */
export async function forEachTenant(
  fn: (tenantId: string, schemaName: string) => Promise<void>,
  batchSize = 5,
): Promise<{ succeeded: number; failed: number }> {
  const tenants = await getProvisionedTenants();
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < tenants.length; i += batchSize) {
    const batch = tenants.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(t => fn(t.tenantId, t.schemaName)),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') succeeded++;
      else failed++;
    }
  }

  return { succeeded, failed };
}
