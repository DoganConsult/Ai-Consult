// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
/**
 * Autonomy Review Service
 * Feature 19: Tenant Autonomy Level Auto-Progression
 * 
 * Computes metrics from shadow comparisons and HITL override rates,
 * evaluates progression thresholds, and creates recommendations for mode advancement.
 */
import { v4 as uuid } from 'uuid';
import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { computeComparisonMetrics  } from './shadow-validation.service';
import { getTenantPlatformMode, setTenantPlatformMode, type PlatformMode, validateModeTransition } from './platform-mode-gate.service';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

export interface AutonomyProgressionRecommendation {
  recommendationId: string;
  tenantId: string;
  currentMode: PlatformMode;
  recommendedMode: PlatformMode;
  reason: string;
  metrics: {
    avgEvalScore: number;
    hitlOverrideRate: number;
    falsePositiveRate: number;
  };
  passedThresholds: boolean;
  consecutivePassCycles: number;
}

/**
 * Review tenant autonomy metrics and create progression recommendations.
 * Called by autonomy-review job (monthly/quarterly).
 */
export async function reviewTenantAutonomy(
  tenantId: string,
  reviewCycle: Date = new Date(),
): Promise<AutonomyProgressionRecommendation | null> {
  const schema = tenantSchema(tenantId);
  const reviewCycleDate = reviewCycle.toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if already reviewed for this cycle
  const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".autonomy_progression_log
     WHERE tenant_id = $1 AND review_cycle = $2`,
    [tenantId, reviewCycleDate],
  ), { tenantId: tenantId, operation: 'query autonomy_progression_log' });

  if (existing.rows.length > 0) {
    // Already reviewed for this cycle
    const row = getFirstRow(existing);
    return {
      recommendationId: row.recommendation_id || '',
      tenantId,
      currentMode: row.current_mode as PlatformMode,
      recommendedMode: row.current_mode as PlatformMode, // No recommendation stored
      reason: 'Already reviewed for this cycle',
      metrics: {
        avgEvalScore: Number(row.avg_eval_score) || 0,
        hitlOverrideRate: Number(row.hitl_override_rate) || 0,
        falsePositiveRate: Number(row.false_positive_rate) || 0,
      },
      passedThresholds: row.passed_thresholds || false,
      consecutivePassCycles: row.consecutive_pass_cycles || 0,
    };
  }

  // Get current mode
  const currentMode = await getTenantPlatformMode(tenantId);

  // Compute metrics for the last 30 days (or review period)
  const periodEnd = reviewCycle.toISOString();
  const periodStart = new Date(reviewCycle.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Compute shadow comparison metrics
  const shadowMetricsRaw = await computeComparisonMetrics(tenantId, periodStart, periodEnd);
  const shadowMetrics = Array.isArray(shadowMetricsRaw) ? shadowMetricsRaw : [shadowMetricsRaw];

  // Average accuracy across all agents (avg_eval_score)
  const avgEvalScore = shadowMetrics.length > 0
    ? shadowMetrics.reduce((sum, m) => sum + m.accuracy, 0) / shadowMetrics.length
    : 0;

  // Average false positive rate
  const avgFalsePositiveRate = shadowMetrics.length > 0
    ? shadowMetrics.reduce((sum, m) => sum + m.falsePositiveRate, 0) / shadowMetrics.length
    : 0;

  // 2. Compute HITL override rate from agent_pending_actions
  const hitlStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ rejected_count: 0, approved_count: 0, total_count: 0 }]), safeQuery(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
       COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
       COUNT(*) AS total_count
     FROM "${schema}".agent_pending_actions
     WHERE created_at >= $1 AND created_at < $2`,
    [periodStart, periodEnd],
  ), { tenantId: tenantId, operation: 'query agent_pending_actions' });

  const rejectedCount = Number(getFirstRow(hitlStats)?.rejected_count) || 0;
  const __approvedCount = Number(getFirstRow(hitlStats)?.approved_count) || 0;
  const totalHitlActions = Number(getFirstRow(hitlStats)?.total_count) || 0;
  const hitlOverrideRate = totalHitlActions > 0 ? rejectedCount / totalHitlActions : 0;

  // 3. Get previous consecutive pass cycles
  const previousLogs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT consecutive_pass_cycles, passed_thresholds
     FROM "${schema}".autonomy_progression_log
     WHERE tenant_id = $1
     ORDER BY review_cycle DESC
     LIMIT 1`,
    [tenantId],
  ), { tenantId: tenantId, operation: 'query autonomy_progression_log' });

  const previousConsecutivePasses = getFirstRow(previousLogs)?.consecutive_pass_cycles || 0;
  const previousPassed = getFirstRow(previousLogs)?.passed_thresholds || false;

  // 4. Evaluate thresholds based on current mode
  const thresholds = getProgressionThresholds(currentMode);
  const passedThresholds = 
    avgEvalScore >= thresholds.minAccuracy &&
    hitlOverrideRate <= thresholds.maxHitlOverrideRate &&
    avgFalsePositiveRate <= thresholds.maxFalsePositiveRate;

  const consecutivePassCycles = passedThresholds
    ? (previousPassed ? previousConsecutivePasses + 1 : 1)
    : 0;

  // 5. Determine recommended mode
  const recommendedMode = determineRecommendedMode(
    currentMode,
    passedThresholds,
    consecutivePassCycles,
    avgEvalScore,
    hitlOverrideRate,
  );

  // 6. Generate recommendation reason
  const reason = generateRecommendationReason(
    currentMode,
    recommendedMode,
    passedThresholds,
    consecutivePassCycles,
    avgEvalScore,
    hitlOverrideRate,
    avgFalsePositiveRate,
  );

  // 7. Store log entry
  const recommendationId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".autonomy_progression_log
     (tenant_id, review_cycle, current_mode, avg_eval_score, hitl_override_rate,
      false_positive_rate, passed_thresholds, consecutive_pass_cycles, recommendation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      tenantId,
      reviewCycleDate,
      currentMode,
      avgEvalScore,
      hitlOverrideRate,
      avgFalsePositiveRate,
      passedThresholds,
      consecutivePassCycles,
      recommendationId,
    ],
  ).catch((err) => {
    logger.warn(`[AutonomyReview] Failed to log progression for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
  });

  return {
    recommendationId,
    tenantId,
    currentMode,
    recommendedMode,
    reason,
    metrics: {
      avgEvalScore,
      hitlOverrideRate,
      falsePositiveRate: avgFalsePositiveRate,
    },
    passedThresholds,
    consecutivePassCycles,
  };
}

