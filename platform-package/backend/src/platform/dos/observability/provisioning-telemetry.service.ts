// Provisioning Telemetry Service
// Records and queries provisioning-specific telemetry: step timing, failures,
// performance metrics, and aggregate reporting.

import { query, safeQuery } from '../../../config/database';
import { logger } from './logger.service';

export interface DateRange {
  from: string;
  to: string;
}

export interface ProvisioningRun {
  tenantId: string;
  runId: string;
  totalSteps: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  totalDurationMs: number | null;
}

export interface ProvisioningStepRecord {
  runId: string;
  stepCode: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
}

export interface ProvisioningTelemetry {
  run: ProvisioningRun;
  steps: ProvisioningStepRecord[];
  completedSteps: number;
  failedSteps: number;
}

export interface PerformanceMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  avgStepDurationMs: number;
  stepFailureRate: number;
}

export interface SlowStep {
  stepCode: string;
  avgDurationMs: number;
  maxDurationMs: number;
  occurrences: number;
  failureCount: number;
}

export interface TelemetryReport {
  dateRange: DateRange;
  generatedAt: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgRunDurationMs: number;
  stepBreakdown: Array<{
    stepCode: string;
    totalExecutions: number;
    avgDurationMs: number;
    failureCount: number;
    failureRate: number;
  }>;
}

const RUNS_TABLE = 'provisioning_telemetry_runs';
const STEPS_TABLE = 'provisioning_telemetry_steps';

/**
 * Record the start of a provisioning run.
 */
export async function recordProvisioningStart(
  tenantId: string,
  runId: string,
  totalSteps: number,
): Promise<void> {
  try {
    await query(
      `INSERT INTO ${RUNS_TABLE}
         (run_id, tenant_id, total_steps, status, started_at)
       VALUES ($1, $2, $3, 'running', NOW())`,
      [runId, tenantId, totalSteps],
    );

    logger.info(`[ProvisioningTelemetry] Run started run="${runId}" tenant="${tenantId}" steps=${totalSteps}`);
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to record run start run="${runId}": ${(err as Error).message}`);
  }
}

/**
 * Record the start of an individual provisioning step.
 */
export async function recordStepStart(
  tenantId: string,
  runId: string,
  stepCode: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO ${STEPS_TABLE}
         (run_id, tenant_id, step_code, status, started_at)
       VALUES ($1, $2, $3, 'running', NOW())`,
      [runId, tenantId, stepCode],
    );

    logger.info(`[ProvisioningTelemetry] Step started run="${runId}" step="${stepCode}"`);
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to record step start run="${runId}" step="${stepCode}": ${(err as Error).message}`);
  }
}

/**
 * Record the successful completion of a provisioning step.
 */
export async function recordStepComplete(
  _tenantId: string,
  runId: string,
  stepCode: string,
  durationMs: number,
): Promise<void> {
  try {
    await query(
      `UPDATE ${STEPS_TABLE}
       SET status = 'completed', completed_at = NOW(), duration_ms = $3
       WHERE run_id = $1 AND step_code = $2`,
      [runId, stepCode, durationMs],
    );

    logger.info(`[ProvisioningTelemetry] Step completed run="${runId}" step="${stepCode}" duration=${durationMs}ms`);
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to record step completion run="${runId}" step="${stepCode}": ${(err as Error).message}`);
  }
}

/**
 * Record the failure of a provisioning step.
 */
