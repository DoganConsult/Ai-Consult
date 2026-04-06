import { logger } from '../../../../platform/dos/observability/logger.service';
// ============================================================
// Dogan Operating System — Healing: Workflow Recovery Job
// Every 15min: finds stuck workflows and resets or escalates
// ============================================================

import { Pool } from 'pg';
import { tenantSchema } from '../../../../config/db/tenant-client';

const STUCK_THRESHOLD_MINUTES = 60;
const MAX_RETRIES = 3;

/**
 * Detects and recovers stuck workflow instances for a tenant.
 * Workflows stuck in 'running' or 'pending' beyond a threshold
 * are either retried or escalated for manual intervention.
 *
 * @param pool - Database connection pool
 * @param tenantId - Tenant identifier
 */
export async function healingWorkflowRecoveryJob(
  pool: Pool,
  tenantId: string,
): Promise<{ reset: number; escalated: number; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const prefix = `[DoganOS:HealingWorkflow]`;
  let reset = 0;
  let escalated = 0;
  const errors: string[] = [];

  // 1. Find stuck workflow instances
  try {
    const stuck = await pool.query(
      `SELECT instance_id, status, retry_count, updated_at
       FROM "${schema}".workflow_instances
       WHERE status IN ('running', 'pending')
         AND updated_at < NOW() - INTERVAL '${STUCK_THRESHOLD_MINUTES} minutes'
       LIMIT 100`,
    );

    for (const row of stuck.rows) {
      const retryCount = row.retry_count ?? 0;

      if (retryCount < MAX_RETRIES) {
        // Reset to pending for retry
        await pool.query(
          `UPDATE "${schema}".workflow_instances
           SET status = 'pending', retry_count = $2, updated_at = NOW()
           WHERE instance_id = $1`,
          [row.instance_id, retryCount + 1],
        );
        reset++;
      } else {
        // Escalate: mark as failed and log for manual review
        await pool.query(
          `UPDATE "${schema}".workflow_instances
           SET status = 'failed', error_message = 'Auto-escalated: stuck beyond max retries', updated_at = NOW()
           WHERE instance_id = $1`,
          [row.instance_id],
        );
        escalated++;
      }
    }

    if (reset > 0) {
      logger.info(`${prefix} Tenant ${tenantId}: reset ${reset} stuck workflow(s) for retry`);
    }
    if (escalated > 0) {
      logger.warn(`${prefix} Tenant ${tenantId}: escalated ${escalated} stuck workflow(s) (max retries exceeded)`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) {
      errors.push(`workflow_instances: ${msg}`);
      logger.error(`${prefix} Error recovering workflows: ${msg}`);
    }
  }

  // 2. Find stuck process tasks and reset
  try {
    const stuckTasks = await pool.query(
      `UPDATE "${schema}".process_tasks
       SET status = 'open', updated_at = NOW()
       WHERE status = 'in_progress'
         AND updated_at < NOW() - INTERVAL '${STUCK_THRESHOLD_MINUTES} minutes'
       RETURNING id`,
    );

    if (stuckTasks.rows.length > 0) {
      reset += stuckTasks.rows.length;
      logger.info(`${prefix} Tenant ${tenantId}: reset ${stuckTasks.rows.length} stuck process task(s)`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('does not exist')) {
      errors.push(`process_tasks: ${msg}`);
    }
  }

  return { reset, escalated, errors };
}
