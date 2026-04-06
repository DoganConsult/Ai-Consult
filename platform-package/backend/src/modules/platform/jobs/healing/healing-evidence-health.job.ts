import { logger } from '../../../../platform/dos/observability/logger.service';
// ============================================================
// Dogan Operating System — Healing: Evidence Health Job
// Daily: finds expired/missing evidence and creates follow-up tasks
// ============================================================

import { Pool } from 'pg';
import { tenantSchema } from '../../../../config/db/tenant-client';

const OVERDUE_GRACE_DAYS = 7;

/**
 * Scans a tenant schema for expired or missing evidence.
 * Creates follow-up tasks for evidence that is overdue or has
 * expired beyond the grace period.
 *
 * @param pool - Database connection pool
 * @param tenantId - Tenant identifier
 */
export async function healingEvidenceHealthJob(
  pool: Pool,
  tenantId: string,
): Promise<{ overdueMarked: number; tasksCreated: number; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const prefix = `[DoganOS:HealingEvidence]`;
  let overdueMarked = 0;
  let tasksCreated = 0;
  const errors: string[] = [];

  // 1. Mark overdue evidence tasks that are still pending/in_progress
  try {
    const result = await pool.query(
      `UPDATE "${schema}".evidence_tasks
       SET status = 'overdue', updated_at = NOW()
       WHERE status IN ('pending', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date < NOW() - INTERVAL '${OVERDUE_GRACE_DAYS} days'
       RETURNING task_id, control_id`,
    );

    overdueMarked = result.rows.length;
    if (overdueMarked > 0) {
      logger.warn(`${prefix} Tenant ${tenantId}: marked ${overdueMarked} evidence task(s) as overdue`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) errors.push(`evidence_tasks_overdue: ${msg}`);
  }

  // 2. Find controls with no evidence tasks at all and create placeholder tasks
  try {
    const controlsWithoutEvidence = await pool.query(
      `SELECT c.control_id, c.control_title_en
       FROM "${schema}".controls c
       LEFT JOIN "${schema}".evidence_tasks et ON et.control_id = c.control_id
       WHERE et.task_id IS NULL
         AND c.status IN ('active', 'implemented')
       LIMIT 50`,
    );

    for (const row of controlsWithoutEvidence.rows) {
      await pool.query(
        `INSERT INTO "${schema}".evidence_tasks
           (tenant_id, control_id, title, status, due_date, created_at)
         VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '30 days', NOW())`,
        [tenantId, row.control_id, `Evidence collection: ${row.control_title_en || row.control_id}`],
      ).catch(() => {
        // Column mismatch or constraint — skip silently
      });
      tasksCreated++;
    }

    if (tasksCreated > 0) {
      logger.info(`${prefix} Tenant ${tenantId}: created ${tasksCreated} evidence task(s) for uncovered controls`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) errors.push(`missing_evidence: ${msg}`);
  }

  // 3. Find expired evidence (approved but past validity period) and flag for re-collection
  try {
    const expired = await pool.query(
      `UPDATE "${schema}".evidence_tasks
       SET status = 'pending', updated_at = NOW()
       WHERE status = 'approved'
         AND expires_at IS NOT NULL
         AND expires_at < NOW()
       RETURNING task_id`,
    );

    if (expired.rows.length > 0) {
      logger.warn(`${prefix} Tenant ${tenantId}: reset ${expired.rows.length} expired evidence task(s) for re-collection`);
      overdueMarked += expired.rows.length;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist') && !msg.includes('column')) {
      errors.push(`expired_evidence: ${msg}`);
    }
  }

  return { overdueMarked, tasksCreated, errors };
}
