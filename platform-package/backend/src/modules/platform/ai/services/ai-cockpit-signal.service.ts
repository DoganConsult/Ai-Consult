/**
 * AI Cockpit Signal Service — Module-Platform Bridge
 *
 * Aggregates AI signals for the GRC cockpit dashboard: model confidence,
 * task completion rates, anomaly counts, and agent health metrics.
 *
 * Re-exports the canonical functions from modules/ai/services/cockpit/ and
 * adds platform-level aggregation (cross-agent, cross-module signal rollup).
 *
 * @owner AI-Agent
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ── Re-export canonical cockpit signal functions ─────────────────────────────
export {
  recordSignal,
  getSignalHistory,
  getLatestSignals,
  getSignalStats,
  getSignalTrend,
  getAggregatedDashboard,
  recordAgentHealthSignals,
  type CockpitSignal,
} from '../../../ai/services/cockpit/ai-cockpit-signal.service';

// ── Prune operations ─────────────────────────────────────────────────────────

/**
 * Prune old signals beyond the retention window.
 * Returns number of deleted rows.
 */
export async function pruneSignals(tenantId: string, retentionDays: number = 90): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `DELETE FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1 AND recorded_at < NOW() - ($2 || ' days')::interval
       RETURNING signal_id`,
      [tenantId, retentionDays],
    );
    const pruned = result.rows?.length || 0;
    if (pruned > 0) {
      logger.info(`[ai-cockpit-signal] Pruned ${pruned} signals older than ${retentionDays}d for tenant ${tenantId}`);
    }
    return pruned;
  } catch (err) {
    logger.warn(`[ai-cockpit-signal] pruneSignals failed for tenant ${tenantId}: ${err}`);
    return 0;
  }
}

/**
 * Prune old decision records beyond the retention window.
 * Returns number of deleted rows.
 */
export async function pruneDecisions(tenantId: string, retentionDays: number = 180): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `DELETE FROM "${schema}".decision_record
       WHERE tenant_id = $1 AND created_at < NOW() - ($2 || ' days')::interval
       RETURNING decision_id`,
      [tenantId, retentionDays],
    );
    const pruned = result.rows?.length || 0;
    if (pruned > 0) {
      logger.info(`[ai-cockpit-signal] Pruned ${pruned} decisions older than ${retentionDays}d for tenant ${tenantId}`);
    }
    return pruned;
  } catch (err) {
    logger.warn(`[ai-cockpit-signal] pruneDecisions failed for tenant ${tenantId}: ${err}`);
    return 0;
  }
}

// ── Platform-level aggregation (cross-agent rollup) ──────────────────────────

export interface ModelConfidenceSnapshot {
  modelId: string;
  avgConfidence: number;
  sampleCount: number;
  minConfidence: number;
  maxConfidence: number;
}

/**
 * Aggregate model confidence scores across all AI signals for a tenant.
 * Reads from cockpit_signal where signal_code starts with 'model.confidence'.
 */
export async function getModelConfidenceSummary(
  tenantId: string,
  windowHours: number = 24,
): Promise<ModelConfidenceSnapshot[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         SPLIT_PART(signal_code, '.', 2) AS model_id,
         AVG(signal_value)::numeric(5,3)  AS avg_confidence,
         COUNT(*)::int                     AS sample_count,
         MIN(signal_value)::numeric(5,3)   AS min_confidence,
         MAX(signal_value)::numeric(5,3)   AS max_confidence
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1
         AND signal_code LIKE 'model.confidence.%'
         AND recorded_at > NOW() - ($2 || ' hours')::interval
       GROUP BY SPLIT_PART(signal_code, '.', 2)
       ORDER BY avg_confidence ASC`,
      [tenantId, windowHours],
    );
    return result.rows.map((r: Record<string, any>) => ({
      modelId: r.model_id,
      avgConfidence: parseFloat(r.avg_confidence || '0'),
      sampleCount: r.sample_count,
      minConfidence: parseFloat(r.min_confidence || '0'),
      maxConfidence: parseFloat(r.max_confidence || '0'),
    }));
  } catch {
    return [];
  }
}

export interface TaskCompletionRateSnapshot {
  agentId: string;
  completed: number;
  failed: number;
  pending: number;
  completionRate: number;
}

/**
 * Aggregate task completion rates across agents for the cockpit dashboard.
 */
export async function getTaskCompletionRates(
  tenantId: string,
  windowHours: number = 24,
): Promise<TaskCompletionRateSnapshot[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         SPLIT_PART(signal_code, '.', 2) AS agent_id,
         SUM(CASE WHEN signal_code LIKE '%.completed_%' THEN signal_value ELSE 0 END)::int AS completed,
         SUM(CASE WHEN signal_code LIKE '%.errors_%' THEN signal_value ELSE 0 END)::int AS failed,
         SUM(CASE WHEN signal_code LIKE '%.runs_%' THEN signal_value ELSE 0 END)::int AS total
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1
         AND signal_code LIKE 'agent.%.%'
         AND signal_type = 'metric'
         AND recorded_at > NOW() - ($2 || ' hours')::interval
       GROUP BY SPLIT_PART(signal_code, '.', 2)`,
      [tenantId, windowHours],
    );
    return result.rows.map((r: Record<string, any>) => {
      const completed = r.completed || 0;
      const failed = r.failed || 0;
      const total = r.total || 0;
      const pending = Math.max(0, total - completed - failed);
      return {
        agentId: r.agent_id,
        completed,
        failed,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  } catch {
    return [];
  }
}

export interface AnomalyCount {
  signalCode: string;
  severity: string;
  count: number;
  latestAt: string;
}

/**
 * Count anomaly signals (severity warning/critical) in the given window.
 */
export async function getAnomalyCounts(
  tenantId: string,
  windowHours: number = 24,
): Promise<AnomalyCount[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT signal_code, severity, COUNT(*)::int AS cnt,
              MAX(recorded_at) AS latest_at
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1
         AND severity IN ('warning', 'critical')
         AND recorded_at > NOW() - ($2 || ' hours')::interval
       GROUP BY signal_code, severity
       ORDER BY cnt DESC
       LIMIT 100`,
      [tenantId, windowHours],
    );
    return result.rows.map((r: Record<string, any>) => ({
      signalCode: r.signal_code,
      severity: r.severity,
      count: r.cnt,
      latestAt: r.latest_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Get the full cockpit summary — combines confidence, completion, anomalies.
 */
export async function getCockpitSummary(tenantId: string, windowHours: number = 24): Promise<{
  modelConfidence: ModelConfidenceSnapshot[];
  taskCompletionRates: TaskCompletionRateSnapshot[];
  anomalies: AnomalyCount[];
  totalAnomalies: number;
  overallHealthScore: number;
}> {
  const [modelConfidence, taskCompletionRates, anomalies] = await Promise.all([
    getModelConfidenceSummary(tenantId, windowHours),
    getTaskCompletionRates(tenantId, windowHours),
    getAnomalyCounts(tenantId, windowHours),
  ]);

  const totalAnomalies = anomalies.reduce((sum, a) => sum + a.count, 0);
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').reduce((sum, a) => sum + a.count, 0);

  // Health score: 100 baseline, -5 per anomaly, -15 per critical anomaly, clamped to 0
  const overallHealthScore = Math.max(0, Math.min(100,
    100 - (totalAnomalies * 5) - (criticalAnomalies * 10),
  ));

  return { modelConfidence, taskCompletionRates, anomalies, totalAnomalies, overallHealthScore };
}
