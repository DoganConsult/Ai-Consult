/**
 * Telemetry Aggregator Service
 * @owner DOS
 *
 * Aggregates platform-wide telemetry for the ops dashboard:
 *   - API response times (from request_logs / audit_trail)
 *   - Error rates (HTTP 4xx/5xx counts)
 *   - Job execution stats (from job_execution_log)
 *   - Summary metrics over configurable time windows
 *
 * Reads from public-schema tables (platform-level telemetry).
 */

import { safeQuery } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/services/logger.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponseTimeStats {
  endpoint: string;
  method: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  requestCount: number;
}

export interface ErrorRateStats {
  totalRequests: number;
  errorCount4xx: number;
  errorCount5xx: number;
  errorRate4xx: number;
  errorRate5xx: number;
  combinedErrorRate: number;
  topErrors: Array<{
    statusCode: number;
    endpoint: string;
    count: number;
  }>;
}

export interface JobExecutionStats {
  jobName: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number;
  maxDurationMs: number;
  lastRunAt: string | null;
}

export interface TelemetrySummary {
  collectedAt: string;
  windowMinutes: number;
  apiResponseTimes: ApiResponseTimeStats[];
  errorRates: ErrorRateStats;
  jobStats: JobExecutionStats[];
  health: PlatformHealthIndicator;
}

export interface PlatformHealthIndicator {
  status: 'healthy' | 'degraded' | 'critical';
  apiHealthy: boolean;
  jobsHealthy: boolean;
  reasons: string[];
}

export type TelemetrySignal = {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
};

// ── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_MINUTES = 60;
const ERROR_RATE_DEGRADED_THRESHOLD = 0.05;
const ERROR_RATE_CRITICAL_THRESHOLD = 0.15;
const JOB_FAILURE_DEGRADED_THRESHOLD = 0.10;
const JOB_FAILURE_CRITICAL_THRESHOLD = 0.30;

// ── Core Service ─────────────────────────────────────────────────────────────

/**
 * Collect aggregated telemetry signals for the ops dashboard.
 * Reads from public schema (platform-level data).
 */
export async function getSignals(
  windowMinutes: number = DEFAULT_WINDOW_MINUTES,
): Promise<TelemetrySummary> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const [apiResponseTimes, errorRates, jobStats] = await Promise.all([
    collectApiResponseTimes(since),
    collectErrorRates(since),
    collectJobStats(since),
  ]);

  const health = assessPlatformHealth(errorRates, jobStats);

  logger.info(
    `[Telemetry] Aggregated: ${apiResponseTimes.length} endpoints, ` +
    `errorRate=${(errorRates.combinedErrorRate * 100).toFixed(2)}%, ` +
    `${jobStats.length} job types, health=${health.status}`,
  );

  return {
    collectedAt: new Date().toISOString(),
    windowMinutes,
    apiResponseTimes,
    errorRates,
    jobStats,
    health,
  };
}

// ── API Response Times ───────────────────────────────────────────────────────

async function collectApiResponseTimes(since: string): Promise<ApiResponseTimeStats[]> {
  try {
    const result = await safeQuery(
      `SELECT
         endpoint,
         method,
         COUNT(*)::int AS request_count,
         ROUND(AVG(duration_ms)::numeric, 2) AS avg_ms,
         PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
         PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms
       FROM public.request_logs
       WHERE created_at >= $1
         AND duration_ms IS NOT NULL
       GROUP BY endpoint, method
       ORDER BY request_count DESC
       LIMIT 50`,
      [since],
    );

    return (result.rows ?? []).map((r: any) => ({
      endpoint: r.endpoint,
      method: r.method,
      p50Ms: Math.round(Number(r.p50_ms ?? 0)),
      p95Ms: Math.round(Number(r.p95_ms ?? 0)),
      p99Ms: Math.round(Number(r.p99_ms ?? 0)),
      avgMs: Number(r.avg_ms ?? 0),
      requestCount: Number(r.request_count),
    }));
  } catch (err: any) {
    logger.warn(`[Telemetry] request_logs query failed (table may not exist): ${err.message}`);
    return [];
  }
}

// ── Error Rates ──────────────────────────────────────────────────────────────

