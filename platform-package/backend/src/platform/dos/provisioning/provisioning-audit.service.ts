/**
 * Provisioning Audit Service — DOS
 *
 * Complete audit trail for provisioning operations. Tracks every provisioning
 * event, step execution, and provides metrics and reporting capabilities.
 *
 * @owner DOS
 * @since 2026-04-04
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../observability/logger.service';
import { safeQuery, tenantSchema } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';
import type { GenericRow } from '../../../types/db-rows.types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProvisioningAuditEvent {
  runId: string;
  eventType: string;
  stepCode?: string;
  actor?: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ProvisioningAuditEntry {
  id: string;
  tenantId: string;
  runId: string;
  eventType: string;
  stepCode: string | null;
  actor: string | null;
  severity: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface ProvisioningMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  averageDurationMs: number;
  averageStepCount: number;
  runsByStatus: Record<string, number>;
}

export interface StepExecutionDetail {
  stepCode: string;
  stageIndex: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  auditEvents: ProvisioningAuditEntry[];
}

export interface ProvisioningHistoryEntry {
  runId: string;
  status: string;
  percent: number;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  stepCount: number;
  completedStepCount: number;
}

export interface ProvisioningReport {
  tenantId: string;
  dateRange: DateRange;
  generatedAt: string;
  totalRuns: number;
  metrics: ProvisioningMetrics;
  entries: ProvisioningAuditEntry[];
}

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Log a provisioning audit event to the tenant audit trail.
 */
