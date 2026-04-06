// @ts-nocheck
/**
 * Enterprise Resilient Catch Utility
 * ───────────────────────────────────
 * Drop-in replacements for silent `.catch(() => {})` patterns.
 * Routes errors through existing observability infrastructure:
 *   - Structured logging (logger)
 *   - Dead-letter queue (DLQ) after repeated failures
 *   - Alert creation when failure thresholds are crossed
 *   - Failure pattern recording for agent actions
 *
 * Zero behavioral change for callers — same return types,
 * same control flow. Purely additive observability.
 */

import { logger } from '../observability/logger.service';
import { toErrorMessage } from './http-error.util';

// ── Lazy imports to avoid circular dependencies ─────────────────────────
// These are loaded on first use, not at module init time.

let _addToDeadLetterQueue: typeof import('../../../langgraph/observability/dead-letter-queue.service').addToDeadLetterQueue | null = null;
let _createAlert: typeof import('../modules/ai/services/governance/compliance/ai-alert.service').createAlert | null = null;
let _recordFailure: typeof import('../../../langgraph/observability/failure-analyzer.service').recordFailure | null = null;

async function getAddToDeadLetterQueue() {
  if (!_addToDeadLetterQueue) {
    try {
      const mod = await import('../../../langgraph/observability/dead-letter-queue.service');
      _addToDeadLetterQueue = mod.addToDeadLetterQueue;
    } catch { /* dependency not available */ }
  }
  return _addToDeadLetterQueue;
}

async function getCreateAlert() {
  if (!_createAlert) {
    try {
      const mod = await import('../modules/ai/services/governance/compliance/ai-alert.service');
      _createAlert = mod.createAlert;
    } catch { /* dependency not available */ }
  }
  return _createAlert;
}

async function getRecordFailure() {
  if (!_recordFailure) {
    try {
      const mod = await import('../../../langgraph/observability/failure-analyzer.service');
      _recordFailure = mod.recordFailure;
    } catch { /* dependency not available */ }
  }
  return _recordFailure;
}

// ── Error Categories ────────────────────────────────────────────────────

export enum ErrorCategory {
  /** emitEvent, eventBus.publish — fire-and-forget event publishing */
  EVENT_BUS = 'EVENT_BUS',
  /** Agent actions: evaluateOutput, recordAgentPerformance, runAgent side-effects */
  AGENT_ACTION = 'AGENT_ACTION',
  /** RESET search_path, advisory locks, DDL cleanup */
  DB_CLEANUP = 'DB_CLEANUP',
  /** Redis publish, cache priming, descriptor cache */
  CACHE_OP = 'CACHE_OP',
  /** Queries that return a fallback value on failure */
  FALLBACK_QUERY = 'FALLBACK_QUERY',
}

/** Short alias for import ergonomics */
export const EC = ErrorCategory;

// ── Context ─────────────────────────────────────────────────────────────

export interface CatchContext {
  tenantId?: string;
  correlationId?: string;
  agentId?: string;
  /** Human-readable label, e.g. 'emitEvent:team.created' */
  operation?: string;
}

// ── Category Configuration ──────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface CategoryConfig {
  logLevel: LogLevel;
  /** Log level for the very first failure in a window (softer for noisy categories) */
  firstLogLevel?: LogLevel;
  /** Number of failures before DLQ enqueue. null = never DLQ */
  dlqAfter: number | null;
  /** Number of failures before alert creation. null = never alert */
  alertThreshold: number | null;
  /** Counter window in ms */
  windowMs: number;
}

const CATEGORY_CONFIG: Record<ErrorCategory, CategoryConfig> = {
  [ErrorCategory.EVENT_BUS]: {
    logLevel: 'warn',
    dlqAfter: 5,
    alertThreshold: 20,
    windowMs: 5 * 60_000,    // 5 min
  },
  [ErrorCategory.AGENT_ACTION]: {
    logLevel: 'warn',
    dlqAfter: 3,
    alertThreshold: 10,
    windowMs: 15 * 60_000,   // 15 min
  },
  [ErrorCategory.DB_CLEANUP]: {
    logLevel: 'warn',
    firstLogLevel: 'debug',
    dlqAfter: null,
    alertThreshold: 50,
    windowMs: 60 * 60_000,   // 60 min
  },
  [ErrorCategory.CACHE_OP]: {
    logLevel: 'debug',
    dlqAfter: null,
    alertThreshold: null,
    windowMs: 5 * 60_000,
  },
  [ErrorCategory.FALLBACK_QUERY]: {
    logLevel: 'warn',
    dlqAfter: null,
    alertThreshold: 30,
    windowMs: 15 * 60_000,
  },
};

