/**
 * Shadow Validation Service
 *
 * Compares AI agent output against human output to measure agent reliability.
 * Used by the autonomy progression engine to decide if an agent can advance
 * from shadow mode to co-pilot or autonomous mode.
 */
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ShadowDivergence {
  taskId: string;
  agentOutput: string;
  humanOutput: string;
  similarity: number;
}

export interface ShadowComparisonMetrics {
  totalComparisons: number;
  matchRate: number;
  accuracy: number;
  falsePositiveRate: number;
  divergences: ShadowDivergence[];
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Compute comparison metrics for a specific agent (or all agents) within a
 * given time range. Queries the `agent_shadow_runs` table for completed
 * shadow validations and compares `agent_result` vs `human_result`.
 *
 * Overload 1 (route-level): tenantId, agentCode, timeRangeHours
 * Overload 2 (autonomy-review): tenantId, periodStart, periodEnd
 */
export async function computeComparisonMetrics(
  tenantId: string,
  agentCodeOrStart: string,
  timeRangeOrEnd?: number | string,
): Promise<ShadowComparisonMetrics | ShadowComparisonMetrics[]> {
  // Detect overload: if third arg is a number → route-level call (agent-specific)
  if (typeof timeRangeOrEnd === 'number' || timeRangeOrEnd === undefined) {
    return computeForAgent(tenantId, agentCodeOrStart, timeRangeOrEnd as number | undefined);
  }
  // Otherwise it's periodStart/periodEnd for all agents (autonomy review)
  return computeForAllAgents(tenantId, agentCodeOrStart, timeRangeOrEnd);
}

/* ------------------------------------------------------------------ */
/*  Agent-specific metrics                                            */
/* ------------------------------------------------------------------ */

async function computeForAgent(
  tenantId: string,
  agentCode: string,
  timeRangeHours?: number,
): Promise<ShadowComparisonMetrics> {
  const schema = tenantSchema(tenantId);
  const hours = timeRangeHours ?? 720; // default 30 days
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    const { rows } = await safeQuery(
      `SELECT
         id,
         task_id,
         agent_code,
         agent_result,
         human_result,
         match_flag,
         similarity_score,
         is_false_positive,
         completed_at
       FROM "${schema}".agent_shadow_runs
       WHERE agent_code = $1
         AND completed_at >= $2
         AND status = 'completed'
       ORDER BY completed_at DESC`,
      [agentCode, since],
    );

    return buildMetrics(rows);
  } catch (err) {
    logger.warn('[ShadowValidation] Failed to compute metrics for agent', {
      tenantId,
      agentCode,
      error: err instanceof Error ? err.message : String(err),
    });
    return emptyMetrics();
  }
}

/* ------------------------------------------------------------------ */
/*  All-agents metrics (for autonomy review)                          */
/* ------------------------------------------------------------------ */

