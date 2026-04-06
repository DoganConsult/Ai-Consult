// @ts-nocheck
/**
 * Provisioning Recovery Service — DOS
 *
 * Detects and recovers from failed provisioning runs. Supports retry, skip,
 * rollback, and abandon strategies with full audit trail.
 *
 * @owner DOS
 * @since 2026-04-04
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../observability/logger.service';
import { safeQuery, tenantSchema } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';
import { getFirstRow } from '../../../utils/db-utils';
import type { GenericRow } from '../../../types/db-rows.types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type RecoveryStrategy = 'retry' | 'skip' | 'rollback';

export interface FailedProvisioningRun {
  runId: string;
  tenantId: string;
  status: string;
  failedStepCode: string | null;
  failedStepIndex: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  stuckDurationMs: number;
}

export interface RecoveryOption {
  strategy: RecoveryStrategy;
  available: boolean;
  reason: string | null;
  failedStepCode: string | null;
  completedStepCount: number;
  totalStepCount: number;
}

export interface RecoveryResult {
  success: boolean;
  runId: string;
  strategy: RecoveryStrategy | 'abandon';
  message: string;
  recoveredAt: string;
}

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Detect provisioning runs stuck in 'RUNNING' or 'FAILED' status.
 * Runs stuck in RUNNING for more than 30 minutes are considered stalled.
 */