/**
 * Get progression thresholds based on current mode.
 */
function getProgressionThresholds(mode: PlatformMode): {
  minAccuracy: number;
  maxHitlOverrideRate: number;
  maxFalsePositiveRate: number;
} {
  switch (mode) {
    case 'manual':
      // To progress to hybrid: need basic accuracy
      return { minAccuracy: 0.70, maxHitlOverrideRate: 0.50, maxFalsePositiveRate: 0.30 };
    case 'hybrid':
      // To progress to autonomous: need higher accuracy, lower override rate
      return { minAccuracy: 0.80, maxHitlOverrideRate: 0.30, maxFalsePositiveRate: 0.20 };
    case 'autonomous':
      // Already at maximum
      return { minAccuracy: 0.95, maxHitlOverrideRate: 0.05, maxFalsePositiveRate: 0.05 };
    default:
      return { minAccuracy: 0.70, maxHitlOverrideRate: 0.50, maxFalsePositiveRate: 0.30 };
  }
}

/**
 * Determine recommended mode based on metrics and consecutive passes.
 */
function determineRecommendedMode(
  currentMode: PlatformMode,
  passedThresholds: boolean,
  consecutivePassCycles: number,
  avgEvalScore: number,
  hitlOverrideRate: number,
): PlatformMode {
  if (!passedThresholds) {
    // If thresholds not met, recommend staying in current mode or regressing
    if (currentMode === 'autonomous' && (avgEvalScore < 0.85 || hitlOverrideRate > 0.15)) {
      return 'hybrid'; // Regress if performance degrades
    }
    if (currentMode === 'hybrid' && (avgEvalScore < 0.75 || hitlOverrideRate > 0.40)) {
      return 'manual'; // Regress if performance degrades
    }
    return currentMode; // Stay in current mode
  }

  // Thresholds passed - check if we can progress
  switch (currentMode) {
    case 'manual':
      // Need at least 2 consecutive passes to move to hybrid
      if (consecutivePassCycles >= 2) return 'hybrid';
      return currentMode;
    case 'hybrid':
      // Need at least 3 consecutive passes to move to autonomous
      if (consecutivePassCycles >= 3) return 'autonomous';
      return currentMode;
    case 'autonomous':
      return currentMode; // Already at maximum
    default:
      return currentMode;
  }
}

