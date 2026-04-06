import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../logger';
import type { RecoveryAction, RecoveryActionType } from '../contracts/operations.types';

const pendingActions = new Map<string, RecoveryAction>();

const APPROVAL_REQUIRED_TYPES: Set<RecoveryActionType> = new Set([
  'rollback',
  'disable',
  'manual_intervention',
]);

export function requestRecoveryAction(input: {
  actionType: RecoveryActionType;
  targetService: string;
  targetTenantId?: string;
  requestedBy: string;
  description: string;
  rollbackNotes?: string;
  incidentId?: string;
  auditContext?: Record<string, unknown>;
}): RecoveryAction {
  const action: RecoveryAction = {
    recoveryId: uuid(),
    actionType: input.actionType,
    targetService: input.targetService,
    targetTenantId: input.targetTenantId,
    requestedBy: input.requestedBy,
    requiresApproval: APPROVAL_REQUIRED_TYPES.has(input.actionType),
    status: APPROVAL_REQUIRED_TYPES.has(input.actionType) ? 'pending_approval' : 'approved',
    description: input.description,
    rollbackNotes: input.rollbackNotes,
    auditContext: input.auditContext ?? {},
    createdAt: new Date().toISOString(),
    incidentId: input.incidentId,
  };

  pendingActions.set(action.recoveryId, action);
  void persistAction(action);

  logger.warn('[Recovery] Action requested', {
    recoveryId: action.recoveryId,
    actionType: action.actionType,
    service: action.targetService,
    requestedBy: action.requestedBy,
    requiresApproval: action.requiresApproval,
  });

  return action;
}

export function approveRecoveryAction(recoveryId: string, approvedBy: string): RecoveryAction {
  const action = pendingActions.get(recoveryId);
  if (!action) throw new Error(`Recovery action not found: ${recoveryId}`);
  if (action.status !== 'pending_approval') throw new Error(`Action is not pending approval: ${action.status}`);
  action.approvedBy = approvedBy;
  action.status = 'approved';
  void persistAction(action);
  logger.info('[Recovery] Action approved', { recoveryId, approvedBy });
  return action;
}

export async function executeRecoveryAction(
  recoveryId: string,
  executorFn: (action: RecoveryAction) => Promise<void>,
): Promise<void> {
  const action = pendingActions.get(recoveryId);
  if (!action) throw new Error(`Recovery action not found: ${recoveryId}`);
  if (action.status !== 'approved') throw new Error(`Action is not approved: ${action.status}`);

  action.status = 'executing';
  action.executedAt = new Date().toISOString();
  void persistAction(action);

  logger.info('[Recovery] Executing action', {
    recoveryId,
    actionType: action.actionType,
    service: action.targetService,
  });

  try {
    await executorFn(action);
    action.status = 'completed';
    action.completedAt = new Date().toISOString();
    pendingActions.delete(recoveryId);
    logger.info('[Recovery] Action completed', { recoveryId });
  } catch (err) {
    action.status = 'failed';
    action.completedAt = new Date().toISOString();
    action.auditContext = { ...action.auditContext, failureReason: (err as Error).message };
    logger.error('[Recovery] Action failed', { recoveryId, error: (err as Error).message });
    throw err;
  } finally {
    void persistAction(action);
  }
}

export function cancelRecoveryAction(recoveryId: string, cancelledBy: string): void {
  const action = pendingActions.get(recoveryId);
  if (!action) return;
  if (['executing', 'completed', 'failed'].includes(action.status)) return;
  action.status = 'cancelled';
  action.auditContext = { ...action.auditContext, cancelledBy };
  pendingActions.delete(recoveryId);
  void persistAction(action);
  logger.info('[Recovery] Action cancelled', { recoveryId, cancelledBy });
}

export function getPendingRecoveryActions(): RecoveryAction[] {
  return Array.from(pendingActions.values());
}

async function persistAction(action: RecoveryAction): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.recovery_actions
         (recovery_id, action_type, target_service, target_tenant_id, requested_by, approved_by,
          requires_approval, status, description, rollback_notes, audit_context, created_at,
          executed_at, completed_at, incident_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (recovery_id) DO UPDATE SET
         status = EXCLUDED.status,
         approved_by = EXCLUDED.approved_by,
         executed_at = EXCLUDED.executed_at,
         completed_at = EXCLUDED.completed_at,
         audit_context = EXCLUDED.audit_context`,
      [
        action.recoveryId,
        action.actionType,
        action.targetService,
        action.targetTenantId ?? null,
        action.requestedBy,
        action.approvedBy ?? null,
        action.requiresApproval,
        action.status,
        action.description,
        action.rollbackNotes ?? null,
        JSON.stringify(action.auditContext),
        action.createdAt,
        action.executedAt ?? null,
        action.completedAt ?? null,
        action.incidentId ?? null,
      ],
    );
  } catch (err) {
    logger.warn('[Recovery] Failed to persist action', { recoveryId: action.recoveryId, error: (err as Error).message });
  }
}

export async function getRecoveryHistory(limit = 20): Promise<RecoveryAction[]> {
  try {
    const result = await safeQuery(
      `SELECT * FROM public.recovery_actions ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return result.rows.map((r: any) => ({
      recoveryId: r.recovery_id,
      actionType: r.action_type,
      targetService: r.target_service,
      targetTenantId: r.target_tenant_id,
      requestedBy: r.requested_by,
      approvedBy: r.approved_by,
      requiresApproval: r.requires_approval,
      status: r.status,
      description: r.description,
      rollbackNotes: r.rollback_notes,
      auditContext: r.audit_context ?? {},
      createdAt: r.created_at,
      executedAt: r.executed_at,
      completedAt: r.completed_at,
      incidentId: r.incident_id,
    }));
  } catch {
    return [];
  }
}

export const recoveryService = {
  requestRecoveryAction,
  approveRecoveryAction,
  executeRecoveryAction,
  cancelRecoveryAction,
  getPendingRecoveryActions,
  getRecoveryHistory,
};
