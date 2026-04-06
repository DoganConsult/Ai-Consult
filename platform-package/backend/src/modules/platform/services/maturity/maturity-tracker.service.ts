// @ts-nocheck
/**
 * Maturity Tracker Service
 *
 * Tracks and computes maturity scores across GRC domains.
 *
 * Pure functions: computeMaturityScore, checkMaturityThreshold
 * DB functions: getMaturityTrends, generateHealthReport
 *
 * Requirements: 10.1, 10.2, 10.5
 */

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import type { MaturityTrend, GrcHealthReport } from '../../../../types/journey.types';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

// ===========================================================================
// Types (domain-specific, not exported from journey.types)
// ===========================================================================

/** A single factor contributing to a domain's maturity score. */
export interface MaturityFactor {
  factor: string;
  weight: number;
  value: number;
}

/** Result of computing a maturity score for a domain. */
export interface DomainMaturityScore {
  tenantId: string;
  domain: string;
  score: number;          // 0–5
  previousScore: number;
  assessedAt: string;
  factors: MaturityFactor[];
}

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Compute a maturity score as the weighted average of domain factors,
 * clamped to [0, 5].
 *
 * If factors is empty or total weight is 0, returns 0.
 *
 * Requirement 10.1: Track maturity score changes across GRC domains.
 */
export function computeMaturityScore(
  factors: MaturityFactor[],
): number {
  if (factors.length === 0) return 0;

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = factors.reduce((sum, f) => sum + f.weight * f.value, 0);
  const raw = weightedSum / totalWeight;

  return Math.min(5, Math.max(0, raw));
}

/**
 * Check whether a maturity score is below a given threshold.
 *
 * Returns true if score < threshold (alert condition).
 *
 * Requirement 10.2: Alert when maturity score drops below threshold.
 */
export function checkMaturityThreshold(
  score: number,
  threshold: number,
): boolean {
  return score < threshold;
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Retrieve maturity trends for a tenant over the specified number of months.
 *
 * Groups scores by domain, orders by date, and computes the trend direction
 * (improving / declining / stable) based on the first and last scores.
 *
 * Requirement 10.1: Continuously track maturity score changes.
 */
export async function getMaturityTrends(
  tenantId: string,
  months: number,
): Promise<MaturityTrend[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT domain, score, assessed_at
     FROM "${schema}".maturity_scores
     WHERE tenant_id = $1
       AND assessed_at >= NOW() - INTERVAL '1 month' * $2
     ORDER BY domain, assessed_at ASC`,
    [tenantId, months],
  );

  // Group rows by domain
  const domainMap = new Map<string, Array<{ score: number; date: string }>>();
  for (const row of result.rows) {
    const domain = row.domain as string;
    const entry = {
      score: Number(row.score),
      date: row.assessed_at instanceof Date
        ? row.assessed_at.toISOString()
        : String(row.assessed_at),
    };
    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }
    domainMap.get(domain)!.push(entry);
  }

  const trends: MaturityTrend[] = [];
  for (const [domain, scores] of domainMap) {
    const direction = computeTrendDirection(scores);
    trends.push({ domain, scores, direction });
  }

  return trends;
}

/**
 * Determine trend direction from an ordered list of score entries.
 * Compares the first and last scores.
 */
function computeTrendDirection(
  scores: Array<{ score: number; date: string }>,
): 'improving' | 'declining' | 'stable' {
  if (scores.length < 2) return 'stable';
  const first = scores[0].score;
  const last = scores[scores.length - 1].score;
  if (last > first) return 'improving';
  if (last < first) return 'declining';
  return 'stable';
}

/**
 * Generate a comprehensive GRC health report for a tenant.
 *
 * Aggregates:
 * - Latest maturity scores per domain
 * - Maturity trends (last 6 months)
 * - Open risk count
 * - Pending policy review count
 * - Upcoming audit deadline count
 * - Recommended actions based on current state
 *
 * Requirement 10.5: Monthly GRC health summary report.
 */
export async function generateHealthReport(
  tenantId: string,
): Promise<GrcHealthReport> {
  const schema = tenantSchema(tenantId);

  // Latest maturity score per domain
  const scoresResult = await safeQuery(
    `SELECT DISTINCT ON (domain)
            domain, score, previous_score, factors, assessed_at
     FROM "${schema}".maturity_scores
     WHERE tenant_id = $1
     ORDER BY domain, assessed_at DESC`,
    [tenantId],
  );

  const domainScores: GrcHealthReport['domainScores'] = scoresResult.rows.map((row: GenericRow) => ({
    tenantId,
    domain: row.domain,
    score: Number(row.score),
    previousScore: Number(row.previous_score ?? 0),
    assessedAt: row.assessed_at instanceof Date
      ? row.assessed_at.toISOString()
      : String(row.assessed_at),
    factors: row.factors ?? [],
  }));

  // Overall maturity = average of domain scores, clamped to [0,5]
  const overallMaturity = domainScores.length > 0
    ? Math.min(5, Math.max(0,
        domainScores.reduce((sum: any, d: any) => sum + d.score, 0) / domainScores.length,
      ))
    : 0;

  // Trends for last 6 months
  const trends = await getMaturityTrends(tenantId, 6);

  // Open risks count
  const risksResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(
    `SELECT COUNT(*) as count FROM "${schema}".risks
     WHERE status IN ('identified', 'open')`,
  ), { tenantId: tenantId, operation: 'query risks' });
  const openRisks = Number(getFirstRow(risksResult)?.count ?? 0);

  // Pending policy reviews count
  const policiesResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(
    `SELECT COUNT(*) as count FROM "${schema}".policies
     WHERE status = 'review'`,
  ), { tenantId: tenantId, operation: 'query risks' });
  const pendingPolicyReviews = Number(getFirstRow(policiesResult)?.count ?? 0);

  // Upcoming audit deadlines (next 30 days)
  const auditsResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(
    `SELECT COUNT(*) as count FROM "${schema}".audits
     WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       AND status != 'completed'`,
  ), { tenantId: tenantId, operation: 'query policies' });
  const upcomingAuditDeadlines = Number(getFirstRow(auditsResult)?.count ?? 0);

  // Generate recommended actions based on current state
  const recommendedActions = generateRecommendedActions(
    domainScores,
    openRisks,
    pendingPolicyReviews,
    upcomingAuditDeadlines,
  );

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    overallMaturity,
    domainScores,
    trends,
    openRisks,
    pendingPolicyReviews,
    upcomingAuditDeadlines,
    recommendedActions,
  };
}

/**
 * Generate recommended actions based on the current GRC state.
 * Always returns at least one recommendation.
 */
function generateRecommendedActions(
  domainScores: GrcHealthReport['domainScores'],
  openRisks: number,
  pendingPolicyReviews: number,
  upcomingAuditDeadlines: number,
): string[] {
  const actions: string[] = [];

  // Flag domains with low maturity
  for (const ds of domainScores) {
    if (ds.score < 2) {
      actions.push(`Improve maturity in "${ds.domain}" domain (current score: ${ds.score}/5)`);
    }
  }

  if (openRisks > 0) {
    actions.push(`Address ${openRisks} open risk(s) to improve your risk posture`);
  }

  if (pendingPolicyReviews > 0) {
    actions.push(`Complete ${pendingPolicyReviews} pending policy review(s)`);
  }

  if (upcomingAuditDeadlines > 0) {
    actions.push(`Prepare for ${upcomingAuditDeadlines} upcoming audit deadline(s)`);
  }

  // Always provide at least one action
  if (actions.length === 0) {
    actions.push('Continue monitoring your GRC posture and review maturity trends regularly');
  }

  return actions;
}