export async function recordStepFailure(
  _tenantId: string,
  runId: string,
  stepCode: string,
  error: string,
  durationMs: number,
): Promise<void> {
  try {
    await query(
      `UPDATE ${STEPS_TABLE}
       SET status = 'failed', completed_at = NOW(), duration_ms = $3, error_message = $4
       WHERE run_id = $1 AND step_code = $2`,
      [runId, stepCode, durationMs, error],
    );

    logger.warn(`[ProvisioningTelemetry] Step failed run="${runId}" step="${stepCode}" duration=${durationMs}ms error="${error}"`);
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to record step failure run="${runId}" step="${stepCode}": ${(err as Error).message}`);
  }
}

/**
 * Record the completion of a full provisioning run.
 */
export async function recordProvisioningComplete(
  _tenantId: string,
  runId: string,
  totalDurationMs: number,
): Promise<void> {
  try {
    // Determine final status: if any step failed, the run is failed
    const failedSteps = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM ${STEPS_TABLE}
       WHERE run_id = $1 AND status = 'failed'`,
      [runId],
    );
    const hasFailed = parseInt(failedSteps.rows[0]?.cnt ?? '0', 10) > 0;
    const finalStatus = hasFailed ? 'failed' : 'completed';

    await query(
      `UPDATE ${RUNS_TABLE}
       SET status = $2, completed_at = NOW(), total_duration_ms = $3
       WHERE run_id = $1`,
      [runId, finalStatus, totalDurationMs],
    );

    logger.info(`[ProvisioningTelemetry] Run completed run="${runId}" status="${finalStatus}" duration=${totalDurationMs}ms`);
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to record run completion run="${runId}": ${(err as Error).message}`);
  }
}

/**
 * Get the full telemetry for a specific provisioning run.
 */
export async function getProvisioningTelemetry(
  tenantId: string,
  runId: string,
): Promise<ProvisioningTelemetry | null> {
  try {
    // Load run record
    const runResult = await safeQuery(
      `SELECT run_id, tenant_id, total_steps, status, started_at, completed_at, total_duration_ms
       FROM ${RUNS_TABLE}
       WHERE run_id = $1 AND tenant_id = $2
       LIMIT 1`,
      [runId, tenantId],
    );

    if (runResult.rows.length === 0) return null;

    const runRow = runResult.rows[0];
    const run: ProvisioningRun = {
      tenantId: runRow.tenant_id,
      runId: runRow.run_id,
      totalSteps: parseInt(runRow.total_steps, 10),
      status: runRow.status,
      startedAt: runRow.started_at,
      completedAt: runRow.completed_at ?? null,
      totalDurationMs: runRow.total_duration_ms ? parseInt(runRow.total_duration_ms, 10) : null,
    };

    // Load step records
    const stepsResult = await safeQuery(
      `SELECT run_id, step_code, status, started_at, completed_at, duration_ms, error_message
       FROM ${STEPS_TABLE}
       WHERE run_id = $1
       ORDER BY started_at`,
      [runId],
    );

    const steps: ProvisioningStepRecord[] = stepsResult.rows.map((row: any) => ({
      runId: row.run_id,
      stepCode: row.step_code,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? null,
      durationMs: row.duration_ms ? parseInt(row.duration_ms, 10) : null,
      error: row.error_message ?? null,
    }));

    const completedSteps = steps.filter((s) => s.status === 'completed').length;
    const failedSteps = steps.filter((s) => s.status === 'failed').length;

    return { run, steps, completedSteps, failedSteps };
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to get telemetry run="${runId}": ${(err as Error).message}`);
    return null;
  }
}

/**
 * Get aggregate performance metrics across all provisioning runs.
 */
