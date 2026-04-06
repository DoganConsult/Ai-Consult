// Pure functions for Program Health Score computation
// Feature: premium-dashboard-overhaul, Task 8.1
// Requirements: 16.1, 16.2, 16.3, 16.4

export interface HealthInputs {
  complianceScore: number;        // 0-100
  riskScore: number;              // 0-25 (higher = worse)
  evidenceCoverage: number;       // 0-100
  remediationClosureRate: number; // 0-100
}

export interface ProgramHealthData {
  overallScore: number; // 0-100
  zone: 'red' | 'amber' | 'green';
  breakdown: {
    complianceScore: number;
    inverseRiskScore: number;
    evidenceCoverage: number;
    remediationClosureRate: number;
  };
  delta: {
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
  } | null;
}

/**
 * Computes composite health score (0-100).
 * Weights: compliance 30%, inverse risk 25%, evidence 25%, remediation 20%.
 * Risk is inverted: inverseRisk = max(0, 100 - riskScore * 4).
 *
 * Validates: Requirements 16.1
 */
export function computeHealthScore(inputs: HealthInputs): number {
  const inverseRisk = Math.max(0, 100 - inputs.riskScore * 4);
  const raw =
    inputs.complianceScore * 0.3 +
    inverseRisk * 0.25 +
    inputs.evidenceCoverage * 0.25 +
    inputs.remediationClosureRate * 0.2;
  return Math.round(raw * 100) / 100;
}

/**
 * Returns the color zone for a health score.
 * red: 0-40, amber: 41-70, green: 71-100
 *
 * Validates: Requirements 16.2
 */
export function healthScoreZone(score: number): 'red' | 'amber' | 'green' {
  if (score <= 40) return 'red';
  if (score <= 70) return 'amber';
  return 'green';
}

/**
 * Computes delta between current and previous health scores.
 * Returns null if |current - previous| <= 5 (not significant).
 * Returns direction and magnitude if change > 5 points.
 *
 * Validates: Requirements 16.3
 */
export function computeHealthDelta(
  currentScore: number,
  previousScore: number | null
): ProgramHealthData['delta'] {
  if (previousScore === null) return null;
  const diff = currentScore - previousScore;
  const magnitude = Math.abs(diff);
  if (magnitude <= 5) return null;
  return {
    direction: diff > 0 ? 'up' : 'down',
    magnitude: Math.round(magnitude * 100) / 100,
  };
}
