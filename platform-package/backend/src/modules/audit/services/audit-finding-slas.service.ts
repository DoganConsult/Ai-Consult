import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/logger.service';

export interface BreachedFinding {
  findingId: string;
  title: string;
  severity: string;
  slaDeadline: string;
  daysOverdue: number;
  assignedTo: string;
}

/**
 * Retrieve audit findings that have breached their SLA remediation deadline.
 * Returns findings where remediation_deadline < NOW() and status is not closed/resolved.
 */
export async function getBreachedFindings(tenantId: string): Promise<BreachedFinding[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT
         f.id                                       AS "findingId",
         f.title,
         f.severity,
         f.remediation_deadline                      AS "slaDeadline",
         EXTRACT(DAY FROM NOW() - f.remediation_deadline)::int AS "daysOverdue",
         f.assigned_to                               AS "assignedTo"
       FROM ${schema}.audit_findings f
       WHERE f.remediation_deadline < NOW()
         AND f.status NOT IN ('closed', 'resolved')
       ORDER BY f.remediation_deadline ASC`,
    );

    logger.info(
      `[audit-finding-slas] tenant=${tenantId} breachedFindings=${result.rows.length}`,
    );
    return result.rows;
  } catch (err) {
    logger.error(
      `[audit-finding-slas] Failed to fetch breached findings for tenant=${tenantId}`,
      err,
    );
    throw err;
  }
}
