// @ts-nocheck
// ============================================
// AGRC-OS — Error Recovery Service
// Implements fallback strategies for agent failures
// Requirements: ai-os-6.3
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { recordAudit } from '../../../../modules/audit/services/audit/core/audit-trail.service';
import { swallow, EC , catchHandler } from '../../../../utils/resilient-catch';

export type ErrorCategory = 
  | 'llm_failure'
  | 'tool_failure'
  | 'timeout'
  | 'rate_limit'
  | 'budget_exceeded'
  | 'validation_failure'
  | 'network_error'
  | 'any';

export type RecoveryStrategy = 
  | 'retry_with_backoff'
  | 'fallback_to_rule_based'
  | 'delegate_to_human'
  | 'skip_action'
  | 'use_cached_result'
  | 'escalate_to_admin';

export interface ErrorRecoveryConfig {
  maxRetries: number;
  backoffMs: number;
  enableRuleBasedFallback: boolean;
  enableHumanDelegation: boolean;
  enableCaching: boolean;
  escalationThreshold: number; // consecutive failures before escalation
}

export interface RecoveryDecision {
  strategy: RecoveryStrategy;
  retryAfterMs?: number;
  reason: string;
  confidence: number;
}

export interface ErrorContext {
  tenantId: string;
  agentId?: string;
  runId?: string;
  actionType?: string;
  errorCategory: ErrorCategory;
  errorMessage: string;
  attemptCount: number;
  previousStrategies?: RecoveryStrategy[];
}

const DEFAULT_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  backoffMs: 2000,
  enableRuleBasedFallback: true,
  enableHumanDelegation: true,
  enableCaching: true,
  escalationThreshold: 5,
};

/**
 * Determine the best recovery strategy for an error
 */
export async function determineRecoveryStrategy(
  context: ErrorContext,
  config: Partial<ErrorRecoveryConfig> = {}
): Promise<RecoveryDecision> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { tenantId, _agentId, errorCategory, attemptCount, _previousStrategies = [] } = context;

  // Strategy 1: Retry with exponential backoff (for transient errors)
  if (attemptCount < cfg.maxRetries && (
    errorCategory === 'llm_failure' ||
    errorCategory === 'network_error' ||
    errorCategory === 'timeout'
  )) {
    const backoffMs = cfg.backoffMs * Math.pow(2, attemptCount);
    return {
      strategy: 'retry_with_backoff',
      retryAfterMs: backoffMs,
      reason: `Transient error detected, retrying with ${backoffMs}ms backoff`,
      confidence: 0.7,
    };
  }

  // Strategy 2: Use cached result (if available and error is non-critical)
  if (cfg.enableCaching && errorCategory === 'llm_failure' && attemptCount >= cfg.maxRetries) {
    try {
      const { _getCachedLLMResponse } = await import('../../../../modules/platform/ai/services/llm-cache.service');
      // Check if we have a cached result (would need message context, simplified here)
      return {
        strategy: 'use_cached_result',
        reason: 'LLM failure after retries, attempting cached result',
        confidence: 0.5,
      };
    } catch {
      // Cache service not available, continue to next strategy
    }
  }

  // Strategy 3: Fallback to rule-based logic
  if (cfg.enableRuleBasedFallback && (
    errorCategory === 'llm_failure' ||
    errorCategory === 'budget_exceeded' ||
    errorCategory === 'rate_limit'
  )) {
    return {
      strategy: 'fallback_to_rule_based',
      reason: 'AI unavailable, using rule-based fallback',
      confidence: 0.8,
    };
  }

  // Strategy 4: Delegate to human (for critical actions or after escalation threshold)
  if (cfg.enableHumanDelegation && (
    attemptCount >= cfg.escalationThreshold ||
    errorCategory === 'validation_failure' ||
    context.actionType?.includes('critical')
  )) {
    await recordRecoveryDecision(tenantId, {
      ...context,
      strategy: 'delegate_to_human',
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    return {
      strategy: 'delegate_to_human',
      reason: `Error threshold reached (${attemptCount} attempts) or critical action, delegating to human`,
      confidence: 0.9,
    };
  }

  // Strategy 5: Skip action (last resort for non-critical actions)
  if (context.actionType && !context.actionType.includes('critical')) {
    return {
      strategy: 'skip_action',
      reason: 'Non-critical action, skipping after all recovery attempts exhausted',
      confidence: 0.6,
    };
  }

  // Strategy 6: Escalate to admin (final fallback)
  return {
    strategy: 'escalate_to_admin',
    reason: 'All recovery strategies exhausted, escalating to administrator',
    confidence: 1.0,
  };
}

/**
 * Execute recovery strategy
 */
export async function executeRecovery(
  context: ErrorContext,
  decision: RecoveryDecision
): Promise<{ recovered: boolean; result?: unknown; error?: string }> {
  const { tenantId, agentId, runId } = context;

  try {
    switch (decision.strategy) {
      case 'retry_with_backoff':
        // Wait for backoff period
        if (decision.retryAfterMs) {
          await new Promise(resolve => setTimeout(resolve, decision.retryAfterMs));
        }
        return { recovered: true, result: { action: 'retry' } };

      case 'fallback_to_rule_based':
        // Trigger rule-based fallback (would call rule engine)
        await swallow(EC.EVENT_BUS, eventBus.publish({
          eventType: 'ai.recovery.rule_based_fallback' as any,
          tenantId,
          sourceService: 'error-recovery',
          severity: 'warning',
          payload: { agentId, runId, errorCategory: context.errorCategory },
        }), { tenantId, operation: 'eventBus:ai.recovery.rule_based_fallback' });
        return { recovered: true, result: { action: 'rule_based_fallback' } };

      case 'delegate_to_human':
        // Create human review task
        await createHumanReviewTask(tenantId, context).catch(catchHandler(EC.EVENT_BUS, {}));
        return { recovered: true, result: { action: 'human_review_created' } };

      case 'use_cached_result':
        // Would retrieve from cache (implementation depends on cache service)
        return { recovered: true, result: { action: 'cached_result' } };

      case 'skip_action':
        await recordAudit({
          tenantId,
          module: 'ai',
          action: 'action_skipped',
          entityType: 'agent_action',
          entityId: runId || '',
          details: { reason: decision.reason, context },
        } as any).catch(catchHandler(EC.EVENT_BUS, {}));
        return { recovered: true, result: { action: 'skipped' } };

      case 'escalate_to_admin':
        await escalateToAdmin(tenantId, context).catch(catchHandler(EC.EVENT_BUS, {}));
        return { recovered: false, error: 'Escalated to administrator' };

      default:
        return { recovered: false, error: 'Unknown recovery strategy' };
    }
  } catch (err: unknown) {
    return { recovered: false, error: toErrorMessage(err) };
  }
}

/**
 * Record recovery decision for audit
 */
async function recordRecoveryDecision(
  tenantId: string,
  context: ErrorContext & { strategy: RecoveryStrategy }
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".agent_error_recovery_log
     (tenant_id, agent_id, run_id, error_category, error_message, recovery_strategy, attempt_count, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      tenantId,
      context.agentId || null,
      context.runId || null,
      context.errorCategory,
      context.errorMessage,
      context.strategy,
      context.attemptCount,
    ]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}

/**
 * Create human review task for failed action
 */
async function createHumanReviewTask(
  tenantId: string,
  context: ErrorContext
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".agent_recovery_tasks
     (tenant_id, agent_id, run_id, error_category, error_message, action_type, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending_review', NOW())`,
    [
      tenantId,
      context.agentId || null,
      context.runId || null,
      context.errorCategory,
      context.errorMessage,
      context.actionType || 'any',
    ]
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'ai.recovery.human_review_required' as any,
    tenantId,
    sourceService: 'error-recovery',
    severity: 'warning',
    payload: { agentId: context.agentId, runId: context.runId, errorCategory: context.errorCategory },
  }), { tenantId, operation: 'eventBus:ai.recovery.human_review_required' });
}

