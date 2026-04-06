// ============================================
// Percentile Calculation Utility
// Calculates percentiles (p50, p95, p99) from arrays of numbers
// ============================================

/**
 * Calculate a percentile from a sorted array of numbers
 * @param values Sorted array of numbers (ascending)
 * @param percentile Percentile to calculate (0-100)
 * @returns The percentile value
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  // Sort if not already sorted
  const sorted = [...values].sort((a, b) => a - b);
  
  // Calculate index
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  // Linear interpolation
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

/**
 * Calculate multiple percentiles at once
 * @param values Array of numbers (will be sorted)
 * @param percentiles Array of percentile values (0-100)
 * @returns Object with percentile values
 */
export function calculatePercentiles(
  values: number[],
  percentiles: number[] = [50, 95, 99],
): Record<string, number> {
  if (values.length === 0) {
    return percentiles.reduce((acc, p) => {
      acc[`p${p}`] = 0;
      return acc;
    }, {} as Record<string, number>);
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<string, number> = {};
  
  for (const p of percentiles) {
    result[`p${p}`] = Math.round(calculatePercentile(sorted, p));
  }
  
  return result;
}

/**
 * Calculate throughput (requests per second) from duration and count
 * @param durationMs Total duration in milliseconds
 * @param count Number of requests/operations
 * @returns Throughput in requests per second
 */
export function calculateThroughput(durationMs: number, count: number): number {
  if (durationMs <= 0 || count <= 0) return 0;
  const durationSeconds = durationMs / 1000;
  return Math.round((count / durationSeconds) * 100) / 100; // Round to 2 decimal places
}