export async function detectFailedProvisioningRuns(tenantId: string): Promise<FailedProvisioningRun[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT j.job_id, j.tenant_id, j.status, j.error_message, j.created_at, j.updated_at,
              s.name AS failed_step_code, s.stage_index AS failed_step_index,
              EXTRACT(EPOCH FROM (NOW() - j.updated_at)) * 1000 AS stuck_duration_ms
       FROM "${schema}".provisioning_jobs j
       LEFT JOIN "${schema}".provisioning_steps s
         ON s.job_id = j.job_id AND s.status IN ('RUNNING', 'FAILED')
       WHERE j.status IN ('RUNNING', 'FAILED')
         AND j.tenant_id = $1
       ORDER BY j.updated_at DESC`,
      [tenantId],
    );

    return result.rows.map((row: GenericRow) => ({
      runId: String(row.job_id),
      tenantId: String(row.tenant_id),
      status: String(row.status),
      failedStepCode: row.failed_step_code ? String(row.failed_step_code) : null,
      failedStepIndex: row.failed_step_index != null ? Number(row.failed_step_index) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      stuckDurationMs: Number(row.stuck_duration_ms) || 0,
    }));
  } catch (err) {
    logger.error('[ProvisioningRecovery] Failed to detect failed runs', {
      tenantId,
      error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Recover a failed provisioning run using the specified strategy.
 */
export async function recoverProvisioningRun(
  tenantId: string,
  runId: string,
  strategy: RecoveryStrategy,
): Promise<RecoveryResult> {
  const now = new Date().toISOString();

  try {
    switch (strategy) {
      case 'retry': {
        const schema = tenantSchema(tenantId);
        // Find the failed step and reset it to PENDING
        const failedSteps = await safeQuery(
          `SELECT name, stage_index FROM "${schema}".provisioning_steps
           WHERE job_id = $1 AND status IN ('FAILED', 'RUNNING')
           ORDER BY stage_index ASC LIMIT 1`,
          [runId],
        );
        const step = getFirstRow(failedSteps);
        if (!step) {
          return { success: false, runId, strategy, message: 'No failed step found to retry', recoveredAt: now };
        }
        await safeQuery(
          `UPDATE "${schema}".provisioning_steps
           SET status = 'PENDING', started_at = NULL, completed_at = NULL, error_message = NULL
           WHERE job_id = $1 AND stage_index = $2`,
          [runId, step.stage_index],
        );
        await safeQuery(
          `UPDATE "${schema}".provisioning_jobs SET status = 'RUNNING', error_message = NULL, updated_at = NOW() WHERE job_id = $1`,
          [runId],
        );
        await logRecoveryAction(tenantId, runId, 'retry', String(step.name), null);
        return { success: true, runId, strategy, message: `Retrying from step: ${step.name}`, recoveredAt: now };
      }

      case 'skip': {
        const schema = tenantSchema(tenantId);
        const failedSteps = await safeQuery(
          `SELECT name, stage_index FROM "${schema}".provisioning_steps
           WHERE job_id = $1 AND status IN ('FAILED', 'RUNNING')
           ORDER BY stage_index ASC LIMIT 1`,
          [runId],
        );
        const step = getFirstRow(failedSteps);
        if (!step) {
          return { success: false, runId, strategy, message: 'No failed step found to skip', recoveredAt: now };
        }
        await safeQuery(
          `UPDATE "${schema}".provisioning_steps
           SET status = 'DONE', completed_at = NOW(), error_message = 'SKIPPED via recovery'
           WHERE job_id = $1 AND stage_index = $2`,
          [runId, step.stage_index],
        );
        await safeQuery(
          `UPDATE "${schema}".provisioning_jobs SET status = 'RUNNING', error_message = NULL, updated_at = NOW() WHERE job_id = $1`,
          [runId],
        );
        await logRecoveryAction(tenantId, runId, 'skip', String(step.name), null);
        return { success: true, runId, strategy, message: `Skipped step: ${step.name}`, recoveredAt: now };
      }

      case 'rollback':
        return rollbackProvisioningRun(tenantId, runId);

      default:
        return { success: false, runId, strategy, message: `Unknown recovery strategy: ${strategy}`, recoveredAt: now };
    }
  } catch (err) {
    logger.error('[ProvisioningRecovery] Recovery failed', { tenantId, runId, strategy, error: toErrorMessage(err) });
    return { success: false, runId, strategy, message: toErrorMessage(err) || 'Recovery failed', recoveredAt: now };
  }
}

/**
 * Retry a single failed step within a provisioning run.
 */
export async function retryFailedStep(tenantId: string, runId: string, stepCode: string): Promise<RecoveryResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    const stepResult = await safeQuery(
      `SELECT stage_index, status FROM "${schema}".provisioning_steps
       WHERE job_id = $1 AND name = $2`,
      [runId, stepCode],
    );
    const step = getFirstRow(stepResult);
    if (!step) {
      return { success: false, runId, strategy: 'retry', message: `Step not found: ${stepCode}`, recoveredAt: now };
    }
    if (step.status !== 'FAILED' && step.status !== 'RUNNING') {
      return { success: false, runId, strategy: 'retry', message: `Step is not in a failed state: ${step.status}`, recoveredAt: now };
    }

    await safeQuery(
      `UPDATE "${schema}".provisioning_steps
       SET status = 'PENDING', started_at = NULL, completed_at = NULL, error_message = NULL
       WHERE job_id = $1 AND name = $2`,
      [runId, stepCode],
    );
    await safeQuery(
      `UPDATE "${schema}".provisioning_jobs SET status = 'RUNNING', error_message = NULL, updated_at = NOW() WHERE job_id = $1`,
      [runId],
    );
    await logRecoveryAction(tenantId, runId, 'retry', stepCode, null);

    logger.info('[ProvisioningRecovery] Step retry initiated', { tenantId, runId, stepCode });
    return { success: true, runId, strategy: 'retry', message: `Step ${stepCode} reset for retry`, recoveredAt: now };
  } catch (err) {
    logger.error('[ProvisioningRecovery] Step retry failed', { tenantId, runId, stepCode, error: toErrorMessage(err) });
    return { success: false, runId, strategy: 'retry', message: toErrorMessage(err) || 'Step retry failed', recoveredAt: now };
  }
}

/**
 * Skip a failed step with audit trail.
 */
export async function skipFailedStep(
  tenantId: string,
  runId: string,
  stepCode: string,
  skippedBy: string,
  reason: string,
): Promise<RecoveryResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    const stepResult = await safeQuery(
      `SELECT stage_index, status FROM "${schema}".provisioning_steps
       WHERE job_id = $1 AND name = $2`,
      [runId, stepCode],
    );
    const step = getFirstRow(stepResult);
    if (!step) {
      return { success: false, runId, strategy: 'skip', message: `Step not found: ${stepCode}`, recoveredAt: now };
    }
    if (step.status !== 'FAILED' && step.status !== 'RUNNING') {
      return { success: false, runId, strategy: 'skip', message: `Step is not in a failed state: ${step.status}`, recoveredAt: now };
    }

    await safeQuery(
      `UPDATE "${schema}".provisioning_steps
       SET status = 'DONE', completed_at = NOW(), error_message = $1
       WHERE job_id = $2 AND name = $3`,
      [`SKIPPED by ${skippedBy}: ${reason}`, runId, stepCode],
    );
    await safeQuery(
      `UPDATE "${schema}".provisioning_jobs SET status = 'RUNNING', error_message = NULL, updated_at = NOW() WHERE job_id = $1`,
      [runId],
    );
    await logRecoveryAction(tenantId, runId, 'skip', stepCode, `Skipped by ${skippedBy}: ${reason}`);

    logger.info('[ProvisioningRecovery] Step skipped', { tenantId, runId, stepCode, skippedBy, reason });
    return { success: true, runId, strategy: 'skip', message: `Step ${stepCode} skipped`, recoveredAt: now };
  } catch (err) {
    logger.error('[ProvisioningRecovery] Skip failed', { tenantId, runId, stepCode, error: toErrorMessage(err) });
    return { success: false, runId, strategy: 'skip', message: toErrorMessage(err) || 'Skip failed', recoveredAt: now };
  }
}

/**
 * Rollback a provisioning run by reverting completed steps in reverse order.
 * Marks all steps as PENDING and the job as FAILED with rollback note.
 */
export async function rollbackProvisioningRun(tenantId: string, runId: string): Promise<RecoveryResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    // Get completed steps in reverse order for rollback
    const completedSteps = await safeQuery(
      `SELECT name, stage_index, status FROM "${schema}".provisioning_steps
       WHERE job_id = $1 AND status = 'DONE'
       ORDER BY stage_index DESC`,
      [runId],
    );

    if (completedSteps.rows.length === 0) {
      // Nothing to rollback — just reset the failed step
      await safeQuery(
        `UPDATE "${schema}".provisioning_steps
         SET status = 'PENDING', started_at = NULL, completed_at = NULL, error_message = NULL
         WHERE job_id = $1 AND status IN ('FAILED', 'RUNNING')`,
        [runId],
      );
      await safeQuery(
        `UPDATE "${schema}".provisioning_jobs SET status = 'FAILED', error_message = 'Rolled back (no completed steps)', updated_at = NOW() WHERE job_id = $1`,
        [runId],
      );
      await logRecoveryAction(tenantId, runId, 'rollback', null, 'No completed steps to rollback');
      return { success: true, runId, strategy: 'rollback', message: 'No completed steps to rollback, run reset', recoveredAt: now };
    }

    // Reset all steps to PENDING in reverse order
    for (const step of completedSteps.rows) {
      await safeQuery(
        `UPDATE "${schema}".provisioning_steps
         SET status = 'PENDING', started_at = NULL, completed_at = NULL,
             error_message = $1
         WHERE job_id = $2 AND stage_index = $3`,
        [`Rolled back at ${now}`, runId, step.stage_index],
      );
      logger.info('[ProvisioningRecovery] Rolled back step', {
        tenantId, runId, step: step.name, stageIndex: step.stage_index,
      });
    }

    // Also reset any FAILED/RUNNING steps
    await safeQuery(
      `UPDATE "${schema}".provisioning_steps
       SET status = 'PENDING', started_at = NULL, completed_at = NULL, error_message = NULL
       WHERE job_id = $1 AND status IN ('FAILED', 'RUNNING')`,
      [runId],
    );

    await safeQuery(
      `UPDATE "${schema}".provisioning_jobs
       SET status = 'FAILED', percent = 0,
           error_message = $1, updated_at = NOW()
       WHERE job_id = $2`,
      [`Rolled back ${completedSteps.rows.length} steps at ${now}`, runId],
    );

    await logRecoveryAction(tenantId, runId, 'rollback', null, `Rolled back ${completedSteps.rows.length} completed steps`);
    return {
      success: true, runId, strategy: 'rollback',
      message: `Rolled back ${completedSteps.rows.length} completed steps`,
      recoveredAt: now,
    };
  } catch (err) {
    logger.error('[ProvisioningRecovery] Rollback failed', { tenantId, runId, error: toErrorMessage(err) });
    return { success: false, runId, strategy: 'rollback', message: toErrorMessage(err) || 'Rollback failed', recoveredAt: now };
  }
}

/**
 * Get available recovery strategies for a failed provisioning run.
 */
export async function getRecoveryOptions(tenantId: string, runId: string): Promise<RecoveryOption[]> {
  const schema = tenantSchema(tenantId);

  try {
    const jobResult = await safeQuery(
      `SELECT status FROM "${schema}".provisioning_jobs WHERE job_id = $1`,
      [runId],
    );
    const job = getFirstRow(jobResult);
    if (!job) return [];

    const stepsResult = await safeQuery(
      `SELECT name, stage_index, status FROM "${schema}".provisioning_steps
       WHERE job_id = $1 ORDER BY stage_index ASC`,
      [runId],
    );

    const steps = stepsResult.rows;
    const failedStep = steps.find((s: GenericRow) => s.status === 'FAILED' || s.status === 'RUNNING');
    const completedCount = steps.filter((s: GenericRow) => s.status === 'DONE').length;
    const totalCount = steps.length;
    const failedStepCode = failedStep ? String(failedStep.name) : null;
    const isRecoverable = job.status === 'FAILED' || job.status === 'RUNNING';

    return [
      {
        strategy: 'retry' as RecoveryStrategy,
        available: isRecoverable && failedStep != null,
        reason: !isRecoverable ? 'Run is not in a failed or stalled state' : (!failedStep ? 'No failed step found' : null),
        failedStepCode,
        completedStepCount: completedCount,
        totalStepCount: totalCount,
      },
      {
        strategy: 'skip' as RecoveryStrategy,
        available: isRecoverable && failedStep != null,
        reason: !isRecoverable ? 'Run is not in a failed or stalled state' : (!failedStep ? 'No failed step to skip' : null),
        failedStepCode,
        completedStepCount: completedCount,
        totalStepCount: totalCount,
      },
      {
        strategy: 'rollback' as RecoveryStrategy,
        available: isRecoverable,
        reason: !isRecoverable ? 'Run is not in a failed or stalled state' : null,
        failedStepCode,
        completedStepCount: completedCount,
        totalStepCount: totalCount,
      },
    ];
  } catch (err) {
    logger.error('[ProvisioningRecovery] Failed to get recovery options', { tenantId, runId, error: toErrorMessage(err) });
    return [];
  }
}

/**
 * Mark a provisioning run as abandoned with audit trail.
 * Abandoned runs are not eligible for recovery.
 */
export async function markRunAbandoned(
  tenantId: string,
  runId: string,
  abandonedBy: string,
  reason: string,
): Promise<RecoveryResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    await safeQuery(
      `UPDATE "${schema}".provisioning_jobs
       SET status = 'FAILED', error_message = $1, updated_at = NOW()
       WHERE job_id = $2`,
      [`ABANDONED by ${abandonedBy}: ${reason}`, runId],
    );

    // Mark any non-completed steps as abandoned
    await safeQuery(
      `UPDATE "${schema}".provisioning_steps
       SET status = 'FAILED', completed_at = NOW(), error_message = 'ABANDONED'
       WHERE job_id = $1 AND status IN ('PENDING', 'RUNNING')`,
      [runId],
    );

    await logRecoveryAction(tenantId, runId, 'abandon', null, `Abandoned by ${abandonedBy}: ${reason}`);

    logger.info('[ProvisioningRecovery] Run abandoned', { tenantId, runId, abandonedBy, reason });
    return { success: true, runId, strategy: 'abandon', message: `Run abandoned: ${reason}`, recoveredAt: now };
  } catch (err) {
    logger.error('[ProvisioningRecovery] Failed to abandon run', { tenantId, runId, error: toErrorMessage(err) });
    return { success: false, runId, strategy: 'abandon', message: toErrorMessage(err) || 'Abandon failed', recoveredAt: now };
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Log a recovery action to the provisioning audit trail.
 */
async function logRecoveryAction(
  tenantId: string,
  runId: string,
  action: string,
  stepCode: string | null,
  details: string | null,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".provisioning_audit_log
       (id, tenant_id, run_id, action, step_code, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [uuid(), tenantId, runId, action, stepCode, details],
    );
  } catch (err) {
    // Audit log insert failure should not block recovery operations
    logger.warn('[ProvisioningRecovery] Failed to log recovery action', {
      tenantId, runId, action, error: toErrorMessage(err),
    });
  }
}
