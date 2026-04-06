// @ts-nocheck
/**
 * Lifecycle Checkpoint Service — DOS
 *
 * Snapshot/rollback support for lifecycle entities. Creates checkpoints of
 * entity state that can be restored later. Supports pruning old checkpoints
 * and comparing current state against a checkpoint.
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

export interface LifecycleCheckpoint {
  checkpointId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  label: string | null;
  state: string;
  stateData: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}

export interface CheckpointDiff {
  checkpointId: string;
  entityType: string;
  entityId: string;
  checkpointState: string;
  currentState: string;
  stateChanged: boolean;
  fieldDiffs: FieldDiff[];
}

export interface FieldDiff {
  field: string;
  checkpointValue: unknown;
  currentValue: unknown;
}

export interface RestoreResult {
  success: boolean;
  checkpointId: string;
  previousState: string;
  restoredState: string;
  restoredBy: string;
  restoredAt: string;
  message: string;
}

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Create a checkpoint that snapshots the current state of an entity.
 */
export async function createCheckpoint(
  tenantId: string,
  entityType: string,
  entityId: string,
  label?: string,
): Promise<LifecycleCheckpoint | null> {
  const schema = tenantSchema(tenantId);
  const checkpointId = uuid();

  try {
    // Read current entity state from lifecycle log (latest entry)
    const currentStateResult = await safeQuery(
      `SELECT to_state, metadata
       FROM "${schema}".entity_lifecycle_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [entityType, entityId],
    );

    const currentEntry = getFirstRow(currentStateResult);
    const currentState = currentEntry ? String(currentEntry.to_state) : 'unknown';
    let stateData: Record<string, unknown> = {};
    if (currentEntry?.metadata) {
      try {
        stateData = typeof currentEntry.metadata === 'string'
          ? JSON.parse(currentEntry.metadata)
          : currentEntry.metadata;
      } catch {
        stateData = {};
      }
    }

    await safeQuery(
      `INSERT INTO "${schema}".lifecycle_checkpoints
       (id, tenant_id, entity_type, entity_id, label, state, state_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [checkpointId, tenantId, entityType, entityId, label ?? null, currentState, JSON.stringify(stateData)],
    );

    logger.info('[LifecycleCheckpoint] Checkpoint created', {
      tenantId, entityType, entityId, checkpointId, state: currentState,
    });

    return {
      checkpointId,
      tenantId,
      entityType,
      entityId,
      label: label ?? null,
      state: currentState,
      stateData,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[LifecycleCheckpoint] Failed to create checkpoint', {
      tenantId, entityType, entityId, error: toErrorMessage(err),
    });
    return null;
  }
}

/**
 * Get a checkpoint by its ID.
 */
