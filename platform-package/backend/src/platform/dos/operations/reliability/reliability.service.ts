import { logger } from '../../observability/logger.service';
import type {
  RetryPolicy,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitState,
  DeadLetterEntry,
} from '../contracts/operations.types';

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 30_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function calcDelay(policy: RetryPolicy, attempt: number): number {
  const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
  return Math.min(delay, policy.maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: Partial<RetryPolicy> = {},
  context?: { operationName?: string; correlationId?: string },
): Promise<T> {
  const p: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...policy };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= p.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const errMsg = (err as Error).message ?? '';
      if (p.retryableErrors && !p.retryableErrors.some((r) => errMsg.includes(r))) {
        throw err;
      }
      if (attempt < p.maxAttempts) {
        const delay = calcDelay(p, attempt);
        logger.warn(`[Reliability] Retry ${attempt}/${p.maxAttempts} after ${delay}ms`, {
          operation: context?.operationName,
          correlationId: context?.correlationId,
          error: errMsg,
        });
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

interface CircuitBreakerState {
  config: CircuitBreakerConfig;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: string;
  openedAt?: string;
  halfOpenCallsAllowed: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

export function registerCircuitBreaker(config: CircuitBreakerConfig): void {
  circuitBreakers.set(config.name, {
    config,
    state: 'closed',
    failureCount: 0,
    successCount: 0,
    halfOpenCallsAllowed: 0,
  });
}

export async function withCircuitBreaker<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const cb = circuitBreakers.get(name);
  if (!cb) return fn();

  const now = Date.now();

  if (cb.state === 'open') {
    const openedMs = cb.openedAt ? new Date(cb.openedAt).getTime() : 0;
    if (now - openedMs >= cb.config.openDurationMs) {
      cb.state = 'half-open';
      cb.halfOpenCallsAllowed = cb.config.halfOpenMaxCalls;
      logger.info(`[CircuitBreaker] ${name} → half-open`);
    } else {
      throw new Error(`Circuit breaker '${name}' is OPEN — calls rejected`);
    }
  }

  if (cb.state === 'half-open' && cb.halfOpenCallsAllowed <= 0) {
    throw new Error(`Circuit breaker '${name}' half-open call limit exceeded`);
  }

  if (cb.state === 'half-open') cb.halfOpenCallsAllowed--;

  try {
    const result = await fn();
    if (cb.state === 'half-open') {
      cb.successCount++;
      if (cb.successCount >= cb.config.successThreshold) {
        cb.state = 'closed';
        cb.failureCount = 0;
        cb.successCount = 0;
        logger.info(`[CircuitBreaker] ${name} → closed (recovered)`);
      }
    } else {
      cb.failureCount = 0;
    }
    return result;
  } catch (err) {
    cb.failureCount++;
    cb.lastFailureAt = new Date().toISOString();
    if (cb.state === 'half-open' || cb.failureCount >= cb.config.failureThreshold) {
      cb.state = 'open';
      cb.openedAt = new Date().toISOString();
      cb.successCount = 0;
      logger.warn(`[CircuitBreaker] ${name} → OPEN (failures: ${cb.failureCount})`);
    }
    throw err;
  }
}

export function getCircuitBreakerStatuses(): CircuitBreakerStatus[] {
  return Array.from(circuitBreakers.values()).map((cb) => ({
    name: cb.config.name,
    state: cb.state,
    failureCount: cb.failureCount,
    successCount: cb.successCount,
    lastFailureAt: cb.lastFailureAt,
    openedAt: cb.openedAt,
  }));
}

const deadLetterQueue: DeadLetterEntry[] = [];
const MAX_DLQ_ENTRIES = 1_000;

export function sendToDeadLetter(entry: Omit<DeadLetterEntry, 'lastFailedAt'>): void {
  const existing = deadLetterQueue.find((e) => e.id === entry.id);
  if (existing) {
    existing.attempts++;
    existing.lastFailedAt = new Date().toISOString();
    existing.errorMessage = entry.errorMessage;
    return;
  }
  const dlqEntry: DeadLetterEntry = { ...entry, lastFailedAt: new Date().toISOString() };
  deadLetterQueue.push(dlqEntry);
  if (deadLetterQueue.length > MAX_DLQ_ENTRIES) deadLetterQueue.shift();
  logger.warn('[DLQ] Entry added', { id: entry.id, source: entry.source, error: entry.errorMessage });
}

export function getDeadLetterEntries(source?: string): DeadLetterEntry[] {
  return source ? deadLetterQueue.filter((e) => e.source === source) : [...deadLetterQueue];
}

export function removeFromDeadLetter(id: string): boolean {
  const idx = deadLetterQueue.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  deadLetterQueue.splice(idx, 1);
  return true;
}

export function detectStuckInstances<T extends { id: string; startedAt: string; status: string }>(
  items: T[],
  runningStatus: string,
  stuckThresholdMs: number,
): T[] {
  const now = Date.now();
  return items.filter((item) => {
    if (item.status !== runningStatus) return false;
    const startedMs = new Date(item.startedAt).getTime();
    return now - startedMs > stuckThresholdMs;
  });
}

export const reliabilityService = {
  withRetry,
  withTimeout,
  withCircuitBreaker,
  registerCircuitBreaker,
  getCircuitBreakerStatuses,
  sendToDeadLetter,
  getDeadLetterEntries,
  removeFromDeadLetter,
  detectStuckInstances,
};
