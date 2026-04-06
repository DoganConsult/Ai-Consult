// @ts-nocheck
// ============================================
// Shahin — Audit Cross-Module Service
// Cross-module linking: findings ↔ risks,
// findings ↔ compliance violations
// Tables: findings, risks, compliance_violations
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../../config/database";
import { getFirstRow } from '../../../../../utils/db-utils';

// ── Sync finding to risk register ────────────────────────────────────

export async function syncFindingToRiskRegister(tenantId: string, findingId: string): Promise<any> {
  const s = tenantSchema(tenantId);

  // Read the finding
  const findingRes = await safeQuery(
    `SELECT * FROM "${s}".findings
     WHERE finding_id = $1 AND deleted_at IS NULL`,
    [findingId]
  );
  if (!getFirstRow(findingRes)) throw new Error("Finding not found");

  const finding = getFirstRow(findingRes);

  // Only sync critical or high severity findings
  if (!['critical', 'high'].includes(finding.severity)) {
    return { synced: false, reason: `Finding severity "${finding.severity}" does not qualify. Only critical/high findings are synced.` };
  }

  const riskId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".risks
       (risk_id, risk_title, risk_description, risk_source, source_id,
        likelihood, impact, risk_level, status, created_at)
     VALUES ($1, $2, $3, 'audit_finding', $4,
        CASE WHEN $5 = 'critical' THEN 5 ELSE 4 END,
        CASE WHEN $5 = 'critical' THEN 5 ELSE 4 END,
        CASE WHEN $5 = 'critical' THEN 'critical' ELSE 'high' END,
        'open', NOW())
     ON CONFLICT (source_id) DO UPDATE SET
       risk_title = EXCLUDED.risk_title,
       risk_description = EXCLUDED.risk_description,
       likelihood = EXCLUDED.likelihood,
       impact = EXCLUDED.impact,
       risk_level = EXCLUDED.risk_level,
       updated_at = NOW()
     RETURNING *`,
    [riskId, finding.title, finding.description || `Risk derived from audit finding: ${finding.title}`,
     findingId, finding.severity]
  );

  return { synced: true, risk: getFirstRow(result) };
}

// ── Link finding to compliance violation ─────────────────────────────

export async function linkToComplianceViolation(tenantId: string, findingId: string, violationId: string): Promise<any> {
  const s = tenantSchema(tenantId);

  // Verify both records exist
  const [findingRes, violationRes] = await Promise.all([
    safeQuery(
      `SELECT finding_id FROM "${s}".findings
       WHERE finding_id = $1 AND deleted_at IS NULL`,
      [findingId]
    ),
    safeQuery(
      `SELECT violation_id FROM "${s}".compliance_violations
       WHERE violation_id = $1 AND deleted_at IS NULL`,
      [violationId]
    ),
  ]);

  if (!getFirstRow(findingRes)) throw new Error("Finding not found");
  if (!getFirstRow(violationRes)) throw new Error("Compliance violation not found");

  // Update finding with linked violation
  const result = await safeQuery(
    `UPDATE "${s}".findings
     SET linked_violation_id = $2, updated_at = NOW()
     WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`,
    [findingId, violationId]
  );

  return getFirstRow(result);
}

// ── Get integration status (counts of linked findings) ───────────────

export async function getIntegrationStatus(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);

  const [totalFindings, linkedToRisks, linkedToViolations] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".findings WHERE deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".risks
       WHERE risk_source = 'audit_finding' AND deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${s}".findings
       WHERE linked_violation_id IS NOT NULL AND deleted_at IS NULL`
    ),
  ]);

  const total = getFirstRow(totalFindings)?.count || 0;
  const riskLinked = getFirstRow(linkedToRisks)?.count || 0;
  const violationLinked = getFirstRow(linkedToViolations)?.count || 0;

  return {
    totalFindings: total,
    findingsLinkedToRisks: riskLinked,
    findingsLinkedToViolations: violationLinked,
    riskLinkagePct: total > 0 ? Math.round((riskLinked / total) * 100) : 0,
    violationLinkagePct: total > 0 ? Math.round((violationLinked / total) * 100) : 0,
  };
}
