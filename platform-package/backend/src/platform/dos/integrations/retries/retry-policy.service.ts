import { logger } from '../../observability/logger.service';

export type RetryStrategy = 'fixed' | 'exponential' | 'linear';

export interface RetryPolicy {
  policyCode: string;
  strategy: RetryStrategy;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes?: number[];
  retryableErrorCodes?: string[];
  jitterMs?: number;
}

export interface RetryState {
  attempt: number;
  lastAttemptAt: string;
  nextRetryAt: string | null;
  exhausted: boolean;
  lastError: string | null;
}

const policyRegistry = new Map<string, RetryPolicy>();

const defaultPolicy: RetryPolicy = {
  policyCode: 'default',
  strategy: 'exponential',
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterMs: 200,
};
policyRegistry.set('default', defaultPolicy);

export function registerRetryPolicy(policy: RetryPolicy): void {
  policyRegistry.set(policy.policyCode, policy);
  logger.info('[RetryPolicy] Policy registered', { policyCode: policy.policyCode });
}

export function getRetryPolicy(policyCode: string): RetryPolicy | null {
  return policyRegistry.get(policyCode) ?? null;
}

export function computeNextRetryDelay(policy: RetryPolicy, attempt: number): number {
  let delay: number;

  switch (policy.strategy) {
    case 'fixed':
      delay = policy.initialDelayMs;
      break;
    case 'linear':
      delay = policy.initialDelayMs * attempt;
      break;
    case 'exponential':
    default:
      delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
      break;
  }

  delay = Math.min(delay, policy.maxDelayMs);

  if (policy.jitterMs) {
    delay += Math.random() * policy.jitterMs;
  }

  return Math.floor(delay);
}

export function shouldRetry(
  policy: RetryPolicy,
  attempt: number,
  errorCode?: string,
  statusCode?: number,
): boolean {
  if (attempt >= policy.maxAttempts) return false;

  if (policy.retryableStatusCodes && statusCode !== undefined) {
    return policy.retryableStatusCodes.includes(statusCode);
  }

  if (policy.retryableErrorCodes && errorCode) {
    return policy.retryableErrorCodes.includes(errorCode);
  }

  return true;
}

export function buildRetryState(
  attempt: number,
  lastError: string | null,
  policy: RetryPolicy,
): RetryState {
  const now = new Date();
  const exhausted = attempt >= policy.maxAttempts;
  const nextDelayMs = exhausted ? null : computeNextRetryDelay(policy, attempt);
  const nextRetryAt = nextDelayMs !== null ? new Date(now.getTime() + nextDelayMs).toISOString() : null;

  return {
    attempt,
    lastAttemptAt: now.toISOString(),
    nextRetryAt,
    exhausted,
    lastError,
  };
}

export function isRetryableError(error: Error, policy: RetryPolicy): boolean {
  if (!policy.retryableErrorCodes?.length) return true;
  const code = (error as NodeJS.ErrnoException).code;
  if (code && policy.retryableErrorCodes.includes(code)) return true;
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  policyCode: string,
  context: { connectorCode: string; deliveryId?: string },
): Promise<T> {
  const policy = policyRegistry.get(policyCode) ?? defaultPolicy;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      const result = await fn();
      if (attempt > 1) {
        logger.info('[RetryPolicy] Succeeded after retry', { ...context, attempt });
      }
      return result;
    } catch (err) {
      const error = err as Error;
      const canRetry = shouldRetry(policy, attempt, (error as NodeJS.ErrnoException).code);

      logger.warn('[RetryPolicy] Attempt failed', {
        ...context,
        attempt,
        maxAttempts: policy.maxAttempts,
        error: error.message,
        willRetry: canRetry,
      });

      if (!canRetry) throw error;

      const delayMs = computeNextRetryDelay(policy, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