async function collectErrorRates(since: string): Promise<ErrorRateStats> {
  try {
    const totalsResult = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::int AS err_4xx,
         COUNT(*) FILTER (WHERE status_code >= 500)::int AS err_5xx
       FROM public.request_logs
       WHERE created_at >= $1`,
      [since],
    );

    const row = totalsResult.rows?.[0];
    const total = Number(row?.total ?? 0);
    const err4xx = Number(row?.err_4xx ?? 0);
    const err5xx = Number(row?.err_5xx ?? 0);

    const topErrorsResult = await safeQuery(
      `SELECT status_code, endpoint, COUNT(*)::int AS cnt
       FROM public.request_logs
       WHERE created_at >= $1
         AND status_code >= 400
       GROUP BY status_code, endpoint
       ORDER BY cnt DESC
       LIMIT 10`,
      [since],
    );

    return {
      totalRequests: total,
      errorCount4xx: err4xx,
      errorCount5xx: err5xx,
      errorRate4xx: total > 0 ? Math.round((err4xx / total) * 10000) / 10000 : 0,
      errorRate5xx: total > 0 ? Math.round((err5xx / total) * 10000) / 10000 : 0,
      combinedErrorRate: total > 0 ? Math.round(((err4xx + err5xx) / total) * 10000) / 10000 : 0,
      topErrors: (topErrorsResult.rows ?? []).map((r: any) => ({
        statusCode: Number(r.status_code),
        endpoint: r.endpoint,
        count: Number(r.cnt),
      })),
    };
  } catch (err: any) {
    logger.warn(`[Telemetry] error-rate query failed: ${err.message}`);
    return {
      totalRequests: 0,
      errorCount4xx: 0,
      errorCount5xx: 0,
      errorRate4xx: 0,
      errorRate5xx: 0,
      combinedErrorRate: 0,
      topErrors: [],
    };
  }
}

// ── Job Execution Stats ──────────────────────────────────────────────────────

async function collectJobStats(since: string): Promise<JobExecutionStats[]> {
  try {
    const result = await safeQuery(
      `SELECT
         job_name,
         COUNT(*)::int AS total_runs,
         COUNT(*) FILTER (WHERE status = 'success')::int AS success_count,
         COUNT(*) FILTER (WHERE status = 'failure')::int AS failure_count,
         ROUND(AVG(duration_ms)::numeric, 2) AS avg_duration_ms,
         MAX(duration_ms)::int AS max_duration_ms,
         MAX(completed_at) AS last_run_at
       FROM public.job_execution_log
       WHERE started_at >= $1
       GROUP BY job_name
       ORDER BY total_runs DESC`,
      [since],
    );

    return (result.rows ?? []).map((r: any) => {
      const total = Number(r.total_runs);
      const success = Number(r.success_count);
      return {
        jobName: r.job_name,
        totalRuns: total,
        successCount: success,
        failureCount: Number(r.failure_count),
        successRate: total > 0 ? Math.round((success / total) * 10000) / 10000 : 0,
        avgDurationMs: Number(r.avg_duration_ms ?? 0),
        maxDurationMs: Number(r.max_duration_ms ?? 0),
        lastRunAt: r.last_run_at ? new Date(r.last_run_at).toISOString() : null,
      };
    });
  } catch (err: any) {
    logger.warn(`[Telemetry] job_execution_log query failed: ${err.message}`);
    return [];
  }
}

// ── Health Assessment ────────────────────────────────────────────────────────

function assessPlatformHealth(
  errorRates: ErrorRateStats,
  jobStats: JobExecutionStats[],
): PlatformHealthIndicator {
  const reasons: string[] = [];
  let apiHealthy = true;
  let jobsHealthy = true;

  // API health
  if (errorRates.combinedErrorRate >= ERROR_RATE_CRITICAL_THRESHOLD) {
    apiHealthy = false;
    reasons.push(`API error rate critical: ${(errorRates.combinedErrorRate * 100).toFixed(1)}%`);
  } else if (errorRates.combinedErrorRate >= ERROR_RATE_DEGRADED_THRESHOLD) {
    reasons.push(`API error rate elevated: ${(errorRates.combinedErrorRate * 100).toFixed(1)}%`);
  }

  // Job health
  const failedJobs = jobStats.filter(j => j.totalRuns > 0 && (1 - j.successRate) >= JOB_FAILURE_CRITICAL_THRESHOLD);
  const degradedJobs = jobStats.filter(j => j.totalRuns > 0 && (1 - j.successRate) >= JOB_FAILURE_DEGRADED_THRESHOLD);

  if (failedJobs.length > 0) {
    jobsHealthy = false;
    reasons.push(`${failedJobs.length} job type(s) with critical failure rate: ${failedJobs.map(j => j.jobName).join(', ')}`);
  } else if (degradedJobs.length > 0) {
    reasons.push(`${degradedJobs.length} job type(s) with elevated failure rate`);
  }

  let status: PlatformHealthIndicator['status'] = 'healthy';
  if (!apiHealthy || !jobsHealthy) {
    status = 'critical';
  } else if (reasons.length > 0) {
    status = 'degraded';
  }

  return { status, apiHealthy, jobsHealthy, reasons };
}
