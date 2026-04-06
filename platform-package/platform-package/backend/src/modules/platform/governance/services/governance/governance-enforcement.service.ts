import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

import { logger } from '../../../../../platform/dos/observability/services/logger.service';

/**
 * Governance Enforcement Scanner.
 * Scans for governance policy violations across three dimensions:
 *   1. RACI completeness — every active process must have R, A, C, I assigned
 *   2. Committee meeting cadence — committees must meet per their defined schedule
 *   3. Reporting line gaps — governance bodies must have a designated chair/lead
 */
export async function runEnforcementScan(
  tenantId: string,
): Promise<{ policiesChecked: number; violationsFound: number; actionsCreated: number }> {
  const schema = `tenant_${tenantId}`;
  let policiesChecked = 0;
  let violationsFound = 0;
  let actionsCreated = 0;

  try {
    // ══════════════════════════════════════════════════════════════════
    // Dimension 1: RACI Completeness
    // ══════════════════════════════════════════════════════════════════
    const processesResult = await safeQuery(
      `SELECT id, title, status
         FROM ${schema}.governance_processes
        WHERE status = 'active'
        ORDER BY id`,
    );
    const processes: Array<{ id: string; title: string }> =
      processesResult.rows ?? [];

    policiesChecked += processes.length;

    for (const process of processes) {
      const raciResult = await safeQuery(
        `SELECT role_type FROM ${schema}.raci_assignments
          WHERE entity_type = 'governance_process'
            AND entity_id = $1`,
        [process.id],
      );
      const assignedRoles = new Set(
        (raciResult.rows ?? []).map((r: any) => r.role_type),
      );
      const requiredRoles = ['responsible', 'accountable', 'consulted', 'informed'];
      const missing = requiredRoles.filter((r) => !assignedRoles.has(r));

      if (missing.length > 0) {
        violationsFound++;
        await safeQuery(
          `INSERT INTO ${schema}.governance_violations
             (id, entity_type, entity_id, violation_type, description, severity, status, detected_at, created_at)
           VALUES ($1, 'governance_process', $2, 'raci_incomplete', $3, 'medium', 'open', NOW(), NOW())
           ON CONFLICT (entity_type, entity_id, violation_type)
             WHERE status = 'open'
           DO UPDATE SET description = $3, detected_at = NOW()`,
          [
            uuid(),
            process.id,
            `Process "${process.title}" is missing RACI roles: ${missing.join(', ')}.`,
          ],
        );

        await safeQuery(
          `INSERT INTO ${schema}.remediation_tasks
             (id, entity_type, entity_id, title, description, priority, status, created_at)
           VALUES ($1, 'governance_process', $2, $3, $4, 'medium', 'open', NOW())`,
          [
            uuid(),
            process.id,
            `Complete RACI for "${process.title}"`,
            `Assign missing roles: ${missing.join(', ')}.`,
          ],
        );
        actionsCreated++;
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // Dimension 2: Committee Meeting Cadence
    // ══════════════════════════════════════════════════════════════════
    const committeesResult = await safeQuery(
      `SELECT id, name, meeting_frequency_days
         FROM ${schema}.governance_committees
        WHERE status = 'active'
          AND meeting_frequency_days IS NOT NULL
        ORDER BY id`,
    );
    const committees: Array<{
      id: string;
      name: string;
      meeting_frequency_days: number;
    }> = committeesResult.rows ?? [];

    policiesChecked += committees.length;

    for (const committee of committees) {
      const lastMeetingResult = await safeQuery(
        `SELECT MAX(meeting_date) AS last_meeting
           FROM ${schema}.committee_meetings
          WHERE committee_id = $1`,
        [committee.id],
      );
      const lastMeeting = (lastMeetingResult.rows ?? [])[0]?.last_meeting;

      if (!lastMeeting) {
        violationsFound++;
        await safeQuery(
          `INSERT INTO ${schema}.governance_violations
             (id, entity_type, entity_id, violation_type, description, severity, status, detected_at, created_at)
           VALUES ($1, 'governance_committee', $2, 'meeting_overdue', $3, 'high', 'open', NOW(), NOW())
           ON CONFLICT (entity_type, entity_id, violation_type)
             WHERE status = 'open'
           DO UPDATE SET description = $3, detected_at = NOW()`,
          [
            uuid(),
            committee.id,
            `Committee "${committee.name}" has never held a recorded meeting.`,
          ],
        );
        await safeQuery(
          `INSERT INTO ${schema}.remediation_tasks
             (id, entity_type, entity_id, title, description, priority, status, created_at)
           VALUES ($1, 'governance_committee', $2, $3, $4, 'high', 'open', NOW())`,
          [
            uuid(),
            committee.id,
            `Schedule meeting for "${committee.name}"`,
            `No meeting records found. Schedule and record a meeting.`,
          ],
        );
        actionsCreated++;
        continue;
      }

      const daysSince = Math.floor(
        (Date.now() - new Date(lastMeeting).getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysSince > committee.meeting_frequency_days) {
        violationsFound++;
        await safeQuery(
          `INSERT INTO ${schema}.governance_violations
             (id, entity_type, entity_id, violation_type, description, severity, status, detected_at, created_at)
           VALUES ($1, 'governance_committee', $2, 'meeting_overdue', $3, 'high', 'open', NOW(), NOW())
           ON CONFLICT (entity_type, entity_id, violation_type)
             WHERE status = 'open'
           DO UPDATE SET description = $3, detected_at = NOW()`,
          [
            uuid(),
            committee.id,
            `Committee "${committee.name}" is overdue by ${daysSince - committee.meeting_frequency_days} day(s). Last met ${daysSince} days ago (cadence: every ${committee.meeting_frequency_days} days).`,
          ],
        );
        await safeQuery(
          `INSERT INTO ${schema}.remediation_tasks
             (id, entity_type, entity_id, title, description, priority, status, created_at)
           VALUES ($1, 'governance_committee', $2, $3, $4, 'high', 'open', NOW())`,
          [
            uuid(),
            committee.id,
            `Overdue meeting: "${committee.name}"`,
            `Last meeting was ${daysSince} days ago. Required cadence: ${committee.meeting_frequency_days} days.`,
          ],
        );
        actionsCreated++;
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // Dimension 3: Reporting Line / Chair Gaps
    // ══════════════════════════════════════════════════════════════════
    const bodiesResult = await safeQuery(
      `SELECT id, name
         FROM ${schema}.governance_bodies
        WHERE status = 'active'
        ORDER BY id`,
    );
    const bodies: Array<{ id: string; name: string }> = bodiesResult.rows ?? [];

    policiesChecked += bodies.length;

    for (const body of bodies) {
      const chairResult = await safeQuery(
        `SELECT id FROM ${schema}.governance_body_members
          WHERE body_id = $1
            AND role = 'chair'
          LIMIT 1`,
        [body.id],
      );

      if ((chairResult.rows ?? []).length === 0) {
        violationsFound++;
        await safeQuery(
          `INSERT INTO ${schema}.governance_violations
             (id, entity_type, entity_id, violation_type, description, severity, status, detected_at, created_at)
           VALUES ($1, 'governance_body', $2, 'missing_chair', $3, 'high', 'open', NOW(), NOW())
           ON CONFLICT (entity_type, entity_id, violation_type)
             WHERE status = 'open'
           DO UPDATE SET description = $3, detected_at = NOW()`,
          [
            uuid(),
            body.id,
            `Governance body "${body.name}" has no designated chair.`,
          ],
        );
        await safeQuery(
          `INSERT INTO ${schema}.remediation_tasks
             (id, entity_type, entity_id, title, description, priority, status, created_at)
           VALUES ($1, 'governance_body', $2, $3, $4, 'high', 'open', NOW())`,
          [
            uuid(),
            body.id,
            `Assign chair for "${body.name}"`,
            `No chair assigned. Designate a chair for proper governance oversight.`,
          ],
        );
        actionsCreated++;
      }
    }

    return { policiesChecked, violationsFound, actionsCreated };
  } catch (err) {
    logger.error(
      `[GOVERNANCE_ENFORCEMENT] scan failed for tenant ${tenantId}:`,
      err,
    );
    return { policiesChecked, violationsFound, actionsCreated };
  }
}
