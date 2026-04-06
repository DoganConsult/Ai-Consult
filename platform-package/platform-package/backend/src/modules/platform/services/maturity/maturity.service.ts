// @ts-nocheck
// ============================================
// Shahin — Maturity Service
// GRC maturity level computation and
// assessment recording with DB persistence
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';

export type MaturityLevel = 'initial' | 'managed' | 'defined' | 'measured' | 'optimized';

export interface MaturityCriteria {
  complianceScore: number;  // 0-100
  riskScore: number;        // 0-100 (lower is better)
  evidenceCoverage: number; // 0-100
  processMaturity: number;  // 0-100
}

export interface MaturityThresholds {
  optimized: number;  // e.g., 90
  measured: number;   // e.g., 75
  defined: number;    // e.g., 60
  managed: number;    // e.g., 40
  // below managed = initial
}

const DEFAULT_THRESHOLDS: MaturityThresholds = {
  optimized: 90,
  measured: 75,
  defined: 60,
  managed: 40,
};

/**
 * Pure function: computes maturity level from criteria scores and thresholds.
 * Aggregate = average of all criteria scores (risk is inverted: lower risk = higher contribution).
 * Higher aggregate scores never produce a lower maturity level.
 */
export function computeMaturityLevel(
  criteria: MaturityCriteria,
  thresholds: MaturityThresholds = DEFAULT_THRESHOLDS
): MaturityLevel {
  // For risk, invert: lower risk = higher maturity contribution
  const invertedRisk = 100 - criteria.riskScore;
  const aggregate = (criteria.complianceScore + invertedRisk + criteria.evidenceCoverage + criteria.processMaturity) / 4;

  if (aggregate >= thresholds.optimized) return 'optimized';
  if (aggregate >= thresholds.measured) return 'measured';
  if (aggregate >= thresholds.defined) return 'defined';
  if (aggregate >= thresholds.managed) return 'managed';
  return 'initial';
}

/**
 * Records a maturity assessment for a tenant.
 * Computes the maturity level and aggregate score, persists to DB,
 * and returns the result.
 */
export async function recordMaturityAssessment(
  tenantId: string,
  criteria: MaturityCriteria
): Promise<{ level: MaturityLevel; aggregate: number; assessmentId?: string }> {
  const level = computeMaturityLevel(criteria);
  const invertedRisk = 100 - criteria.riskScore;
  const aggregate = (criteria.complianceScore + invertedRisk + criteria.evidenceCoverage + criteria.processMaturity) / 4;

  // Persist to DB
  try {
    const schema = tenantSchema(tenantId);

    // Ensure the maturity_assessments table exists
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".maturity_assessments (
        assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        level VARCHAR(20) NOT NULL,
        aggregate DECIMAL(5,2) NOT NULL,
        compliance_score DECIMAL(5,2),
        risk_score DECIMAL(5,2),
        evidence_coverage DECIMAL(5,2),
        process_maturity DECIMAL(5,2),
        assessed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await safeQuery(
      `INSERT INTO "${schema}".maturity_assessments
        (level, aggregate, compliance_score, risk_score, evidence_coverage, process_maturity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING assessment_id`,
      [level, aggregate, criteria.complianceScore, criteria.riskScore, criteria.evidenceCoverage, criteria.processMaturity]
    );

    return { level, aggregate, assessmentId: getFirstRow(result)?.assessment_id };
  } catch {
    // If DB persistence fails, still return the computed result
    return { level, aggregate };
  }
}