export async function logProvisioningEvent(tenantId: string, event: ProvisioningAuditEvent): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  const entryId = uuid();

  try {
    await safeQuery(
      `INSERT INTO "${schema}".provisioning_audit_log
       (id, tenant_id, run_id, event_type, step_code, actor, severity, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        entryId,
        tenantId,
        event.runId,
        event.eventType,
        event.stepCode ?? null,
        event.actor ?? null,
        event.severity,
        event.message,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    );

    logger.info('[ProvisioningAudit] Event logged', {
      tenantId, runId: event.runId, eventType: event.eventType,
    });
    return entryId;
  } catch (err) {
    logger.error('[ProvisioningAudit] Failed to log event', {
      tenantId, runId: event.runId, error: toErrorMessage(err),
    });
    return null;
  }
}

/**
 * Get provisioning audit trail entries, optionally filtered by runId.
 */
export async function getProvisioningAuditTrail(
  tenantId: string,
  runId?: string,
): Promise<ProvisioningAuditEntry[]> {
  const schema = tenantSchema(tenantId);

  try {
    const params: (string | null)[] = [tenantId];
    let whereClause = 'WHERE tenant_id = $1';
    if (runId) {
      whereClause += ' AND run_id = $2';
      params.push(runId);
    }

    const result = await safeQuery(
      `SELECT id, tenant_id, run_id, event_type, step_code, actor, severity, message, metadata, created_at
       FROM "${schema}".provisioning_audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 500`,
      params,
    );

    return result.rows.map(mapAuditRow);
  } catch (err) {
    logger.error('[ProvisioningAudit] Failed to get audit trail', {
      tenantId, runId, error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Get full provisioning history for a workspace.
 */
export async function getProvisioningHistory(
  tenantId: string,
  workspaceId: string,
): Promise<ProvisioningHistoryEntry[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT j.job_id, j.status, j.percent, j.workspace_id, j.created_at, j.updated_at, j.error_message,
              COUNT(s.step_id) AS step_count,
              COUNT(s.step_id) FILTER (WHERE s.status = 'DONE') AS completed_step_count
       FROM "${schema}".provisioning_jobs j
       LEFT JOIN "${schema}".provisioning_steps s ON s.job_id = j.job_id
       WHERE j.workspace_id = $1 AND j.tenant_id = $2
       GROUP BY j.job_id
       ORDER BY j.created_at DESC`,
      [workspaceId, tenantId],
    );

    return result.rows.map((row: GenericRow) => ({
      runId: String(row.job_id),
      status: String(row.status),
      percent: Number(row.percent) || 0,
      workspaceId: row.workspace_id ? String(row.workspace_id) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      errorMessage: row.error_message ? String(row.error_message) : null,
      stepCount: Number(row.step_count) || 0,
      completedStepCount: Number(row.completed_step_count) || 0,
    }));
  } catch (err) {
    logger.error('[ProvisioningAudit] Failed to get provisioning history', {
      tenantId, workspaceId, error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Get detailed step execution info including duration and associated audit events.
 */
export async function getStepExecutionDetails(
  tenantId: string,
  runId: string,
  stepCode: string,
): Promise<StepExecutionDetail | null> {
  const schema = tenantSchema(tenantId);

  try {
    const stepResult = await safeQuery(
      `SELECT name, stage_index, status, started_at, completed_at, error_message
       FROM "${schema}".provisioning_steps
       WHERE job_id = $1 AND name = $2`,
      [runId, stepCode],
    );

    if (stepResult.rows.length === 0) return null;

    const step = stepResult.rows[0];
    const startedAt = step.started_at ? String(step.started_at) : null;
    const completedAt = step.completed_at ? String(step.completed_at) : null;
    let durationMs: number | null = null;
    if (startedAt && completedAt) {
      durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    }

    // Get associated audit events for this step
    const auditResult = await safeQuery(
      `SELECT id, tenant_id, run_id, event_type, step_code, actor, severity, message, metadata, created_at
       FROM "${schema}".provisioning_audit_log
       WHERE run_id = $1 AND step_code = $2
       ORDER BY created_at ASC`,
      [runId, stepCode],
    );

    return {
      stepCode: String(step.name),
      stageIndex: Number(step.stage_index),
      status: String(step.status),
      startedAt,
      completedAt,
      durationMs,
      errorMessage: step.error_message ? String(step.error_message) : null,
      auditEvents: auditResult.rows.map(mapAuditRow),
    };
  } catch (err) {
    logger.error('[ProvisioningAudit] Failed to get step execution details', {
      tenantId, runId, stepCode, error: toErrorMessage(err),
    });
    return null;
  }
}

/**
 * Get provisioning metrics: success/failure rates, average duration.
 */
export async function getProvisioningMetrics(tenantId: string): Promise<ProvisioningMetrics> {
  const schema = tenantSchema(tenantId);
  const emptyMetrics: ProvisioningMetrics = {
    totalRuns: 0, successfulRuns: 0, failedRuns: 0,
    successRate: 0, averageDurationMs: 0, averageStepCount: 0,
    runsByStatus: {},
  };

  try {
    // Counts by status
    const statusResult = await safeQuery(
      `SELECT status, COUNT(*) AS count
       FROM "${schema}".provisioning_jobs
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId],
    );

    const runsByStatus: Record<string, number> = {};
    let totalRuns = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    for (const row of statusResult.rows) {
      const count = Number(row.count);
      runsByStatus[String(row.status)] = count;
      totalRuns += count;
      if (row.status === 'DONE') successfulRuns = count;
      if (row.status === 'FAILED') failedRuns = count;
    }

    if (totalRuns === 0) return emptyMetrics;

    // Average duration for completed jobs
    const durationResult = await safeQuery(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) AS avg_duration_ms
       FROM "${schema}".provisioning_jobs
       WHERE tenant_id = $1 AND status = 'DONE'`,
      [tenantId],
    );
    const avgDuration = durationResult.rows[0]?.avg_duration_ms
      ? Number(durationResult.rows[0].avg_duration_ms)
      : 0;

    // Average step count
    const stepCountResult = await safeQuery(
      `SELECT AVG(step_count) AS avg_steps FROM (
         SELECT COUNT(*) AS step_count FROM "${schema}".provisioning_steps
         WHERE job_id IN (SELECT job_id FROM "${schema}".provisioning_jobs WHERE tenant_id = $1)
         GROUP BY job_id
       ) sub`,
      [tenantId],
    );
    const avgSteps = stepCountResult.rows[0]?.avg_steps
      ? Number(stepCountResult.rows[0].avg_steps)
      : 0;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 10000) / 100 : 0,
      averageDurationMs: Math.round(avgDuration),
      averageStepCount: Math.round(avgSteps * 10) / 10,
      runsByStatus,
    };
  } catch (err) {
    logger.error('[ProvisioningAudit] Failed to get metrics', { tenantId, error: toErrorMessage(err) });
    return emptyMetrics;
  }
}

/**
 * Export a provisioning audit report for a given date range.
 */
export async function exportProvisioningReport(tenantId: string, dateRange: DateRange): Promise<ProvisioningReport> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    const entries = await safeQuery(
      `SELECT id, tenant_id, run_id, event_type, step_code, actor, severity, message, metadata, created_at
       FROM "${schema}".provisioning_audit_log
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
       ORDER BY created_at DESC`,
      [tenantId, dateRange.from, dateRange.to],
    );

    const runsResult = await safeQuery(
      `SELECT COUNT(*) AS total FROM "${schema}".provisioning_jobs
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [tenantId, dateRange.from, dateRange.to],
    );

    const metrics = await getProvisioningMetrics(tenantId);

    return {
      tenantId,
      dateRange,
      generatedAt: now,
      totalRuns: Number(runsResult.rows[0]?.total) || 0,
      metrics,
      entries: entries.rows.map(mapAuditRow),
    };
  } catch (err) {
    logger.error('[ProvisioningAudit] Failed to export report', {
      tenantId, dateRange, error: toErrorMessage(err),
    });
    return {
      tenantId,
      dateRange,
      generatedAt: now,
      totalRuns: 0,
      metrics: {
        totalRuns: 0, successfulRuns: 0, failedRuns: 0,
        successRate: 0, averageDurationMs: 0, averageStepCount: 0, runsByStatus: {},
      },
      entries: [],
    };
  }
}

/**
 * Get recent failed provisioning attempts.
 */
export async function getRecentFailures(tenantId: string, limit: number = 20): Promise<ProvisioningAuditEntry[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT a.id, a.tenant_id, a.run_id, a.event_type, a.step_code, a.actor,
              a.severity, a.message, a.metadata, a.created_at
       FROM "${schema}".provisioning_audit_log a
       INNER JOIN "${schema}".provisioning_jobs j ON j.job_id = a.run_id
       WHERE a.tenant_id = $1 AND a.severity = 'error'
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );

    return result.rows.map(mapAuditRow);
  } catch (err) {
    logger.error('[ProvisioningAudit] Failed to get recent failures', {
      tenantId, error: toErrorMessage(err),
    });
    return [];
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function mapAuditRow(row: GenericRow): ProvisioningAuditEntry {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata) {
    try {
      metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    } catch {
      metadata = null;
    }
  }

  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    runId: String(row.run_id),
    eventType: String(row.event_type),
    stepCode: row.step_code ? String(row.step_code) : null,
    actor: row.actor ? String(row.actor) : null,
    severity: String(row.severity),
    message: String(row.message),
    metadata,
    createdAt: String(row.created_at),
  };
}