// ── In-Memory Failure Counters ──────────────────────────────────────────

interface FailureWindow {
  count: number;
  windowStartMs: number;
  lastErrorMs: number;
  alertFired: boolean;
}

/** Key: `${ErrorCategory}:${tenantId || 'global'}` */
const failureCounters = new Map<string, FailureWindow>();

function getOrCreateWindow(key: string, windowMs: number): FailureWindow {
  const now = Date.now();
  let win = failureCounters.get(key);
  if (!win || now - win.windowStartMs > windowMs) {
    win = { count: 0, windowStartMs: now, lastErrorMs: now, alertFired: false };
    failureCounters.set(key, win);
  }
  return win;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Replaces `.catch(() => {})` — fire-and-forget with observability.
 * Returns void (promise result is discarded).
 */
export function swallow(
  category: ErrorCategory,
  promise: Promise<unknown>,
  context?: CatchContext,
): void {
  promise.catch((err: unknown) => {
    handleCaughtError(category, err, context);
  });
}

/**
 * Replaces `.catch(() => null)` — returns null on failure with observability.
 */
export function swallowNull<T>(
  category: ErrorCategory,
  promise: Promise<T>,
  context?: CatchContext,
): Promise<T | null> {
  return promise.catch((err: unknown) => {
    handleCaughtError(category, err, context);
    return null;
  });
}

/**
 * Replaces `.catch(() => [])` — returns empty array on failure with observability.
 */
export function swallowEmpty<T>(
  category: ErrorCategory,
  promise: Promise<T[]>,
  context?: CatchContext,
): Promise<T[]> {
  return promise.catch((err: unknown) => {
    handleCaughtError(category, err, context);
    return [] as T[];
  });
}

/**
 * Replaces `.catch(() => fallback)` — returns custom fallback on failure with observability.
 * Use for `.catch(() => ({ rows: [] }))`, `.catch(() => false)`, etc.
 */
export function swallowDefault<T>(
  category: ErrorCategory,
  fallback: T,
  promise: Promise<T>,
  context?: CatchContext,
): Promise<T> {
  return promise.catch((err: unknown) => {
    handleCaughtError(category, err, context);
    return fallback;
  });
}

/**
 * Wraps a synchronous block that may throw — logs instead of silently swallowing.
 * Rare; use for sync cleanup in finally blocks.
 */
export function swallowSync(
  category: ErrorCategory,
  fn: () => void,
  context?: CatchContext,
): void {
  try {
    fn();
  } catch (err) {
    handleCaughtError(category, err, context);
  }
}

/**
 * Returns a catch callback for direct use in `.catch()` chains.
 * Drop-in replacement: `.catch(() => {})` → `.catch(catchHandler(EC.EVENT_BUS, ctx))`
 * Useful for multi-line promise chains where `swallow()` wrapping is awkward.
 */
export function catchHandler(
  category: ErrorCategory,
  context?: CatchContext,
): (err: unknown) => void {
  return (err: unknown) => {
    handleCaughtError(category, err, context);
  };
}

/**
 * Expose in-memory counters for health/diagnostics endpoints.
 * Consumed by admin routes and anomaly detection.
 */
export function getResilientCatchStats(): Array<{
  category: string;
  tenantId: string;
  count: number;
  windowStartMs: number;
  lastErrorMs: number;
  alertFired: boolean;
}> {
  const result: Array<{
    category: string;
    tenantId: string;
    count: number;
    windowStartMs: number;
    lastErrorMs: number;
    alertFired: boolean;
  }> = [];
  for (const [key, win] of failureCounters.entries()) {
    const sepIdx = key.indexOf(':');
    const category = key.substring(0, sepIdx);
    const tenantId = key.substring(sepIdx + 1);
    if (win.count > 0) {
      result.push({
        category,
        tenantId,
        count: win.count,
        windowStartMs: win.windowStartMs,
        lastErrorMs: win.lastErrorMs,
        alertFired: win.alertFired,
      });
    }
  }
  return result;
}

/**
 * Reset all counters. Used in tests.
 */
export function resetResilientCatchCounters(): void {
  failureCounters.clear();
}

// ── Central Error Handler ───────────────────────────────────────────────

function handleCaughtError(
  category: ErrorCategory,
  err: unknown,
  context?: CatchContext,
): void {
  const config = CATEGORY_CONFIG[category];
  const tenantId = context?.tenantId || 'global';
  const counterKey = `${category}:${tenantId}`;
  const message = toErrorMessage(err);

  // 1. Increment in-memory counter
  const win = getOrCreateWindow(counterKey, config.windowMs);
  win.count++;
  win.lastErrorMs = Date.now();

  // 2. Structured log — softer level on first hit if configured
  const logLevel = win.count === 1 && config.firstLogLevel
    ? config.firstLogLevel
    : config.logLevel;

  logger[logLevel](`[ResilientCatch:${category}] ${context?.operation || 'any'}: ${message}`, {
    category,
    tenantId: context?.tenantId,
    correlationId: context?.correlationId,
    agentId: context?.agentId,
    operation: context?.operation,
    failureCount: win.count,
  });

  // 3. DLQ enqueue after threshold (EVENT_BUS and AGENT_ACTION)
  if (config.dlqAfter && win.count >= config.dlqAfter && context?.tenantId) {
    enqueueToDLQ(category, err, context).catch((dlqErr) => {
      logger.error('[ResilientCatch] DLQ enqueue failed', {
        category,
        tenantId: context.tenantId,
        dlqError: toErrorMessage(dlqErr),
      });
    });
  }

  // 4. Alert — fire exactly once per window when threshold crossed
  if (config.alertThreshold && win.count >= config.alertThreshold && !win.alertFired && context?.tenantId) {
    win.alertFired = true;
    fireAlert(category, win.count, context).catch((alertErr) => {
      logger.error('[ResilientCatch] Alert creation failed', {
        category,
        tenantId: context.tenantId,
        alertError: toErrorMessage(alertErr),
      });
    });
  }

  // 5. Failure pattern recording (AGENT_ACTION only)
  if (category === ErrorCategory.AGENT_ACTION && context?.tenantId && context.agentId) {
    // eslint-disable-next-line no-restricted-syntax -- intentional: prevent recursion in error handler
    recordFailurePattern(context.tenantId, context.agentId, message).catch(() => {});
  }
}

// ── Infrastructure Integrations ─────────────────────────────────────────

const DLQ_CATEGORY_MAP: Record<ErrorCategory, string> = {
  [ErrorCategory.EVENT_BUS]: 'error',
  [ErrorCategory.AGENT_ACTION]: 'error',
  [ErrorCategory.DB_CLEANUP]: 'other',
  [ErrorCategory.CACHE_OP]: 'other',
  [ErrorCategory.FALLBACK_QUERY]: 'other',
};

async function enqueueToDLQ(category: ErrorCategory, err: unknown, ctx: CatchContext): Promise<void> {
  const addToDLQ = await getAddToDeadLetterQueue();
  if (!addToDLQ) return;

  await addToDLQ({
    tenantId: ctx.tenantId!,
    agentId: ctx.agentId || `resilient-catch:${category.toLowerCase()}`,
    runId: ctx.correlationId || `rc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    graphType: 'resilient-catch',
    failureReason: `[${category}] ${ctx.operation || 'any'}`,
    failureCategory: DLQ_CATEGORY_MAP[category] as any,
    errorMessage: toErrorMessage(err),
    errorStack: err instanceof Error ? err.stack : undefined,
    retryCount: 0,
    maxRetries: 0,
    inputData: { category, operation: ctx.operation, correlationId: ctx.correlationId },
  });
}

async function fireAlert(category: ErrorCategory, count: number, ctx: CatchContext): Promise<void> {
  const createAlertFn = await getCreateAlert();
  if (!createAlertFn) return;

  await createAlertFn({
    tenantId: ctx.tenantId!,
    sourceType: 'agent',
    alertType: 'anomaly',
    title: `Elevated failure rate: ${category}`,
    description: `${count} failures in ${category} within monitoring window. Operation: ${ctx.operation || 'various'}. Tenant: ${ctx.tenantId}.`,
    severity: count > 50 ? 'critical' : 'warning',
  });
}

async function recordFailurePattern(tenantId: string, agentId: string, message: string): Promise<void> {
  const recordFailureFn = await getRecordFailure();
  if (!recordFailureFn) return;

  await recordFailureFn(tenantId, {
    agentId,
    toolsUsed: [],
    errorMessage: message,
    metadata: { source: 'resilient-catch' },
  });
}