/**
 * Escalate to administrator
 */
async function escalateToAdmin(
  tenantId: string,
  context: ErrorContext
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".agent_escalations
     (tenant_id, agent_id, run_id, error_category, error_message, escalation_level, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'admin', 'open', NOW())`,
    [
      tenantId,
      context.agentId || null,
      context.runId || null,
      context.errorCategory,
      context.errorMessage,
    ]
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'ai.recovery.admin_escalation' as any,
    tenantId,
    sourceService: 'error-recovery',
    severity: 'critical',
    payload: { agentId: context.agentId, runId: context.runId, errorCategory: context.errorCategory },
  }), { tenantId, operation: 'eventBus:ai.recovery.admin_escalation' });
}

/**
 * Get recovery statistics for an agent
 */
export async function getRecoveryStats(
  tenantId: string,
  agentId?: string,
  daysBack: number = 30
): Promise<{
  totalErrors: number;
  recovered: number;
  escalated: number;
  byCategory: Record<ErrorCategory, number>;
  byStrategy: Record<RecoveryStrategy, number>;
}> {
  const schema = tenantSchema(tenantId);
  const stats = {
    totalErrors: 0,
    recovered: 0,
    escalated: 0,
    byCategory: {} as Record<ErrorCategory, number>,
    byStrategy: {} as Record<RecoveryStrategy, number>,
  };

  try {
    const conditions: string[] = [`created_at > NOW() - INTERVAL '${daysBack} days'`];
    const params: unknown[] = [];
    let idx = 1;

    if (agentId) {
      conditions.push(`agent_id = $${idx++}`);
      params.push(agentId);
    }

    const result = await safeQuery(
      `SELECT error_category, recovery_strategy, COUNT(*)::int AS count
       FROM "${schema}".agent_error_recovery_log
       WHERE ${conditions.join(' AND ')}
       GROUP BY error_category, recovery_strategy`,
      params
    );

    for (const row of result.rows) {
      stats.totalErrors += row.count;
      if (row.recovery_strategy === 'escalate_to_admin') {
        stats.escalated += row.count;
      } else {
        stats.recovered += row.count;
      }
      stats.byCategory[row.error_category as ErrorCategory] = (stats.byCategory[row.error_category as ErrorCategory] || 0) + row.count;
      stats.byStrategy[row.recovery_strategy as RecoveryStrategy] = (stats.byStrategy[row.recovery_strategy as RecoveryStrategy] || 0) + row.count;
    }
  } catch {
    // Non-fatal
  }

  return stats;
}
