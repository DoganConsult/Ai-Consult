/**
 * Type-safe helpers for Promise.allSettled results.
 * Use instead of (result as Record<string, unknown>).value patterns.
 */

/** Type guard: result is fulfilled */
export function isFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

/** Type guard: result is rejected */
export function isRejected(
  result: PromiseSettledResult<unknown>
): result is PromiseRejectedResult {
  return result.status === "rejected";
}

/**
 * Extract fulfilled values from Promise.allSettled results.
 * Skips rejected promises.
 */
export function extractFulfilled<T>(
  results: readonly PromiseSettledResult<T>[]
): T[] {
  return results.filter(isFulfilled).map((r) => r.value);
}

/**
 * Get the first fulfilled value or undefined.
 */
export function getFirstFulfilled<T>(
  results: readonly PromiseSettledResult<T>[]
): T | undefined {
  const fulfilled = results.find(isFulfilled);
  return fulfilled ? fulfilled.value : undefined;
}

/**
 * Get the value from a single settled result, or throw if rejected.
 */
export function unwrapSettled<T>(result: PromiseSettledResult<T>): T {
  if (isFulfilled(result)) return result.value;
  throw result.reason;
}
