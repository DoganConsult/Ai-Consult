import { safeQuery } from '../../../../../config/database';

import { logger } from '../../../../../platform/dos/observability/services/logger.service';

interface HealthIssue {
  area: string;
  severity: string;
  description: string;
}

/**
 * Governance Health Score Calculator.
 * Computes an overall governance health score (0-100) from four dimensions:
 *   1. Committee Activity   — active committees meeting on schedule
 *   2. Policy Coverage      — percentage of active policies with reviews
 *   3. RACI Completeness    — governance processes with full RACI assignments
 *   4. Oversight Gaps       — governance bodies with chairs and members
 *
 * Each dimension is scored 0-100, then weighted into an overall score.
 */
export async function computeGovernanceHealth(
  tenantId: string,
): Promise<{
  overallScore: number;
  dimensions: Record<string, number>;
  issues: HealthIssue[];
}> {
  const schema = `tenant_${tenantId}`;
  const issues: HealthIssue[] = [];
  const dimensions: Record<string, number> = {
    committeeActivity: 0,
    policyCoverage: 0,
    raciCompleteness: 0,
    oversightGaps: 0,
  };

  try {
    // ══════════════════════════════════════════════════════════════════
    // Dimension 1: Committee Activity (weight: 30%)
    // ══════════════════════════════════════════════════════════════════
    const committeesResult = await safeQuery(
      `SELECT id, name, meeting_frequency_days
         FROM ${schema}.governance_committees
        WHERE status = 'active'`,
    );
    const committees: Array<{
      id: string;
      name: string;
      meeting_frequency_days: number | null;
    }> = committeesResult.rows ?? [];

    if (committees.length === 0) {
      dimensions.committeeActivity = 0;
      issues.push({
        area: 'committeeActivity',
        severity: 'high',
        description: 'No active governance committees found.',
      });
    } else {
      let onSchedule = 0;

      for (const committee of committees) {
        const lastMeetingResult = await safeQuery(
          `SELECT MAX(meeting_date) AS last_meeting
             FROM ${schema}.committee_meetings
            WHERE committee_id = $1`,
          [committee.id],
        );
        const lastMeeting = (lastMeetingResult.rows ?? [])[0]?.last_meeting;

        if (!lastMeeting) {
          issues.push({
            area: 'committeeActivity',
            severity: 'high',
            description: `Committee "${committee.name}" has no recorded meetings.`,
          });
          continue;
        }

        const daysSince = Math.floor(
          (Date.now() - new Date(lastMeeting).getTime()) / (24 * 60 * 60 * 1000),
        );
        const frequency = committee.meeting_frequency_days ?? 90;

        if (daysSince <= frequency) {
          onSchedule++;
        } else {
          issues.push({
            area: 'committeeActivity',
            severity: daysSince > frequency * 2 ? 'high' : 'medium',
            description: `Committee "${committee.name}" last met ${daysSince} days ago (cadence: ${frequency} days).`,
          });
        }
      }

      dimensions.committeeActivity = Math.round(
        (onSchedule / committees.length) * 100,
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // Dimension 2: Policy Coverage (weight: 25%)
    // ══════════════════════════════════════════════════════════════════
    const policiesResult = await safeQuery(
      `SELECT id, title, last_reviewed_at
         FROM ${schema}.policies
        WHERE status = 'active'`,
    );
    const policies: Array<{
      id: string;
      title: string;
      last_reviewed_at: string | null;
    }> = policiesResult.rows ?? [];

    if (policies.length === 0) {
      dimensions.policyCoverage = 0;
      issues.push({
        area: 'policyCoverage',
        severity: 'high',
        description: 'No active policies found.',
      });
    } else {
      let reviewed = 0;
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      for (const policy of policies) {
        if (
          policy.last_reviewed_at &&
          new Date(policy.last_reviewed_at) >= oneYearAgo
        ) {
          reviewed++;
        } else {
          issues.push({
            area: 'policyCoverage',
            severity: 'medium',
            description: `Policy "${policy.title}" has not been reviewed in the past year.`,
          });
        }
      }

      dimensions.policyCoverage = Math.round((reviewed / policies.length) * 100);
    }

    // ══════════════════════════════════════════════════════════════════
    // Dimension 3: RACI Completeness (weight: 25%)
    // ══════════════════════════════════════════════════════════════════
    const processesResult = await safeQuery(
      `SELECT id, title
         FROM ${schema}.governance_processes
        WHERE status = 'active'`,
    );
    const processes: Array<{ id: string; title: string }> =
      processesResult.rows ?? [];

    if (processes.length === 0) {
      dimensions.raciCompleteness = 0;
      issues.push({
        area: 'raciCompleteness',
        severity: 'medium',
        description: 'No active governance processes found.',
      });
    } else {
      let complete = 0;
      const requiredRoles = ['responsible', 'accountable', 'consulted', 'informed'];

      for (const process of processes) {
        const raciResult = await safeQuery(
          `SELECT DISTINCT role_type
             FROM ${schema}.raci_assignments
            WHERE entity_type = 'governance_process'
              AND entity_id = $1`,
          [process.id],
        );
        const assignedRoles = new Set(
          (raciResult.rows ?? []).map((r: any) => r.role_type),
        );
        const missing = requiredRoles.filter((r) => !assignedRoles.has(r));

        if (missing.length === 0) {
          complete++;
        } else {
          issues.push({
            area: 'raciCompleteness',
            severity: missing.includes('accountable') ? 'high' : 'low',
            description: `Process "${process.title}" missing RACI roles: ${missing.join(', ')}.`,
          });
        }
      }

      dimensions.raciCompleteness = Math.round(
        (complete / processes.length) * 100,
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // Dimension 4: Oversight Gaps (weight: 20%)
    // ══════════════════════════════════════════════════════════════════
    const bodiesResult = await safeQuery(
      `SELECT gb.id, gb.name,
              COUNT(gbm.id) AS member_count,
              COUNT(CASE WHEN gbm.role = 'chair' THEN 1 END) AS chair_count
         FROM ${schema}.governance_bodies gb
         LEFT JOIN ${schema}.governance_body_members gbm ON gbm.body_id = gb.id
        WHERE gb.status = 'active'
        GROUP BY gb.id, gb.name`,
    );
    const bodies: Array<{
      id: string;
      name: string;
      member_count: number;
      chair_count: number;
    }> = bodiesResult.rows ?? [];

    if (bodies.length === 0) {
      dimensions.oversightGaps = 0;
      issues.push({
        area: 'oversightGaps',
        severity: 'high',
        description: 'No active governance bodies found.',
      });
    } else {
      let healthy = 0;

      for (const body of bodies) {
        const memberCount = Number(body.member_count);
        const chairCount = Number(body.chair_count);
        let bodyHealthy = true;

        if (chairCount === 0) {
          bodyHealthy = false;
          issues.push({
            area: 'oversightGaps',
            severity: 'high',
            description: `Governance body "${body.name}" has no chair assigned.`,
          });
        }
        if (memberCount < 3) {
          bodyHealthy = false;
          issues.push({
            area: 'oversightGaps',
            severity: 'medium',
            description: `Governance body "${body.name}" has only ${memberCount} member(s) (minimum recommended: 3).`,
          });
        }

        if (bodyHealthy) healthy++;
      }

      dimensions.oversightGaps = Math.round((healthy / bodies.length) * 100);
    }

    // ══════════════════════════════════════════════════════════════════
    // Overall Weighted Score
    // ══════════════════════════════════════════════════════════════════
    const overallScore = Math.round(
      dimensions.committeeActivity * 0.3 +
        dimensions.policyCoverage * 0.25 +
        dimensions.raciCompleteness * 0.25 +
        dimensions.oversightGaps * 0.2,
    );

    return { overallScore, dimensions, issues };
  } catch (err) {
    logger.error(
      `[GOVERNANCE_HEALTH] computation failed for tenant ${tenantId}:`,
      err,
    );
    return { overallScore: 0, dimensions, issues };
  }
}
