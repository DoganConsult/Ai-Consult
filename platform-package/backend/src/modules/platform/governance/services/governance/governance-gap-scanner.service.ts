import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

import { logger } from '../../../../../platform/dos/observability/services/logger.service';

/**
 * Governance Gap Scanner ("AutoFire").
 * Scans for structural governance gaps:
 *   1. Missing committee assignments — governance bodies without committees
 *   2. Expired governance body mandates — bodies past their mandate end date
 *   3. Unassigned responsibilities — active governance processes with no responsible party
 *
 * Creates remediation records for each gap found.
 */
export async function runGovernanceAutoFire(
  tenantId: string,
): Promise<{ gapsFound: number; remediationsCreated: number }> {
  const schema = `tenant_${tenantId}`;
  let gapsFound = 0;
  let remediationsCreated = 0;

  try {
    // ══════════════════════════════════════════════════════════════════
    // Gap 1: Governance bodies without any committee assignments
    // ══════════════════════════════════════════════════════════════════
    const orphanBodiesResult = await safeQuery(
      `SELECT gb.id, gb.name
         FROM ${schema}.governance_bodies gb
         LEFT JOIN ${schema}.governance_committees gc
           ON gc.body_id = gb.id AND gc.status = 'active'
        WHERE gb.status = 'active'
          AND gc.id IS NULL
        ORDER BY gb.name`,
    );
    const orphanBodies: Array<{ id: string; name: string }> =
      orphanBodiesResult.rows ?? [];

    for (const body of orphanBodies) {
      gapsFound++;

      await safeQuery(
        `INSERT INTO ${schema}.governance_gaps
           (id, entity_type, entity_id, gap_type, description, severity, status, detected_at, created_at)
         VALUES ($1, 'governance_body', $2, 'missing_committee', $3, 'medium', 'open', NOW(), NOW())
         ON CONFLICT (entity_type, entity_id, gap_type)
           WHERE status = 'open'
         DO UPDATE SET detected_at = NOW()`,
        [
          uuid(),
          body.id,
          `Governance body "${body.name}" has no active committee assignments.`,
        ],
      );

      await safeQuery(
        `INSERT INTO ${schema}.remediation_tasks
           (id, entity_type, entity_id, title, description, priority, status, created_at)
         VALUES ($1, 'governance_body', $2, $3, $4, 'medium', 'open', NOW())`,
        [
          uuid(),
          body.id,
          `Assign committee to "${body.name}"`,
          `Governance body has no linked committees. Assign at least one active committee.`,
        ],
      );
      remediationsCreated++;
    }

    // ══════════════════════════════════════════════════════════════════
    // Gap 2: Expired governance body mandates
    // ══════════════════════════════════════════════════════════════════
    const expiredMandatesResult = await safeQuery(
      `SELECT id, name, mandate_end_date
         FROM ${schema}.governance_bodies
        WHERE status = 'active'
          AND mandate_end_date IS NOT NULL
          AND mandate_end_date < NOW()
        ORDER BY mandate_end_date ASC`,
    );
    const expiredBodies: Array<{
      id: string;
      name: string;
      mandate_end_date: string;
    }> = expiredMandatesResult.rows ?? [];

    for (const body of expiredBodies) {
      gapsFound++;

      const expiredDate = new Date(body.mandate_end_date).toISOString().split('T')[0];

      await safeQuery(
        `INSERT INTO ${schema}.governance_gaps
           (id, entity_type, entity_id, gap_type, description, severity, status, detected_at, created_at)
         VALUES ($1, 'governance_body', $2, 'mandate_expired', $3, 'high', 'open', NOW(), NOW())
         ON CONFLICT (entity_type, entity_id, gap_type)
           WHERE status = 'open'
         DO UPDATE SET description = $3, detected_at = NOW()`,
        [
          uuid(),
          body.id,
          `Governance body "${body.name}" mandate expired on ${expiredDate}. Renewal required.`,
        ],
      );

      await safeQuery(
        `INSERT INTO ${schema}.remediation_tasks
           (id, entity_type, entity_id, title, description, priority, status, created_at)
         VALUES ($1, 'governance_body', $2, $3, $4, 'high', 'open', NOW())`,
        [
          uuid(),
          body.id,
          `Renew mandate for "${body.name}"`,
          `Mandate expired on ${expiredDate}. Initiate mandate renewal or decommission the body.`,
        ],
      );
      remediationsCreated++;
    }

    // ══════════════════════════════════════════════════════════════════
    // Gap 3: Active governance processes with no responsible party
    // ══════════════════════════════════════════════════════════════════
    const unassignedProcessesResult = await safeQuery(
      `SELECT gp.id, gp.title
         FROM ${schema}.governance_processes gp
         LEFT JOIN ${schema}.raci_assignments ra
           ON ra.entity_type = 'governance_process'
          AND ra.entity_id = gp.id
          AND ra.role_type = 'responsible'
        WHERE gp.status = 'active'
          AND ra.id IS NULL
        ORDER BY gp.title`,
    );
    const unassigned: Array<{ id: string; title: string }> =
      unassignedProcessesResult.rows ?? [];

    for (const process of unassigned) {
      gapsFound++;

      await safeQuery(
        `INSERT INTO ${schema}.governance_gaps
           (id, entity_type, entity_id, gap_type, description, severity, status, detected_at, created_at)
         VALUES ($1, 'governance_process', $2, 'unassigned_responsibility', $3, 'high', 'open', NOW(), NOW())
         ON CONFLICT (entity_type, entity_id, gap_type)
           WHERE status = 'open'
         DO UPDATE SET detected_at = NOW()`,
        [
          uuid(),
          process.id,
          `Governance process "${process.title}" has no responsible party assigned.`,
        ],
      );

      await safeQuery(
        `INSERT INTO ${schema}.remediation_tasks
           (id, entity_type, entity_id, title, description, priority, status, created_at)
         VALUES ($1, 'governance_process', $2, $3, $4, 'high', 'open', NOW())`,
        [
          uuid(),
          process.id,
          `Assign responsible party for "${process.title}"`,
          `No responsible party in RACI. Assign at minimum a Responsible and Accountable role.`,
        ],
      );
      remediationsCreated++;
    }

    return { gapsFound, remediationsCreated };
  } catch (err) {
    logger.error(
      `[GOVERNANCE_GAP_SCANNER] scan failed for tenant ${tenantId}:`,
      err,
    );
    return { gapsFound, remediationsCreated };
  }
}
