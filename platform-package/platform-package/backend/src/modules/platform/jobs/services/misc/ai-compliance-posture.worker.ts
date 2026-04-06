/**
 * AI Compliance Posture Worker — Assesses tenant compliance posture across
 * multiple GRC dimensions and produces a composite score.
 *
 * Dimensions scored 0-100:
 *   - Policy coverage: ratio of active policies to required policy areas
 *   - Control effectiveness: controls passing vs total controls
 *   - Evidence freshness: evidence collected within SLA vs total
 *   - Audit completion: completed audits vs planned
 *   - Regulatory alignment: mapped frameworks vs applicable frameworks
 */

import { safeQuery, tenantSchema } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';

export interface CompliancePostureResult {
  score: number;
  dimensions: Record<string, number>;
  recommendations: string[];
}

export async function runCompliancePostureAssessment(
  tenantId: string,
): Promise<CompliancePostureResult> {
  const schema = tenantSchema(tenantId);
  const dimensions: Record<string, number> = {};
  const recommendations: string[] = [];

  try {
    // --- Policy Coverage ---
    dimensions.policyCoverage = await assessPolicyCoverage(schema, recommendations);

    // --- Control Effectiveness ---
    dimensions.controlEffectiveness = await assessControlEffectiveness(schema, recommendations);

    // --- Evidence Freshness ---
    dimensions.evidenceFreshness = await assessEvidenceFreshness(schema, recommendations);

    // --- Audit Completion ---
    dimensions.auditCompletion = await assessAuditCompletion(schema, recommendations);

    // --- Regulatory Alignment ---
    dimensions.regulatoryAlignment = await assessRegulatoryAlignment(schema, recommendations);

    // Weighted composite score
    const weights: Record<string, number> = {
      policyCoverage: 0.2,
      controlEffectiveness: 0.25,
      evidenceFreshness: 0.2,
      auditCompletion: 0.2,
      regulatoryAlignment: 0.15,
    };

    let score = 0;
    for (const [dim, weight] of Object.entries(weights)) {
      score += (dimensions[dim] ?? 0) * weight;
    }
    score = Math.round(score);

    // Persist the assessment snapshot
    await safeQuery(
      `INSERT INTO "${schema}".compliance_posture_snapshots
         (tenant_id, score, dimensions, recommendations, assessed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, score, JSON.stringify(dimensions), JSON.stringify(recommendations)],
    ).catch((err) => {
      logger.warn('[CompliancePosture] Failed to persist snapshot', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    logger.info('[CompliancePosture] Assessment complete', { tenantId, score });
    return { score, dimensions, recommendations };
  } catch (err) {
    logger.error('[CompliancePosture] Assessment failed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { score: 0, dimensions, recommendations: ['Assessment failed — manual review required'] };
  }
}

async function assessPolicyCoverage(
  schema: string,
  recommendations: string[],
): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
       COUNT(*)::int AS total_count
     FROM "${schema}".policies`,
  ).catch(() => ({ rows: [{ active_count: 0, total_count: 0 }] }));

  const { active_count, total_count } = rows[0];
  if (total_count === 0) {
    recommendations.push('No policies defined — create policies covering key areas');
    return 0;
  }

  const ratio = active_count / total_count;
  if (ratio < 0.7) {
    recommendations.push(
      `Only ${Math.round(ratio * 100)}% of policies are active — review and activate draft policies`,
    );
  }
  return Math.round(ratio * 100);
}

async function assessControlEffectiveness(
  schema: string,
  recommendations: string[],
): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE effectiveness IN ('effective', 'partially_effective'))::int AS passing,
       COUNT(*)::int AS total
     FROM "${schema}".controls`,
  ).catch(() => ({ rows: [{ passing: 0, total: 0 }] }));

  const { passing, total } = rows[0];
  if (total === 0) {
    recommendations.push('No controls defined — implement controls aligned to frameworks');
    return 0;
  }

  const ratio = passing / total;
  if (ratio < 0.8) {
    recommendations.push(
      `${total - passing} controls are ineffective — prioritize remediation`,
    );
  }
  return Math.round(ratio * 100);
}

async function assessEvidenceFreshness(
  schema: string,
  recommendations: string[],
): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE collected_at > NOW() - INTERVAL '90 days')::int AS fresh,
       COUNT(*)::int AS total
     FROM "${schema}".evidence`,
  ).catch(() => ({ rows: [{ fresh: 0, total: 0 }] }));

  const { fresh, total } = rows[0];
  if (total === 0) {
    recommendations.push('No evidence collected — begin evidence gathering for active controls');
    return 0;
  }

  const ratio = fresh / total;
  if (ratio < 0.7) {
    recommendations.push(
      `${total - fresh} evidence items are stale (>90 days) — schedule re-collection`,
    );
  }
  return Math.round(ratio * 100);
}

async function assessAuditCompletion(
  schema: string,
  recommendations: string[],
): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('completed', 'closed'))::int AS completed,
       COUNT(*)::int AS total
     FROM "${schema}".audits
     WHERE planned_date <= NOW()`,
  ).catch(() => ({ rows: [{ completed: 0, total: 0 }] }));

  const { completed, total } = rows[0];
  if (total === 0) {
    recommendations.push('No audits scheduled — create an audit plan');
    return 100; // No audits due = not penalized
  }

  const ratio = completed / total;
  if (ratio < 0.8) {
    recommendations.push(
      `${total - completed} overdue audits — assign auditors and set deadlines`,
    );
  }
  return Math.round(ratio * 100);
}

async function assessRegulatoryAlignment(
  schema: string,
  recommendations: string[],
): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE mapping_status = 'mapped')::int AS mapped,
       COUNT(*)::int AS total
     FROM "${schema}".framework_mappings`,
  ).catch(() => ({ rows: [{ mapped: 0, total: 0 }] }));

  const { mapped, total } = rows[0];
  if (total === 0) {
    recommendations.push('No framework mappings — map controls to applicable regulatory frameworks');
    return 0;
  }

  const ratio = mapped / total;
  if (ratio < 0.7) {
    recommendations.push(
      `Only ${Math.round(ratio * 100)}% of framework requirements are mapped — complete mapping`,
    );
  }
  return Math.round(ratio * 100);
}
