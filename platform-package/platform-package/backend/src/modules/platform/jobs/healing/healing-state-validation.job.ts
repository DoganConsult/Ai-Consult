import { logger } from '../../../../platform/dos/observability/logger.service';
// ============================================================
// Dogan Operating System — Healing: State Validation Job
// Detects and optionally fixes entities with invalid status values
// ============================================================

import { Pool } from 'pg';
import { tenantSchema } from '../../../../config/db/tenant-client';

/** Known valid status sets per entity type. */
const VALID_STATUSES: Record<string, string[]> = {
  risks: ['open', 'mitigated', 'accepted', 'closed', 'draft', 'in_review'],
  controls: ['active', 'inactive', 'draft', 'deprecated', 'in_review'],
  process_tasks: ['open', 'in_progress', 'completed', 'cancelled', 'breached', 'escalated'],
  evidence_tasks: ['pending', 'in_progress', 'submitted', 'approved', 'rejected', 'overdue'],
};

/**
 * Scans a tenant schema for entities with invalid status values.
 * Logs findings and resets invalid statuses to a safe default.
 *
 * @param pool - Database connection pool
 * @param tenantId - Tenant identifier
 */
export async function healingStateValidationJob(
  pool: Pool,
  tenantId: string,
): Promise<{ fixed: number; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const prefix = `[DoganOS:HealingState]`;
  let totalFixed = 0;
  const errors: string[] = [];

  for (const [table, validStatuses] of Object.entries(VALID_STATUSES)) {
    try {
      // Find rows with invalid status
      const statusCol = table === 'risks' ? 'risk_status' : 'status';
      const idCol = table === 'risks' ? 'risk_id' : table === 'controls' ? 'control_id' : 'id';
      const defaultStatus = validStatuses[0]; // first entry is the safe default

      const result = await pool.query(
        `SELECT "${idCol}" AS entity_id, "${statusCol}" AS current_status
         FROM "${schema}"."${table}"
         WHERE "${statusCol}" IS NOT NULL
           AND "${statusCol}" NOT IN (${validStatuses.map((_, i) => `$${i + 1}`).join(', ')})
         LIMIT 100`,
        validStatuses,
      );

      if (result.rows.length > 0) {
        logger.warn(
          `${prefix} Tenant ${tenantId}: ${result.rows.length} invalid status(es) in ${table}`,
        );

        // Reset invalid statuses to the safe default
        const ids = result.rows.map((r) => r.entity_id);
        await pool.query(
          `UPDATE "${schema}"."${table}"
           SET "${statusCol}" = $1
           WHERE "${idCol}" = ANY($2::text[])`,
          [defaultStatus, ids],
        );

        totalFixed += result.rows.length;
        logger.info(`${prefix} Fixed ${result.rows.length} rows in ${schema}.${table} -> '${defaultStatus}'`);
      }
    } catch (err: unknown) {
      // Table may not exist in this tenant — skip gracefully
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('does not exist')) {
        errors.push(`${table}: ${msg}`);
        logger.error(`${prefix} Error checking ${table}: ${msg}`);
      }
    }
  }

  if (totalFixed > 0) {
    logger.info(`${prefix} Tenant ${tenantId}: total fixed = ${totalFixed}`);
  }

  return { fixed: totalFixed, errors };
}
