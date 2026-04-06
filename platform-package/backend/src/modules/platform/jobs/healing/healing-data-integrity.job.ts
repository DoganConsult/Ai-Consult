import { logger } from '../../../../platform/dos/observability/logger.service';
// ============================================================
// Dogan Operating System — Healing: Data Integrity Job
// Daily: checks orphaned records and broken FK references
// ============================================================

import { Pool } from 'pg';
import { tenantSchema } from '../../../../config/db/tenant-client';

/**
 * Scans a tenant schema for orphaned records and broken FK references.
 * Removes or reassigns orphaned rows to maintain data integrity.
 *
 * @param pool - Database connection pool
 * @param tenantId - Tenant identifier
 */
export async function healingDataIntegrityJob(
  pool: Pool,
  tenantId: string,
): Promise<{ orphanedRemoved: number; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const prefix = `[DoganOS:HealingDataIntegrity]`;
  let orphanedRemoved = 0;
  const errors: string[] = [];

  // 1. Evidence tasks referencing non-existent controls
  try {
    const result = await pool.query(
      `DELETE FROM "${schema}".evidence_tasks
       WHERE control_id IS NOT NULL
         AND control_id NOT IN (SELECT control_id FROM "${schema}".controls)
       RETURNING task_id`,
    );
    if (result.rows.length > 0) {
      orphanedRemoved += result.rows.length;
      logger.warn(`${prefix} Tenant ${tenantId}: removed ${result.rows.length} orphaned evidence tasks`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) errors.push(`evidence_tasks: ${msg}`);
  }

  // 2. Process tasks referencing deleted teams
  try {
    const result = await pool.query(
      `UPDATE "${schema}".process_tasks
       SET team_id = NULL, updated_at = NOW()
       WHERE team_id IS NOT NULL
         AND team_id NOT IN (SELECT team_id FROM "${schema}".teams)
       RETURNING id`,
    );
    if (result.rows.length > 0) {
      orphanedRemoved += result.rows.length;
      logger.warn(`${prefix} Tenant ${tenantId}: cleared team_id on ${result.rows.length} orphaned process tasks`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) errors.push(`process_tasks: ${msg}`);
  }

  // 3. Risk-control mappings referencing deleted controls or risks
  try {
    const result = await pool.query(
      `DELETE FROM "${schema}".risk_control_mappings
       WHERE control_id NOT IN (SELECT control_id FROM "${schema}".controls)
          OR risk_id NOT IN (SELECT risk_id FROM "${schema}".risks)
       RETURNING id`,
    );
    if (result.rows.length > 0) {
      orphanedRemoved += result.rows.length;
      logger.warn(`${prefix} Tenant ${tenantId}: removed ${result.rows.length} orphaned risk-control mappings`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) errors.push(`risk_control_mappings: ${msg}`);
  }

  // 4. Workflow instances with no matching workflow definition
  try {
    const result = await pool.query(
      `UPDATE "${schema}".workflow_instances
       SET status = 'orphaned', updated_at = NOW()
       WHERE workflow_id NOT IN (SELECT workflow_id FROM "${schema}".workflows)
         AND status NOT IN ('completed', 'cancelled', 'orphaned')
       RETURNING instance_id`,
    );
    if (result.rows.length > 0) {
      orphanedRemoved += result.rows.length;
      logger.warn(`${prefix} Tenant ${tenantId}: marked ${result.rows.length} workflow instances as orphaned`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) errors.push(`workflow_instances: ${msg}`);
  }

  if (orphanedRemoved > 0) {
    logger.info(`${prefix} Tenant ${tenantId}: total orphaned records resolved = ${orphanedRemoved}`);
  }

  return { orphanedRemoved, errors };
}
