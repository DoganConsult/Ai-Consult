// ============================================
// Retry Utility with Exponential Backoff
// Handles transient failures gracefully
// ============================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'shouldRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelay = DEFAULT_OPTIONS.initialDelay,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    multiplier = DEFAULT_OPTIONS.multiplier,
    onRetry,
    shouldRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError, delay);
      }

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * multiplier, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with jitter (randomized delay to prevent thundering herd)
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const jitteredOptions: RetryOptions = {
    ...options,
    onRetry: (attempt, error, delay) => {
      // Add random jitter (±20%)
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      const jitteredDelay = Math.max(0, delay + jitter);
      
      if (options.onRetry) {
        options.onRetry(attempt, error, jitteredDelay);
      }
      
      return sleep(jitteredDelay);
    },
  };

  return retryWithBackoff(fn, jitteredOptions);
}

/**
 * Check if error is retryable (network, timeout, transient DB errors)
 */
export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /timeout/i,
    /deadlock/i,
    /serialization failure/i,
    /could not serialize/i,
    /connection.*closed/i,
    /temporary failure/i,
  ];

  return retryablePatterns.some(pattern => pattern.test((error instanceof Error ? error.message : String(error))));
}