/**
 * Generate human-readable recommendation reason.
 */
function generateRecommendationReason(
  currentMode: PlatformMode,
  recommendedMode: PlatformMode,
  passedThresholds: boolean,
  consecutivePassCycles: number,
  avgEvalScore: number,
  hitlOverrideRate: number,
  falsePositiveRate: number,
): string {
  if (currentMode === recommendedMode) {
    if (!passedThresholds) {
      return `Thresholds not met. Accuracy: ${(avgEvalScore * 100).toFixed(1)}% (required: ${(getProgressionThresholds(currentMode).minAccuracy * 100).toFixed(0)}%), ` +
        `HITL override rate: ${(hitlOverrideRate * 100).toFixed(1)}% (max: ${(getProgressionThresholds(currentMode).maxHitlOverrideRate * 100).toFixed(0)}%), ` +
        `False positive rate: ${(falsePositiveRate * 100).toFixed(1)}% (max: ${(getProgressionThresholds(currentMode).maxFalsePositiveRate * 100).toFixed(0)}%). ` +
        `Maintain current mode: ${currentMode}.`;
    }
    return `Thresholds met (${consecutivePassCycles} consecutive cycle(s)), but need ${getRequiredConsecutivePasses(currentMode)} consecutive passes to progress. ` +
      `Continue monitoring. Current mode: ${currentMode}.`;
  }

  if (recommendedMode === 'manual' || recommendedMode === 'hybrid') {
    return `Performance degradation detected. Recommending regression to ${recommendedMode} mode. ` +
      `Accuracy: ${(avgEvalScore * 100).toFixed(1)}%, HITL override rate: ${(hitlOverrideRate * 100).toFixed(1)}%.`;
  }

  return `Progression recommended: ${currentMode} → ${recommendedMode}. ` +
    `Thresholds passed for ${consecutivePassCycles} consecutive cycle(s). ` +
    `Accuracy: ${(avgEvalScore * 100).toFixed(1)}%, HITL override rate: ${(hitlOverrideRate * 100).toFixed(1)}%, ` +
    `False positive rate: ${(falsePositiveRate * 100).toFixed(1)}%.`;
}

function getRequiredConsecutivePasses(mode: PlatformMode): number {
  switch (mode) {
    case 'manual': return 2;
    case 'hybrid': return 3;
    case 'autonomous': return 0;
    default: return 0;
  }
}

/**
 * Apply autonomy progression recommendation (if auto-apply is enabled).
 * This function can be called manually or automatically based on tenant settings.
 */
export async function applyAutonomyProgression(
  tenantId: string,
  recommendationId: string,
  setBy: string = 'system',
): Promise<{ success: boolean; newMode?: PlatformMode; reason?: string }> {
  const schema = tenantSchema(tenantId);

  // Get the recommendation
  const log = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".autonomy_progression_log
     WHERE tenant_id = $1 AND recommendation_id = $2`,
    [tenantId, recommendationId],
  ), { tenantId: tenantId, operation: 'query autonomy_progression_log' });

  if (log.rows.length === 0) {
    return { success: false, reason: 'Recommendation not found' };
  }

  const row = getFirstRow(log);
  const currentMode = row.current_mode as PlatformMode;
  const recommendedMode = determineRecommendedMode(
    currentMode,
    row.passed_thresholds,
    row.consecutive_pass_cycles,
    Number(row.avg_eval_score) || 0,
    Number(row.hitl_override_rate) || 0,
  );

  // Validate transition
  const transitionValid = validateModeTransition(currentMode, recommendedMode);
  if (!transitionValid) {
    return { success: false, reason: `Invalid transition from ${currentMode} to ${recommendedMode}` };
  }

  // Apply the mode change
  const modeResult = await setTenantPlatformMode(tenantId, recommendedMode, setBy);
  if (!modeResult.success) {
    return { success: false, reason: modeResult.error || 'Failed to set platform mode' };
  }
  return { success: true, newMode: recommendedMode };
}
