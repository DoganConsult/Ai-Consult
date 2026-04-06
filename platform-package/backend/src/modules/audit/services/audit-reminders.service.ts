import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/logger.service';

/**
 * Generate reminder notifications for audit tasks approaching their deadline.
 * Looks for tasks due within the next 3 days that have not yet been completed
 * and do not already have a pending reminder.
 */
export async function generateReminders(
  tenantId: string,
): Promise<{ remindersGenerated: number }> {
  const schema = tenantSchema(tenantId);

  try {
    // Find tasks approaching deadline (within 3 days) that are not done
    const tasks = await safeQuery(
      `SELECT t.id, t.title, t.assigned_to, t.due_date
       FROM ${schema}.audit_tasks t
       WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
         AND t.status NOT IN ('completed', 'cancelled', 'closed')
         AND NOT EXISTS (
           SELECT 1 FROM ${schema}.activity_notifications n
           WHERE n.reference_id = t.id::text
             AND n.notification_type = 'audit_task_reminder'
             AND n.created_at > NOW() - INTERVAL '1 day'
         )
       ORDER BY t.due_date ASC`,
    );

    if (tasks.rows.length === 0) {
      logger.info(`[audit-reminders] tenant=${tenantId} no tasks approaching deadline`);
      return { remindersGenerated: 0 };
    }

    // Batch-insert reminder notifications
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const task of tasks.rows) {
      const notifId = uuid();
      placeholders.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, NOW())`,
      );
      values.push(
        notifId,
        task.assigned_to,
        'audit_task_reminder',
        `Audit task "${task.title}" is due on ${new Date(task.due_date).toISOString().slice(0, 10)}`,
        task.id.toString(),
        'unread',
      );
    }

    await safeQuery(
      `INSERT INTO ${schema}.activity_notifications
         (id, user_id, notification_type, message, reference_id, status, created_at)
       VALUES ${placeholders.join(', ')}`,
      values,
    );

    logger.info(
      `[audit-reminders] tenant=${tenantId} remindersGenerated=${tasks.rows.length}`,
    );
    return { remindersGenerated: tasks.rows.length };
  } catch (err) {
    logger.error(`[audit-reminders] Failed to generate reminders for tenant=${tenantId}`, err);
    throw err;
  }
}
