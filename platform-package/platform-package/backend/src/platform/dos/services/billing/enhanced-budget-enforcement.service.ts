// @ts-nocheck
// ============================================
// AGRC-OS — Enhanced Budget Enforcement
// Adds throttling for soft limits
// Requirements: ai-os-7.4
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { getBudgetStatus, BudgetStatus } from '../../../../modules/ai/services/gateway/llm-usage-tracker.service';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallow, swallowDefault, EC , catchHandler } from '../../../../utils/resilient-catch';

export interface ThrottleConfig {
  softLimitThrottlePct: number; // 0-100, percentage of requests to throttle
  throttleDelayMs: number; // delay to add when throttling
  maxThrottleDelayMs: number; // maximum delay
}

const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  softLimitThrottlePct: 50, // throttle 50% of requests at soft limit
  throttleDelayMs: 1000, // 1 second delay
  maxThrottleDelayMs: 5000, // max 5 seconds
};

/**
 * Check budget and apply throttling if needed
 */
export async function checkBudgetWithThrottling(
  tenantId: string,
  config: Partial<ThrottleConfig> = {}
): Promise<{ allowed: boolean; reason?: string; throttleDelayMs?: number }> {
  const cfg = { ...DEFAULT_THROTTLE_CONFIG, ...config };
  const status = await getBudgetStatus(tenantId);

  if (!status) {
    return { allowed: true };
  }

  // Hard limit - block or throttle based on action
  if (status.is_over_hard) {
    if (status.hard_limit_action === 'block') {
      return { allowed: false, reason: 'Monthly LLM budget exceeded (hard limit)' };
    }
    if (status.hard_limit_action === 'throttle') {
      // Aggressive throttling at hard limit
      return {
        allowed: true,
        reason: 'Budget exceeded — throttled mode',
        throttleDelayMs: cfg.maxThrottleDelayMs,
      };
    }
  }

  // Soft limit - apply progressive throttling
  if (status.is_over_soft) {
    const overSoftPct = Math.max(
      (status.tokens_pct - status.soft_limit_pct) / (100 - status.soft_limit_pct),
      0
    );

    // Calculate throttle delay based on how far over soft limit
    const throttleDelay = Math.min(
      cfg.throttleDelayMs + (overSoftPct * (cfg.maxThrottleDelayMs - cfg.throttleDelayMs)),
      cfg.maxThrottleDelayMs
    );

    // Randomly throttle based on percentage
    const shouldThrottle = Math.random() * 100 < cfg.softLimitThrottlePct;

    if (shouldThrottle) {
      // Send notification if not already sent
      await notifySoftLimit(tenantId, status).catch(catchHandler(EC.EVENT_BUS, {}));

      return {
        allowed: true,
        reason: `Soft budget limit reached (${Math.round(status.tokens_pct)}%) — throttling`,
        throttleDelayMs: Math.round(throttleDelay),
      };
    }
  }

  return { allowed: true };
}

/**
 * Notify about soft limit (once per period)
 */
async function notifySoftLimit(tenantId: string, status: BudgetStatus): Promise<void> {
  const schema = tenantSchema(tenantId);
  
  // Check if already notified this period
  const check = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT notified_soft FROM "${schema}".tenant_llm_budgets WHERE tenant_id = $1`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query tenant_llm_budgets' });

  if (check.rows.length > 0 && getFirstRow(check)?.notified_soft) {
    return; // Already notified
  }

  // Mark as notified
  await safeQuery(
    `UPDATE "${schema}".tenant_llm_budgets
     SET notified_soft = TRUE, updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId]
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  // Publish event
  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'ai.budget.soft_limit_reached' as any,
    tenantId,
    sourceService: 'enhanced-budget-enforcement',
    severity: 'warning',
    payload: {
      tokensPct: status.tokens_pct,
      costPct: status.cost_pct,
      softLimitPct: status.soft_limit_pct,
    },
  }), { tenantId, operation: 'eventBus:ai.budget.soft_limit_reached' });
}

/**
 * Apply throttling delay
 */
export async function applyThrottle(delayMs: number): Promise<void> {
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

/**
 * Get throttling statistics
 */
export async function getThrottlingStats(
  tenantId: string,
  daysBack: number = 7
): Promise<{
  totalRequests: number;
  throttledRequests: number;
  avgThrottleDelay: number;
  totalThrottleTime: number;
}> {
  const schema = tenantSchema(tenantId);
  
  try {
    const result = await safeQuery(
      `SELECT 
         COUNT(*)::int AS total_requests,
         COUNT(CASE WHEN throttle_delay_ms > 0 THEN 1 END)::int AS throttled_requests,
         AVG(throttle_delay_ms)::int AS avg_delay,
         SUM(throttle_delay_ms)::int AS total_delay
       FROM "${schema}".llm_throttle_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)`,
      [tenantId, daysBack]
    );

    if (result.rows.length > 0) {
      const row = getFirstRow(result);
      return {
        totalRequests: row.total_requests || 0,
        throttledRequests: row.throttled_requests || 0,
        avgThrottleDelay: row.avg_delay || 0,
        totalThrottleTime: row.total_delay || 0,
      };
    }
  } catch {
    // Non-fatal
  }

  return {
    totalRequests: 0,
    throttledRequests: 0,
    avgThrottleDelay: 0,
    totalThrottleTime: 0,
  };
}

/**
 * Log throttling event
 */
export async function logThrottle(
  tenantId: string,
  throttleDelayMs: number,
  reason: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".llm_throttle_log
     (tenant_id, throttle_delay_ms, reason, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [tenantId, throttleDelayMs, reason]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}
