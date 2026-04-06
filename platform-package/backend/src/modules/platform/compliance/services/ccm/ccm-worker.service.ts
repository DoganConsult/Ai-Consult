import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

import { logger } from '../../../../../platform/dos/observability/services/logger.service';

/**
 * Continuous Controls Monitoring (CCM) worker.
 * Runs a periodic cycle that checks every active control for:
 *   1. Assessment staleness (last assessed > 90 days ago)
 *   2. Evidence freshness (linked evidence items older than their retention window)
 * Returns aggregate counts for the cycle run.
 */
export async function runCCMCycle(
  tenantId: string,
): Promise<{ controlsChecked: number; issuesFound: number }> {
  const schema = `tenant_${tenantId}`;
  let controlsChecked = 0;
  let issuesFound = 0;

  try {
    // ── 1. Fetch all active controls ────────────────────────────────
    const controlsResult = await safeQuery(
      `SELECT id, title, status
         FROM ${schema}.controls
        WHERE status = 'active'
        ORDER BY id`,
    );
    const controls: Array<{ id: string; title: string; status: string }> =
      controlsResult.rows ?? [];

    controlsChecked = controls.length;

    if (controlsChecked === 0) {
      return { controlsChecked: 0, issuesFound: 0 };
    }

    const controlIds = controls.map((c) => c.id);

    // ── 2. Assessment staleness check (> 90 days) ───────────────────
    const staleAssessmentsResult = await safeQuery(
      `SELECT ca.control_id,
              MAX(ca.assessed_at) AS last_assessed
         FROM ${schema}.control_assessments ca
        WHERE ca.control_id = ANY($1)
        GROUP BY ca.control_id
       HAVING MAX(ca.assessed_at) < NOW() - INTERVAL '90 days'`,
      [controlIds],
    );
    const staleControlIds = new Set<string>(
      (staleAssessmentsResult.rows ?? []).map((r: any) => r.control_id),
    );

    // Controls that have NEVER been assessed are also stale
    const assessedControlsResult = await safeQuery(
      `SELECT DISTINCT control_id
         FROM ${schema}.control_assessments
        WHERE control_id = ANY($1)`,
      [controlIds],
    );
    const assessedSet = new Set<string>(
      (assessedControlsResult.rows ?? []).map((r: any) => r.control_id),
    );
    for (const cid of controlIds) {
      if (!assessedSet.has(cid)) {
        staleControlIds.add(cid);
      }
    }

    // ── 3. Evidence freshness check ─────────────────────────────────
    const staleEvidenceResult = await safeQuery(
      `SELECT ce.control_id, COUNT(*) AS stale_count
         FROM ${schema}.control_evidence ce
         JOIN ${schema}.evidence_items ei ON ei.id = ce.evidence_id
        WHERE ce.control_id = ANY($1)
          AND ei.collected_at < NOW() - INTERVAL '90 days'
        GROUP BY ce.control_id`,
      [controlIds],
    );
    const evidenceIssueControlIds = new Set<string>(
      (staleEvidenceResult.rows ?? []).map((r: any) => r.control_id),
    );

    // ── 4. Merge issues and create CCM findings ─────────────────────
    const allIssueControlIds = new Set<string>();
    staleControlIds.forEach((id) => allIssueControlIds.add(id));
    evidenceIssueControlIds.forEach((id) => allIssueControlIds.add(id));

    issuesFound = allIssueControlIds.size;

    const issueControlArray = Array.from(allIssueControlIds);
    for (const controlId of issueControlArray) {
      const reasons: string[] = [];
      if (staleControlIds.has(controlId)) {
        reasons.push('assessment_stale');
      }
      if (evidenceIssueControlIds.has(controlId)) {
        reasons.push('evidence_stale');
      }

      await safeQuery(
        `INSERT INTO ${schema}.ccm_findings
           (id, control_id, finding_type, reasons, status, detected_at, created_at)
         VALUES ($1, $2, 'staleness', $3, 'open', NOW(), NOW())
         ON CONFLICT (control_id, finding_type)
           WHERE status = 'open'
         DO UPDATE SET reasons = $3, detected_at = NOW()`,
        [uuid(), controlId, JSON.stringify(reasons)],
      );
    }

    return { controlsChecked, issuesFound };
  } catch (err) {
    logger.error(`[CCM_WORKER] cycle failed for tenant ${tenantId}:`, err);
    return { controlsChecked, issuesFound };
  }
}