export async function getProvisioningPerformanceMetrics(): Promise<PerformanceMetrics> {
  const defaults: PerformanceMetrics = {
    totalRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    avgDurationMs: 0,
    p95DurationMs: 0,
    p99DurationMs: 0,
    avgStepDurationMs: 0,
    stepFailureRate: 0,
  };

  try {
    // Run-level aggregates
    const runStats = await safeQuery(
      `SELECT
         COUNT(*) AS total_runs,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_runs,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed_runs,
         AVG(total_duration_ms) FILTER (WHERE total_duration_ms IS NOT NULL) AS avg_duration_ms
       FROM ${RUNS_TABLE}`,
      [],
    );

    const rs = runStats.rows[0];
    defaults.totalRuns = parseInt(rs?.total_runs ?? '0', 10);
    defaults.completedRuns = parseInt(rs?.completed_runs ?? '0', 10);
    defaults.failedRuns = parseInt(rs?.failed_runs ?? '0', 10);
    defaults.avgDurationMs = parseFloat(rs?.avg_duration_ms ?? '0');

    // Percentile durations for completed runs
    if (defaults.completedRuns > 0) {
      const percentiles = await safeQuery(
        `SELECT
           PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration_ms) AS p95,
           PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_duration_ms) AS p99
         FROM ${RUNS_TABLE}
         WHERE total_duration_ms IS NOT NULL`,
        [],
      );
      const pr = percentiles.rows[0];
      defaults.p95DurationMs = parseFloat(pr?.p95 ?? '0');
      defaults.p99DurationMs = parseFloat(pr?.p99 ?? '0');
    }

    // Step-level aggregates
    const stepStats = await safeQuery(
      `SELECT
         COUNT(*) AS total_steps,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed_steps,
         AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS avg_step_duration_ms
       FROM ${STEPS_TABLE}`,
      [],
    );

    const ss = stepStats.rows[0];
    const totalSteps = parseInt(ss?.total_steps ?? '0', 10);
    const failedSteps = parseInt(ss?.failed_steps ?? '0', 10);
    defaults.avgStepDurationMs = parseFloat(ss?.avg_step_duration_ms ?? '0');
    defaults.stepFailureRate = totalSteps > 0 ? failedSteps / totalSteps : 0;

    return defaults;
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to get performance metrics: ${(err as Error).message}`);
    return defaults;
  }
}

/**
 * Identify consistently slow provisioning steps exceeding the given threshold.
 */
export async function getSlowSteps(thresholdMs: number): Promise<SlowStep[]> {
  try {
    const result = await safeQuery(
      `SELECT
         step_code,
         AVG(duration_ms) AS avg_duration_ms,
         MAX(duration_ms) AS max_duration_ms,
         COUNT(*) AS occurrences,
         COUNT(*) FILTER (WHERE status = 'failed') AS failure_count
       FROM ${STEPS_TABLE}
       WHERE duration_ms IS NOT NULL
       GROUP BY step_code
       HAVING AVG(duration_ms) > $1
       ORDER BY AVG(duration_ms) DESC`,
      [thresholdMs],
    );

    return result.rows.map((row: any) => ({
      stepCode: row.step_code,
      avgDurationMs: parseFloat(row.avg_duration_ms),
      maxDurationMs: parseInt(row.max_duration_ms, 10),
      occurrences: parseInt(row.occurrences, 10),
      failureCount: parseInt(row.failure_count, 10),
    }));
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to get slow steps: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Export a telemetry report for a given date range.
 */
export async function exportTelemetryReport(dateRange: DateRange): Promise<TelemetryReport> {
  const report: TelemetryReport = {
    dateRange,
    generatedAt: new Date().toISOString(),
    totalRuns: 0,
    completedRuns: 0,
    failedRuns: 0,
    avgRunDurationMs: 0,
    stepBreakdown: [],
  };

  try {
    // Run-level stats within date range
    const runStats = await safeQuery(
      `SELECT
         COUNT(*) AS total_runs,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_runs,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed_runs,
         AVG(total_duration_ms) FILTER (WHERE total_duration_ms IS NOT NULL) AS avg_duration_ms
       FROM ${RUNS_TABLE}
       WHERE started_at >= $1 AND started_at <= $2`,
      [dateRange.from, dateRange.to],
    );

    const rs = runStats.rows[0];
    report.totalRuns = parseInt(rs?.total_runs ?? '0', 10);
    report.completedRuns = parseInt(rs?.completed_runs ?? '0', 10);
    report.failedRuns = parseInt(rs?.failed_runs ?? '0', 10);
    report.avgRunDurationMs = parseFloat(rs?.avg_duration_ms ?? '0');

    // Step breakdown within date range (join on runs to filter by date)
    const stepBreakdown = await safeQuery(
      `SELECT
         s.step_code,
         COUNT(*) AS total_executions,
         AVG(s.duration_ms) FILTER (WHERE s.duration_ms IS NOT NULL) AS avg_duration_ms,
         COUNT(*) FILTER (WHERE s.status = 'failed') AS failure_count
       FROM ${STEPS_TABLE} s
       JOIN ${RUNS_TABLE} r ON r.run_id = s.run_id
       WHERE r.started_at >= $1 AND r.started_at <= $2
       GROUP BY s.step_code
       ORDER BY s.step_code`,
      [dateRange.from, dateRange.to],
    );

    report.stepBreakdown = stepBreakdown.rows.map((row: any) => {
      const totalExec = parseInt(row.total_executions, 10);
      const failCount = parseInt(row.failure_count, 10);
      return {
        stepCode: row.step_code,
        totalExecutions: totalExec,
        avgDurationMs: parseFloat(row.avg_duration_ms ?? '0'),
        failureCount: failCount,
        failureRate: totalExec > 0 ? failCount / totalExec : 0,
      };
    });

    return report;
  } catch (err) {
    logger.error(`[ProvisioningTelemetry] Failed to export telemetry report: ${(err as Error).message}`);
    return report;
  }
}
