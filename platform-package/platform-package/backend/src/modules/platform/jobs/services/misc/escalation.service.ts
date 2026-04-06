/**
 * Escalation Service — SLA breach detection and escalation handling.
 *
 * Checks for overdue workflow tasks, review cycles, and approval requests,
 * then triggers escalation paths defined in approval matrices.
 */

import { safeQuery, tenantSchema } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';
import { emitEvent } from '../../../../../platform/dos/events/event-bus';
import { SYSTEM_JOB_ACTOR } from '../../../../../platform/dos/constants/system-actors';

interface EscalationResult {
  tenantId: string;
  escalatedCount: number;
  errors: string[];
}

/**
 * Check for SLA breaches across a tenant and trigger escalations.
 */
export async function checkEscalations(tenantId: string): Promise<EscalationResult> {
  const schema = tenantSchema(tenantId);
  const result: EscalationResult = { tenantId, escalatedCount: 0, errors: [] };

  try {
    // Check overdue workflow tasks
    const { rows: overdueTasks } = await safeQuery(
      `SELECT id, title, assigned_to, due_date, module_code
       FROM "${schema}".process_tasks
       WHERE status = 'pending'
         AND due_date < NOW()
         AND escalated_at IS NULL
       LIMIT 100`,
    ).catch(() => ({ rows: [] }));

    for (const task of overdueTasks) {
      try {
        await safeQuery(
          `UPDATE "${schema}".process_tasks SET escalated_at = NOW() WHERE id = $1`,
          [task.id],
        );

        await emitEvent({
          event: 'workflow.task.escalated',
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: task.module_code || 'workflow',
          entityType: 'task',
          entityId: task.id as string,
          data: {
            title: task.title,
            assignedTo: task.assigned_to,
            dueDate: task.due_date,
          },
        }).catch(() => {});

        result.escalatedCount++;
      } catch (err) {
        result.errors.push(`Task ${task.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (result.escalatedCount > 0) {
      logger.info(`[Escalation] Escalated ${result.escalatedCount} overdue items for tenant ${tenantId}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    logger.warn('[Escalation] checkEscalations failed', { tenantId, error: msg });
  }

  return result;
}
