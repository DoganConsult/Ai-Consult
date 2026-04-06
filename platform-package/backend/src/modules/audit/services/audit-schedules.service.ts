import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/logger.service';

export interface DueSchedule {
  scheduleId: string;
  auditName: string;
  dueDate: string;
  assignedTo: string;
  status: string;
}

/**
 * Retrieve audit schedules that are currently due (next_due_date <= NOW())
 * and have an active or pending status.
 */
export async function getDueSchedules(tenantId: string): Promise<DueSchedule[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT
         s.id            AS "scheduleId",
         s.audit_name    AS "auditName",
         s.next_due_date AS "dueDate",
         s.assigned_to   AS "assignedTo",
         s.status
       FROM ${schema}.audit_schedules s
       WHERE s.next_due_date <= NOW()
         AND s.status IN ('active', 'pending')
       ORDER BY s.next_due_date ASC`,
    );

    logger.info(`[audit-schedules] tenant=${tenantId} dueSchedules=${result.rows.length}`);
    return result.rows;
  } catch (err) {
    logger.error(`[audit-schedules] Failed to fetch due schedules for tenant=${tenantId}`, err);
    throw err;
  }
}