export async function getCheckpoint(tenantId: string, checkpointId: string): Promise<LifecycleCheckpoint | null> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id, tenant_id, entity_type, entity_id, label, state, state_data, created_by, created_at
       FROM "${schema}".lifecycle_checkpoints
       WHERE id = $1 AND tenant_id = $2`,
      [checkpointId, tenantId],
    );

    const row = getFirstRow(result);
    if (!row) return null;

    return mapCheckpointRow(row);
  } catch (err) {
    logger.error('[LifecycleCheckpoint] Failed to get checkpoint', {
      tenantId, checkpointId, error: toErrorMessage(err),
    });
    return null;
  }
}

/**
 * List all checkpoints for a specific entity.
 */
export async function listCheckpoints(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<LifecycleCheckpoint[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id, tenant_id, entity_type, entity_id, label, state, state_data, created_by, created_at
       FROM "${schema}".lifecycle_checkpoints
       WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3
       ORDER BY created_at DESC`,
      [entityType, entityId, tenantId],
    );

    return result.rows.map(mapCheckpointRow);
  } catch (err) {
    logger.error('[LifecycleCheckpoint] Failed to list checkpoints', {
      tenantId, entityType, entityId, error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Restore an entity to the state captured in a checkpoint.
 * Logs the restore action in the entity lifecycle log.
 */
export async function restoreCheckpoint(
  tenantId: string,
  checkpointId: string,
  restoredBy: string,
): Promise<RestoreResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    // Get the checkpoint
    const checkpoint = await getCheckpoint(tenantId, checkpointId);
    if (!checkpoint) {
      return {
        success: false, checkpointId, previousState: '', restoredState: '',
        restoredBy, restoredAt: now, message: 'Checkpoint not found',
      };
    }

    // Get current state
    const currentStateResult = await safeQuery(
      `SELECT to_state FROM "${schema}".entity_lifecycle_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [checkpoint.entityType, checkpoint.entityId],
    );
    const currentState = getFirstRow(currentStateResult)?.to_state
      ? String(getFirstRow(currentStateResult)!.to_state)
      : 'unknown';

    // Log the restore transition in lifecycle log
    await safeQuery(
      `INSERT INTO "${schema}".entity_lifecycle_log
       (entity_type, entity_id, module_code, from_state, to_state, actor_id, reason, metadata, created_at)
       VALUES ($1, $2, 'platform', $3, $4, $5, $6, $7, NOW())`,
      [
        checkpoint.entityType,
        checkpoint.entityId,
        currentState,
        checkpoint.state,
        restoredBy,
        `Restored from checkpoint ${checkpointId}`,
        JSON.stringify({ checkpointId, checkpointLabel: checkpoint.label, restoredBy }),
      ],
    );

    logger.info('[LifecycleCheckpoint] Checkpoint restored', {
      tenantId, checkpointId, entityType: checkpoint.entityType,
      entityId: checkpoint.entityId, fromState: currentState, toState: checkpoint.state,
    });

    return {
      success: true, checkpointId,
      previousState: currentState, restoredState: checkpoint.state,
      restoredBy, restoredAt: now,
      message: `Restored to checkpoint state: ${checkpoint.state}`,
    };
  } catch (err) {
    logger.error('[LifecycleCheckpoint] Restore failed', {
      tenantId, checkpointId, error: toErrorMessage(err),
    });
    return {
      success: false, checkpointId, previousState: '', restoredState: '',
      restoredBy, restoredAt: now,
      message: toErrorMessage(err) || 'Restore failed',
    };
  }
}

/**
 * Delete a checkpoint.
 */
export async function deleteCheckpoint(tenantId: string, checkpointId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `DELETE FROM "${schema}".lifecycle_checkpoints WHERE id = $1 AND tenant_id = $2`,
      [checkpointId, tenantId],
    );
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info('[LifecycleCheckpoint] Checkpoint deleted', { tenantId, checkpointId });
    }
    return deleted;
  } catch (err) {
    logger.error('[LifecycleCheckpoint] Failed to delete checkpoint', {
      tenantId, checkpointId, error: toErrorMessage(err),
    });
    return false;
  }
}

/**
 * Prune checkpoints older than the specified retention period.
 */
export async function pruneCheckpoints(tenantId: string, retentionDays: number): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `DELETE FROM "${schema}".lifecycle_checkpoints
       WHERE tenant_id = $1 AND created_at < NOW() - ($2 || ' days')::INTERVAL`,
      [tenantId, String(retentionDays)],
    );

    const pruned = result.rowCount ?? 0;
    if (pruned > 0) {
      logger.info('[LifecycleCheckpoint] Pruned old checkpoints', { tenantId, retentionDays, pruned });
    }
    return pruned;
  } catch (err) {
    logger.error('[LifecycleCheckpoint] Prune failed', {
      tenantId, retentionDays, error: toErrorMessage(err),
    });
    return 0;
  }
}

/**
 * Compare the current entity state against a checkpoint.
 * Returns a diff showing what has changed since the checkpoint was created.
 */
export async function compareWithCheckpoint(
  tenantId: string,
  checkpointId: string,
): Promise<CheckpointDiff | null> {
  const schema = tenantSchema(tenantId);

  try {
    const checkpoint = await getCheckpoint(tenantId, checkpointId);
    if (!checkpoint) return null;

    // Get current state and metadata
    const currentResult = await safeQuery(
      `SELECT to_state, metadata
       FROM "${schema}".entity_lifecycle_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [checkpoint.entityType, checkpoint.entityId],
    );

    const current = getFirstRow(currentResult);
    const currentState = current ? String(current.to_state) : 'unknown';
    let currentData: Record<string, unknown> = {};
    if (current?.metadata) {
      try {
        currentData = typeof current.metadata === 'string'
          ? JSON.parse(current.metadata)
          : current.metadata;
      } catch {
        currentData = {};
      }
    }

    // Calculate field-level diffs between checkpoint and current data
    const fieldDiffs: FieldDiff[] = [];
    const allKeys = new Set([
      ...Object.keys(checkpoint.stateData),
      ...Object.keys(currentData),
    ]);

    for (const key of allKeys) {
      const checkpointVal = checkpoint.stateData[key];
      const currentVal = currentData[key];
      if (JSON.stringify(checkpointVal) !== JSON.stringify(currentVal)) {
        fieldDiffs.push({ field: key, checkpointValue: checkpointVal, currentValue: currentVal });
      }
    }

    return {
      checkpointId,
      entityType: checkpoint.entityType,
      entityId: checkpoint.entityId,
      checkpointState: checkpoint.state,
      currentState,
      stateChanged: checkpoint.state !== currentState,
      fieldDiffs,
    };
  } catch (err) {
    logger.error('[LifecycleCheckpoint] Compare failed', {
      tenantId, checkpointId, error: toErrorMessage(err),
    });
    return null;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function mapCheckpointRow(row: GenericRow): LifecycleCheckpoint {
  let stateData: Record<string, unknown> = {};
  if (row.state_data) {
    try {
      stateData = typeof row.state_data === 'string'
        ? JSON.parse(row.state_data)
        : row.state_data;
    } catch {
      stateData = {};
    }
  }

  return {
    checkpointId: String(row.id),
    tenantId: String(row.tenant_id),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    label: row.label ? String(row.label) : null,
    state: String(row.state),
    stateData,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}
