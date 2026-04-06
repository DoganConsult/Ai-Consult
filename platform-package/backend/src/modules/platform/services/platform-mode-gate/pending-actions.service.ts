// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/logger.service';
/**
 * Pending Actions: queue, review, and logging of agent-proposed actions
 * that require human approval before execution.
 * Includes Law 6 approval chain logic for high-stakes actions.
 */
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { toErrorMessage } from '../../../../errors/http-error.util';
import type { PlatformMode } from './platform-mode.types';

/**
 * Law 6: Approval chain levels for high-stakes actions.
 * ALWAYS_CHAIN_TYPES require multi-level approval (agent -> team lead -> human).
 */
const ALWAYS_CHAIN_TYPES = new Set([
  'CLOSE_INCIDENT', 'CREATE_POLICY', 'CLOSE_RISK', 'MODIFY_CONTROL', 'ESCALATE',
]);

export async function queuePendingAction(
  tenantId: string,
  agentId: string,
  action: { type: string; title: string; description: string; priority: string; entityType?: string; entityId?: string; payload?: unknown; reversible?: boolean },
  userId?: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // Law 6: Determine approval chain depth
    const needsChain = ALWAYS_CHAIN_TYPES.has(action.type.toUpperCase()) ||
                       action.priority === 'critical' ||
                       action.reversible === false;
    const approvalChain = needsChain
      ? JSON.stringify([
          { level: 1, approverType: 'team_lead', status: 'pending' },
          { level: 2, approverType: 'human', status: 'pending' },
        ])
      : JSON.stringify([
          { level: 1, approverType: 'human', status: 'pending' },
        ]);

    const result = await safeQuery(
      `INSERT INTO "${schema}".agent_pending_actions
         (agent_id, user_id, action_type, entity_type, entity_id, proposed_payload, confidence_score, reasoning, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'awaiting_approval', $9)
       RETURNING action_id`,
      [
        agentId,
        userId || `agent-${agentId}`,
        action.type,
        action.entityType || null,
        action.entityId || null,
        JSON.stringify({
          title: action.title, description: action.description,
          priority: action.priority, reversible: action.reversible ?? true,
          approval_chain: JSON.parse(approvalChain),
          ...action.payload,
        }),
        0.85,
        action.description,
        expiresAt,
      ],
    );
    return getFirstRow(result)?.action_id || null;
  } catch (err: unknown) {
    logger.warn(`[ModeGate] Failed to queue pending action: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function logModeOperation(
  tenantId: string,
  agentId: string,
  mode: PlatformMode | string,
  action: { type: string; title: string; priority: string; entityType?: string; entityId?: string } | string,
  outcome: 'completed' | 'rejected' | 'escalated' | 'overridden' | 'failed' | 'pending_review' | 'execute' | string,
  metadata?: Record<string, any>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    // Support both object and positional-string call signatures (used by executeModeTransition)
    const actionObj = typeof action === 'string'
      ? { type: action, title: action, priority: 'medium' }
      : action;
    const modeStr = typeof mode === 'string' ? mode : 'human';

    await safeQuery(
      `INSERT INTO "${schema}".mode_operation_log
         (user_id, operation_mode, action_type, entity_type, entity_id, agent_id, outcome, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `agent-${agentId}`,
        modeStr === 'shadow_agent' ? 'hybrid_active' : modeStr === 'full_autonomous' ? 'autonomous' : modeStr === 'hybrid' ? 'hybrid_shadow' : 'human_only',
        actionObj.type,
        actionObj.entityType || null,
        actionObj.entityId || null,
        agentId,
        outcome,
        JSON.stringify({ title: actionObj.title, priority: actionObj.priority, ...metadata }),
      ],
    );
  } catch { /* non-fatal */ }
}

export async function getPendingActions(
  tenantId: string,
  opts?: { status?: string; agentId?: string; limit?: number },
): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(opts.status);
  } else {
    conditions.push(`status = $${idx++}`);
    params.push('awaiting_approval');
  }
  if (opts?.agentId) {
    conditions.push(`agent_id = $${idx++}`);
    params.push(opts.agentId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts?.limit || 50;

  try {
    const result = await safeQuery(
      `SELECT action_id, shadow_id, agent_id, user_id, team_id, action_type,
              entity_type, entity_id, proposed_payload, confidence_score,
              reasoning, status, expires_at, reviewed_by, reviewed_at,
              review_note, created_at
       FROM "${schema}".agent_pending_actions
       ${where}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      params,
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function reviewPendingAction(
  tenantId: string,
  actionId: string,
  reviewedBy: string,
  approved: boolean,
  reviewNote?: string,
): Promise<{ success: boolean; action?: unknown }> {
  const schema = tenantSchema(tenantId);
  const newStatus = approved ? 'approved' : 'rejected';

  const result = await safeQuery(
    `UPDATE "${schema}".agent_pending_actions
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
     WHERE action_id = $4 AND status = 'awaiting_approval'
     RETURNING *`,
    [newStatus, reviewedBy, reviewNote || null, actionId],
  );

  if (result.rows.length === 0) {
    return { success: false };
  }

  return { success: true, action: getFirstRow(result) };
}

/**
 * Auto-reject pending actions whose expires_at has passed.
 * Called by the platform job scheduler to prevent queue bloat.
 * Returns count of expired actions.
 */
export async function expireStaleActions(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `UPDATE "${schema}".agent_pending_actions
       SET status = 'expired', reviewed_by = 'system', reviewed_at = NOW(),
           review_note = 'Auto-expired: exceeded 72-hour approval window'
       WHERE status = 'awaiting_approval'
         AND expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING action_id`,
    );
    const count = result.rows.length;
    if (count > 0) {
      logger.info(`[ModeGate] Auto-expired ${count} stale pending actions for tenant ${tenantId}`);
    }
    return count;
  } catch (err: unknown) {
    logger.warn(`[ModeGate] Failed to expire stale actions: ${toErrorMessage(err)}`);
    return 0;
  }
}
