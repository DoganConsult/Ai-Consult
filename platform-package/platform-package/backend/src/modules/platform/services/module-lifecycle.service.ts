/**
 * Module Lifecycle Service — Status transition enforcement.
 *
 * Provides guardrails for entity status changes across modules,
 * checking transition rules defined in module_lifecycle_transitions table.
 */
import { safeQuery, tenantSchema } from '../../../config/database';

export interface TransitionInput {
  moduleCode: string;
  table?: string;
  idColumn?: string;
  entityId: string;
  toStatus: string;
  fromStatus?: string;
  actorUserId: string;
  /** Override the default 'status' column name (e.g. 'test_status') */
  statusColumn?: string;
  extraSets?: string;
  extraParams?: any[];
}

export interface TransitionResult {
  success: boolean;
  blocked: boolean;
  reason?: string;
  previousStatus?: string;
  pendingApproval?: boolean;
  approvalId?: string;
  handled?: boolean;
  denied?: boolean;
  result?: unknown;
}

/**
 * Try a status transition if the lifecycle rules allow it.
 * Returns { success: true } if the transition was applied,
 * { blocked: true, reason } if denied by lifecycle rules or DAuth authorization.
 *
 * §11 Lifecycle Authorization Model: DAuth evaluateLifecycleTransition is called
 * BEFORE the status update to enforce permission, authority, self-approval,
 * SoD, and delegation rules.
 */
export async function tryLifecycleTransition(
  tenantId: string,
  input: TransitionInput,
): Promise<TransitionResult> {
  const schema = tenantSchema(tenantId);

  // Get current status
  const statusCol = input.statusColumn || 'status';
  const current = await safeQuery(
    `SELECT "${statusCol}" AS status FROM "${schema}"."${input.table}" WHERE "${input.idColumn}" = $1 LIMIT 1`,
    [input.entityId],
  );
  if (current.rows.length === 0) {
    return { success: false, blocked: false, reason: 'Entity not found' };
  }
  const fromStatus = current.rows[0].status;

  // Check if transition is allowed by lifecycle registry
  const allowed = await safeQuery(
    `SELECT required_permission_code, authority_gate, sod_check
     FROM "${schema}".module_lifecycle_transitions
     WHERE module_code = $1 AND from_status = $2 AND to_status = $3 LIMIT 1`,
    [input.moduleCode, fromStatus, input.toStatus],
  ).catch(() => ({ rows: [] }));

  if (allowed.rows.length === 0) {
    return { success: false, blocked: true, reason: `Transition from '${fromStatus}' to '${input.toStatus}' is not allowed for module '${input.moduleCode}'` };
  }

  // DAuth lifecycle authorization (§11: evaluateLifecycleTransition)
  try {
    const { evaluateLifecycleTransition } = await import('../../../platform/dauth');
    const authResult = await evaluateLifecycleTransition(tenantId, input.actorUserId, {
      moduleCode: input.moduleCode,
      entityType: input.table || input.moduleCode,
      entityId: input.entityId,
      fromState: fromStatus,
      toState: input.toStatus,
      permissionCode: allowed.rows[0]?.required_permission || `${input.moduleCode}.record.approve`,
      userRoles: [], // resolved by DAuth internally
    });

    if (!authResult.allowed) {
      return {
        success: false,
        blocked: true,
        denied: true,
        reason: authResult.reason || 'Lifecycle transition denied by DAuth',
      };
    }
  } catch {
    // DAuth lifecycle auth not available — fall through to table-level check only
    // This maintains backward compatibility while DAuth is being fully wired
  }

  // Apply the transition
  const setClauses = [`status = $1`, `updated_at = NOW()`];
  const params: any[] = [input.toStatus];
  let paramIdx = 2;

  if (input.extraSets) {
    // Re-number the extra params starting from current paramIdx
    let rewritten = input.extraSets;
    if (input.extraParams) {
      for (let i = 0; i < input.extraParams.length; i++) {
        rewritten = rewritten.replace(`$${i + 2}`, `$${paramIdx}`);
        params.push(input.extraParams[i]);
        paramIdx++;
      }
    }
    setClauses.push(rewritten);
  }

  params.push(input.entityId);
  await safeQuery(
    `UPDATE "${schema}"."${input.table}" SET ${setClauses.join(', ')} WHERE "${input.idColumn}" = $${paramIdx}`,
    params,
  );

  return { success: true, blocked: false, previousStatus: fromStatus };
}

/**
 * Enforce a status transition — same as tryLifecycleTransition but designed for
 * route handlers that need to check the result and potentially fall back.
 */
export async function enforceStatusTransition(
  tenantId: string,
  input: TransitionInput,
): Promise<TransitionResult> {
  return tryLifecycleTransition(tenantId, input);
}
