/**
 * Worker Tracker — DOS Observability
 *
 * Records worker execution start/complete/fail events into the
 * worker_executions table. Used by all worker types.
 *
 * @owner DOS
 * Maps to: AGENTS.md Patch 0 Law 12 (audit by default)
 */

import { safeQuery } from '../../../config/database/database';
import { v4 as uuid } from 'uuid';
import { logger } from './logger.service';
import type { WorkerType } from './worker-registry.service';

// ── Types ──

export interface WorkerExecutionStart {
  workerType: WorkerType;
  workerName: string;
  runId?: string;
  tenantId?: string;
  inputSummary?: Record<string, any>;
}

export interface WorkerExecutionEnd {
  executionId: string;
  status: 'completed' | 'failed' | 'timeout' | 'cancelled';
  outputSummary?: Record<string, any>;
  error?: string;
}

// ── Tracker ──

export async function startWorkerExecution(input: WorkerExecutionStart): Promise<string> {
  const executionId = uuid();
  try {
    await safeQuery(
      `INSERT INTO public.worker_executions (id, worker_type, worker_name, run_id, tenant_id, started_at, status, input_summary)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'running', $6)`,
      [executionId, input.workerType, input.workerName, input.runId ?? null, input.tenantId ?? null, JSON.stringify(input.inputSummary ?? {})],
    );
  } catch (err) {
    logger.warn(`[WorkerTracker] Failed to record start for ${input.workerType}:${input.workerName}`, { error: (err as Error).message });
  }
  return executionId;
}

export async function endWorkerExecution(input: WorkerExecutionEnd): Promise<void> {
  try {
    await safeQuery(
      `UPDATE public.worker_executions
       SET completed_at = NOW(),
           status = $2,
           duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
           output_summary = $3,
           error = $4
       WHERE id = $1`,
      [input.executionId, input.status, JSON.stringify(input.outputSummary ?? {}), input.error ?? null],
    );
  } catch (err) {
    logger.warn(`[WorkerTracker] Failed to record end for ${input.executionId}`, { error: (err as Error).message });
  }
}

// ── Queries for admin dashboard ──

export async function getRecentExecutions(limit: number = 50): Promise<any[]> {
  const result = await safeQuery(
    `SELECT id, worker_type, worker_name, run_id, tenant_id, started_at, completed_at, status, duration_ms, error
     FROM public.worker_executions
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function getActiveExecutions(): Promise<any[]> {
  const result = await safeQuery(
    `SELECT id, worker_type, worker_name, run_id, tenant_id, started_at, status
     FROM public.worker_executions
     WHERE status = 'running'
     ORDER BY started_at ASC`,
  );
  return result.rows;
}

export async function getExecutionStats(hours: number = 24): Promise<unknown> {
  const result = await safeQuery(
    `SELECT
       worker_type,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'completed') as completed,
       COUNT(*) FILTER (WHERE status = 'failed') as failed,
       AVG(duration_ms) FILTER (WHERE status = 'completed') as avg_duration_ms,
       MAX(duration_ms) FILTER (WHERE status = 'completed') as max_duration_ms
     FROM public.worker_executions
     WHERE started_at > NOW() - INTERVAL '${hours} hours'
     GROUP BY worker_type
     ORDER BY worker_type`,
  );
  return result.rows;
}

export async function getEnforcementHistory(limit: number = 20): Promise<any[]> {
  const result = await safeQuery(
    `SELECT r.run_id, r.started_at, r.completed_at, r.verdict, r.total_duration_ms, r.check_count, r.fail_count, r.triggered_by,
            COALESCE(json_agg(json_build_object('check', c.check_name, 'law', c.law_ref, 'status', c.status, 'findings', c.findings, 'ms', c.duration_ms)
              ORDER BY c.created_at), '[]') as checks
     FROM public.enforcement_runs r
     LEFT JOIN public.enforcement_check_results c ON c.run_id = r.run_id
     GROUP BY r.run_id, r.started_at, r.completed_at, r.verdict, r.total_duration_ms, r.check_count, r.fail_count, r.triggered_by
     ORDER BY r.started_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}
