// @ts-nocheck
// Program Health Score Service
// Feature: premium-dashboard-overhaul, Task 8.1
// Requirements: 16.1, 16.2, 16.3, 16.4

import { safeQuery, tenantSchema } from "../../../../config/database";
import {
  computeHealthScore,
  healthScoreZone,
  computeHealthDelta,
  ProgramHealthData,
  HealthInputs,
} from "../../../../utils/program-health.utils";
import { getFirstRow } from '../../../../utils/db-utils';

/**
 * Fetches program health data for a tenant.
 * Queries compliance score, risk score, evidence coverage, and remediation
 * closure rate from the tenant schema, computes the composite health score,
 * determines the zone, and computes delta from the previous KPI snapshot.
 */
export async function getProgramHealth(tenantId: string): Promise<ProgramHealthData> {
  const schema = tenantSchema(tenantId);

  // 1. Get the latest KPI snapshot for current scores
  const latestResult = await safeQuery(
    `SELECT compliance_score, risk_score, evidence_coverage, remediation_closure_rate
     FROM "${schema}".kpi_snapshots
     ORDER BY snapshot_date DESC
     LIMIT 1`
  );

  // Default inputs when no snapshot exists
  let inputs: HealthInputs = {
    complianceScore: 0,
    riskScore: 0,
    evidenceCoverage: 0,
    remediationClosureRate: 0,
  };

  if (latestResult.rows.length > 0) {
    const row = getFirstRow(latestResult);
    inputs = {
      complianceScore: Number(row.compliance_score) || 0,
      riskScore: Number(row.risk_score) || 0,
      evidenceCoverage: Number(row.evidence_coverage) || 0,
      remediationClosureRate: Number(row.remediation_closure_rate) || 0,
    };
  }

  // 2. Compute current health score
  const overallScore = computeHealthScore(inputs);
  const zone = healthScoreZone(overallScore);
  const inverseRiskScore = Math.max(0, 100 - inputs.riskScore * 4);

  // 3. Get previous KPI snapshot for delta computation
  let previousScore: number | null = null;
  const prevResult = await safeQuery(
    `SELECT compliance_score, risk_score, evidence_coverage, remediation_closure_rate
     FROM "${schema}".kpi_snapshots
     ORDER BY snapshot_date DESC
     OFFSET 1
     LIMIT 1`
  );

  if (prevResult.rows.length > 0) {
    const prevRow = getFirstRow(prevResult);
    const prevInputs: HealthInputs = {
      complianceScore: Number(prevRow.compliance_score) || 0,
      riskScore: Number(prevRow.risk_score) || 0,
      evidenceCoverage: Number(prevRow.evidence_coverage) || 0,
      remediationClosureRate: Number(prevRow.remediation_closure_rate) || 0,
    };
    previousScore = computeHealthScore(prevInputs);
  }

  const delta = computeHealthDelta(overallScore, previousScore);

  return {
    overallScore,
    zone,
    breakdown: {
      complianceScore: inputs.complianceScore,
      inverseRiskScore,
      evidenceCoverage: inputs.evidenceCoverage,
      remediationClosureRate: inputs.remediationClosureRate,
    },
    delta,
  };
}