async function computeForAllAgents(
  tenantId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ShadowComparisonMetrics[]> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT
         agent_code,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE match_flag = true) AS matched,
         COUNT(*) FILTER (WHERE is_false_positive = true) AS false_positives,
         AVG(similarity_score) AS avg_similarity
       FROM "${schema}".agent_shadow_runs
       WHERE completed_at >= $1
         AND completed_at < $2
         AND status = 'completed'
       GROUP BY agent_code`,
      [periodStart, periodEnd],
    );

    return rows.map((row: Record<string, unknown>) => {
      const total = Number(row.total) || 0;
      const matched = Number(row.matched) || 0;
      const fp = Number(row.false_positives) || 0;
      const avgSim = Number(row.avg_similarity) || 0;

      return {
        totalComparisons: total,
        matchRate: total > 0 ? matched / total : 0,
        accuracy: avgSim,
        falsePositiveRate: total > 0 ? fp / total : 0,
        divergences: [], // summary mode — no individual divergences
      };
    });
  } catch (err) {
    logger.warn('[ShadowValidation] Failed to compute all-agent metrics', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function buildMetrics(rows: Record<string, unknown>[]): ShadowComparisonMetrics {
  if (rows.length === 0) return emptyMetrics();

  const totalComparisons = rows.length;
  let matchCount = 0;
  let fpCount = 0;
  let totalSimilarity = 0;
  const divergences: ShadowDivergence[] = [];

  for (const row of rows) {
    const similarity = Number(row.similarity_score) ?? computeTextSimilarity(
      String(row.agent_result ?? ''),
      String(row.human_result ?? ''),
    );
    totalSimilarity += similarity;

    const isMatch = row.match_flag === true || similarity >= 0.85;
    if (isMatch) {
      matchCount++;
    } else {
      divergences.push({
        taskId: String(row.task_id ?? row.id ?? ''),
        agentOutput: truncate(String(row.agent_result ?? ''), 500),
        humanOutput: truncate(String(row.human_result ?? ''), 500),
        similarity: Math.round(similarity * 100) / 100,
      });
    }

    if (row.is_false_positive === true) fpCount++;
  }

  return {
    totalComparisons,
    matchRate: matchCount / totalComparisons,
    accuracy: totalSimilarity / totalComparisons,
    falsePositiveRate: fpCount / totalComparisons,
    divergences,
  };
}

/**
 * Basic text similarity using Jaccard coefficient on word-level tokens.
 * Used as fallback when no similarity_score is stored.
 */
function computeTextSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function emptyMetrics(): ShadowComparisonMetrics {
  return {
    totalComparisons: 0,
    matchRate: 0,
    accuracy: 0,
    falsePositiveRate: 0,
    divergences: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Shadow mode validation (validate without executing)               */
/* ------------------------------------------------------------------ */

/** Result of validating a decision in shadow mode. */
export interface ShadowValidationResult {
  validationId: string;
  agentId: string;
  decision: Record<string, unknown>;
  wouldExecute: boolean;
  riskAssessment: string;
  confidence: number;
  timestamp: string;
}

/**
 * Validate an agent's proposed decision without executing it.
 * Records the shadow validation in the execution log for later comparison.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param agentId - Agent code performing the decision
 * @param decision - The proposed decision to validate
 * @returns Shadow validation result with risk assessment
 */
export async function validateInShadowMode(
  tenantId: string,
  agentId: string,
  decision: Record<string, unknown>,
): Promise<ShadowValidationResult> {
  if (!tenantId) throw new Error('tenantId is required');
  if (!agentId) throw new Error('agentId is required');
  if (!decision) throw new Error('decision is required');

  const schema = tenantSchema(tenantId);

  // Assess risk based on decision type
  const actionType = String(decision.actionType || decision.action || 'unknown');
  const riskLevel = assessDecisionRisk(actionType);
  const wouldExecute = riskLevel !== 'high';
  const confidence = decision.confidence ? Number(decision.confidence) : 0.5;

  const result = await safeQuery(
    `INSERT INTO "${schema}".ai_execution_log
       (agent_id, action_type, decision_data, shadow_mode, risk_level,
        confidence_score, status, created_at)
     VALUES ($1, $2, $3, true, $4, $5, 'shadow_validated', NOW())
     RETURNING id, created_at`,
    [
      agentId,
      actionType,
      JSON.stringify(decision),
      riskLevel,
      confidence,
    ],
  );

  const row = result.rows[0] || {};

  logger.info('[ShadowValidation] Validated decision in shadow mode', {
    tenantId, agentId, actionType, riskLevel,
  });

  return {
    validationId: row.id || '',
    agentId,
    decision,
    wouldExecute,
    riskAssessment: riskLevel,
    confidence,
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Shadow log retrieval                                              */
/* ------------------------------------------------------------------ */

/** A single shadow log entry. */
export interface ShadowLogEntry {
  id: string;
  agentId: string;
  actionType: string;
  decisionData: Record<string, unknown>;
  riskLevel: string;
  confidenceScore: number;
  status: string;
  createdAt: string;
}

/**
 * Get shadow validation history for a specific agent.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param agentId - Agent code to query
 * @param limit - Maximum entries to return (default 50)
 * @returns Array of shadow log entries
 */
export async function getShadowLog(
  tenantId: string,
  agentId: string,
  limit = 50,
): Promise<ShadowLogEntry[]> {
  if (!tenantId) throw new Error('tenantId is required');
  if (!agentId) throw new Error('agentId is required');

  const schema = tenantSchema(tenantId);
  const safeLimit = Math.max(1, Math.min(limit, 500));

  try {
    const { rows } = await safeQuery(
      `SELECT id, agent_id, action_type, decision_data, risk_level,
              confidence_score, status, created_at
       FROM "${schema}".ai_execution_log
       WHERE agent_id = $1 AND shadow_mode = true
       ORDER BY created_at DESC
       LIMIT $2`,
      [agentId, safeLimit],
    );

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row.id || ''),
      agentId: String(row.agent_id || ''),
      actionType: String(row.action_type || ''),
      decisionData: parseJson(row.decision_data),
      riskLevel: String(row.risk_level || 'unknown'),
      confidenceScore: Number(row.confidence_score) || 0,
      status: String(row.status || ''),
      createdAt: row.created_at instanceof Date
        ? (row.created_at as Date).toISOString()
        : String(row.created_at || ''),
    }));
  } catch (err) {
    logger.warn('[ShadowValidation] Failed to get shadow log', {
      tenantId, agentId, error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Shadow vs. Live comparison                                        */
/* ------------------------------------------------------------------ */

/** Comparison of shadow vs live decisions. */
export interface ShadowVsLiveComparison {
  totalShadow: number;
  totalLive: number;
  agreementRate: number;
  shadowOnlyActions: number;
  liveOnlyActions: number;
  divergences: Array<{ actionType: string; shadowCount: number; liveCount: number }>;
}

/**
 * Compare shadow mode decisions against live decisions for a time range.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param agentId - Agent code to compare
 * @param timeRange - Start and end dates
 * @returns Comparison metrics between shadow and live decisions
 */
export async function compareShadowVsLive(
  tenantId: string,
  agentId: string,
  timeRange: { start: string; end: string },
): Promise<ShadowVsLiveComparison> {
  if (!tenantId) throw new Error('tenantId is required');
  if (!agentId) throw new Error('agentId is required');

  const schema = tenantSchema(tenantId);

  try {
    // Count shadow and live decisions by action type
    const { rows } = await safeQuery(
      `SELECT
         action_type,
         COUNT(*) FILTER (WHERE shadow_mode = true)::int AS shadow_count,
         COUNT(*) FILTER (WHERE shadow_mode = false OR shadow_mode IS NULL)::int AS live_count
       FROM "${schema}".ai_execution_log
       WHERE agent_id = $1
         AND created_at >= $2
         AND created_at <= $3
       GROUP BY action_type`,
      [agentId, timeRange.start, timeRange.end],
    );

    let totalShadow = 0;
    let totalLive = 0;
    let agreements = 0;
    const divergences: Array<{ actionType: string; shadowCount: number; liveCount: number }> = [];

    for (const row of rows) {
      const sc = Number(row.shadow_count) || 0;
      const lc = Number(row.live_count) || 0;
      totalShadow += sc;
      totalLive += lc;

      // If both shadow and live exist for same action type, count as agreement
      if (sc > 0 && lc > 0) {
        agreements += Math.min(sc, lc);
      }

      if (sc !== lc) {
        divergences.push({
          actionType: String(row.action_type),
          shadowCount: sc,
          liveCount: lc,
        });
      }
    }

    const totalComparable = Math.min(totalShadow, totalLive);
    const agreementRate = totalComparable > 0 ? agreements / totalComparable : 0;

    return {
      totalShadow,
      totalLive,
      agreementRate: Math.round(agreementRate * 100) / 100,
      shadowOnlyActions: Math.max(0, totalShadow - totalLive),
      liveOnlyActions: Math.max(0, totalLive - totalShadow),
      divergences,
    };
  } catch (err) {
    logger.warn('[ShadowValidation] Failed to compare shadow vs live', {
      tenantId, agentId, error: err instanceof Error ? err.message : String(err),
    });
    return { totalShadow: 0, totalLive: 0, agreementRate: 0, shadowOnlyActions: 0, liveOnlyActions: 0, divergences: [] };
  }
}

/* ------------------------------------------------------------------ */
/*  Accuracy metrics                                                  */
/* ------------------------------------------------------------------ */

/** Accuracy metrics for shadow mode decisions. */
export interface AccuracyMetrics {
  totalValidations: number;
  averageConfidence: number;
  riskDistribution: Record<string, number>;
  recentAccuracy: number;
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Get accuracy metrics for an agent's shadow mode performance.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param agentId - Agent code to measure
 * @returns Accuracy metrics and trend information
 */
export async function getAccuracyMetrics(
  tenantId: string,
  agentId: string,
): Promise<AccuracyMetrics> {
  if (!tenantId) throw new Error('tenantId is required');
  if (!agentId) throw new Error('agentId is required');

  const schema = tenantSchema(tenantId);

  try {
    // Aggregate shadow validation stats
    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         AVG(confidence_score)::numeric(5,4) AS avg_confidence,
         COUNT(*) FILTER (WHERE risk_level = 'low')::int AS low_risk,
         COUNT(*) FILTER (WHERE risk_level = 'medium')::int AS med_risk,
         COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high_risk
       FROM "${schema}".ai_execution_log
       WHERE agent_id = $1 AND shadow_mode = true`,
      [agentId],
    );

    const stats = rows[0] || {};
    const total = Number(stats.total) || 0;

    // Compute recent accuracy (last 30 days vs previous 30 days)
    const { rows: trendRows } = await safeQuery(
      `SELECT
         AVG(confidence_score) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::numeric(5,4) AS recent,
         AVG(confidence_score) FILTER (WHERE created_at < NOW() - INTERVAL '30 days' AND created_at >= NOW() - INTERVAL '60 days')::numeric(5,4) AS previous
       FROM "${schema}".ai_execution_log
       WHERE agent_id = $1 AND shadow_mode = true`,
      [agentId],
    );

    const recent = Number(trendRows[0]?.recent) || 0;
    const previous = Number(trendRows[0]?.previous) || 0;
    const trend = recent > previous + 0.05 ? 'improving' as const
      : recent < previous - 0.05 ? 'declining' as const
      : 'stable' as const;

    return {
      totalValidations: total,
      averageConfidence: Number(stats.avg_confidence) || 0,
      riskDistribution: {
        low: Number(stats.low_risk) || 0,
        medium: Number(stats.med_risk) || 0,
        high: Number(stats.high_risk) || 0,
      },
      recentAccuracy: recent,
      trend,
    };
  } catch (err) {
    logger.warn('[ShadowValidation] Failed to get accuracy metrics', {
      tenantId, agentId, error: err instanceof Error ? err.message : String(err),
    });
    return { totalValidations: 0, averageConfidence: 0, riskDistribution: {}, recentAccuracy: 0, trend: 'stable' };
  }
}

/* ------------------------------------------------------------------ */
/*  Additional helpers                                                */
/* ------------------------------------------------------------------ */

/** Assess risk level for a given action type. */
function assessDecisionRisk(actionType: string): string {
  const highRisk = ['delete', 'override', 'publish', 'approve', 'escalate', 'revoke'];
  const mediumRisk = ['create', 'update', 'assign', 'transfer', 'close'];
  if (highRisk.includes(actionType)) return 'high';
  if (mediumRisk.includes(actionType)) return 'medium';
  return 'low';
}

/** Parse JSON safely. */
function parseJson(val: unknown): Record<string, unknown> {
  if (typeof val === 'object' && val !== null) return val as Record<string, unknown>;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return {};
}
