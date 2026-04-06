// @ts-nocheck
import { catchHandler, EC } from '../../../../platform/dos/resilience/resilient-catch';
import { logger } from '../../../../platform/dos/observability/logger.service';
/**
 * Mode Transition Validation, Request, Approval, Rejection, and Execution.
 * Requirements: 4.3 Mode Transition Validation
 */
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { type PlatformMode, VALID_MODE_TRANSITIONS, isValidMode } from './platform-mode.types';
import { logModeOperation } from './pending-actions.service';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

/**
 * Enhanced mode transition validation with audit, approval, and cooldown.
 * Requirements: 4.3 Mode Transition Validation
 */
export async function validateModeTransition(
  from: PlatformMode,
  to: PlatformMode,
  tenantId?: string,
  requestedBy?: string
): Promise<{ valid: boolean; reason: string; requiresApproval: boolean; cooldownUntil?: Date }> {
  if (from === to) return { valid: true, reason: 'No change', requiresApproval: false };

  // Basic transition rules
  const allowed = VALID_MODE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return {
      valid: false,
      reason: `Cannot transition from '${from}' to '${to}'. Allowed: ${(allowed || []).join(', ')}`,
      requiresApproval: false,
    };
  }

  // Check cooldown if tenant context provided
  if (tenantId) {
    const schema = tenantSchema(tenantId);
    try {
      const cooldownRes = await safeQuery(
        `SELECT cooldown_until FROM "${schema}".mode_transition_audit
         WHERE tenant_id = $1 AND status = 'approved'
         ORDER BY approved_at DESC LIMIT 1`,
        [tenantId],
      );

      if (cooldownRes.rows.length > 0 && getFirstRow(cooldownRes)?.cooldown_until) {
        const cooldownUntil = new Date(getFirstRow(cooldownRes)?.cooldown_until);
        if (cooldownUntil > new Date()) {
          return {
            valid: false,
            reason: `Mode transition on cooldown until ${cooldownUntil.toISOString()}`,
            requiresApproval: false,
            cooldownUntil,
          };
        }
      }
    } catch { /* fall through */ }

    // Check if transition requires approval (human -> shadow_agent or shadow_agent -> full_autonomous)
    const requiresApproval = (from === 'human' && to === 'shadow_agent') ||
                            (from === 'shadow_agent' && to === 'full_autonomous') ||
                            (from === 'hybrid' && to === 'full_autonomous');

    if (requiresApproval && requestedBy) {
      // Create audit record
      await safeQuery(
        `INSERT INTO "${schema}".mode_transition_audit
         (tenant_id, from_mode, to_mode, requested_by, requested_at, status, requires_approval)
         VALUES ($1, $2, $3, $4, NOW(), 'pending', true)
         RETURNING audit_id`,
        [tenantId, from, to, requestedBy],
      ).catch(catchHandler(EC.EVENT_BUS, {}));

      return {
        valid: true,
        reason: `Transition requires approval. Audit record created.`,
        requiresApproval: true,
      };
    }
  }

  return {
    valid: true,
    reason: `Transition from '${from}' to '${to}' is valid`,
    requiresApproval: false,
  };
}

/**
 * Legacy synchronous validation for backward compatibility.
 */
export function validateModeTransitionSync(from: PlatformMode, to: PlatformMode): { valid: boolean; reason: string } {
  if (from === to) return { valid: true, reason: 'No change' };
  const allowed = VALID_MODE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return { valid: false, reason: `Cannot transition from '${from}' to '${to}'. Allowed: ${(allowed || []).join(', ')}` };
  }
  return { valid: true, reason: `Transition from '${from}' to '${to}' is valid` };
}

/**
 * Get the platform mode for a tenant (workspace table or entitlements fallback).
 */
export async function getTenantPlatformMode(tenantId: string): Promise<PlatformMode> {
  try {
    const result = await safeQuery(
      `SELECT platform_mode FROM workspaces WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    const mode = getFirstRow(result)?.platform_mode;
    if (mode && isValidMode(mode)) return mode;
  } catch { /* fall through */ }

  try {
    const result = await safeQuery(
      `SELECT operation_mode FROM public.tenant_module_entitlements WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    const mode = getFirstRow(result)?.operation_mode;
    if (mode && isValidMode(mode)) return mode;
  } catch { /* fall through */ }

  return 'human';
}

/**
 * Get platform mode for a specific agent (per-agent override or tenant default).
 * Requirements: 4.1 Per-Agent Mode Overrides
 */
export async function getAgentPlatformMode(tenantId: string, agentId: string): Promise<PlatformMode> {
  const schema = tenantSchema(tenantId);

  // Check for agent-specific override
  try {
    const result = await safeQuery(
      `SELECT platform_mode, expires_at, is_active
       FROM "${schema}".agent_mode_overrides
       WHERE tenant_id = $1 AND agent_id = $2 AND is_active = true
       ORDER BY effective_at DESC LIMIT 1`,
      [tenantId, agentId],
    );

    if (result.rows.length > 0) {
      const override = getFirstRow(result);
      // Check if override has expired
      if (!override.expires_at || new Date(override.expires_at) > new Date()) {
        const mode = override.platform_mode;
        if (isValidMode(mode)) return mode;
      }
    }
  } catch { /* fall through to tenant mode */ }

  // Fall back to tenant-level mode
  return getTenantPlatformMode(tenantId);
}

/**
 * Set per-agent mode override.
 * Requirements: 4.1 Per-Agent Mode Overrides
 */
export async function setAgentModeOverride(
  tenantId: string,
  agentId: string,
  mode: PlatformMode,
  setBy: string,
  reason?: string,
  expiresAt?: Date
): Promise<void> {
  if (!isValidMode(mode)) throw new Error(`Invalid platform mode: ${mode}`);

  const schema = tenantSchema(tenantId);
  const currentMode = await getAgentPlatformMode(tenantId, agentId);

  // Validate transition (use sync version for agent overrides)
  const transition = validateModeTransitionSync(currentMode, mode);
  if (!transition.valid) {
    throw new Error(transition.reason);
  }

  await safeQuery(
    `INSERT INTO "${schema}".agent_mode_overrides
     (tenant_id, agent_id, platform_mode, reason, set_by_user_id, effective_at, expires_at, is_active)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6, true)
     ON CONFLICT (tenant_id, agent_id) DO UPDATE SET
       platform_mode = EXCLUDED.platform_mode,
       reason = EXCLUDED.reason,
       set_by_user_id = EXCLUDED.set_by_user_id,
       effective_at = NOW(),
       expires_at = EXCLUDED.expires_at,
       is_active = true,
       updated_at = NOW()`,
    [tenantId, agentId, mode, reason || null, setBy, expiresAt?.toISOString() || null],
  );

  await logModeOperation(tenantId, agentId, mode, { type: 'mode_override', title: `Agent mode override set to ${mode}`, priority: 'medium' }, 'completed');
}

/**
 * Request mode transition (creates audit record, may require approval).
 * Requirements: 4.3 Mode Transition Validation
 */
export async function requestModeTransition(
  tenantId: string,
  toMode: PlatformMode,
  requestedBy: string,
  reason?: string
): Promise<{ auditId: string; requiresApproval: boolean; status: string }> {
  if (!isValidMode(toMode)) throw new Error(`Invalid platform mode: ${toMode}`);

  const currentMode = await getTenantPlatformMode(tenantId);
  const validation = await validateModeTransition(currentMode, toMode, tenantId, requestedBy);

  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const schema = tenantSchema(tenantId);
  const requiresApproval = validation.requiresApproval ||
    (currentMode === 'human' && toMode === 'shadow_agent') ||
    (currentMode === 'shadow_agent' && toMode === 'full_autonomous') ||
    (currentMode === 'hybrid' && toMode === 'full_autonomous');

  const result = await safeQuery(
    `INSERT INTO "${schema}".mode_transition_audit
     (tenant_id, from_mode, to_mode, requested_by, requested_at, status, requires_approval, metadata)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
     RETURNING audit_id, status`,
    [
      tenantId,
      currentMode,
      toMode,
      requestedBy,
      requiresApproval ? 'pending' : 'approved',
      requiresApproval,
      reason ? JSON.stringify({ reason }) : null,
    ],
  );

  const auditId = getFirstRow(result)?.audit_id;
  const status = getFirstRow(result)?.status;

  // If no approval needed, execute immediately
  if (!requiresApproval) {
    await executeModeTransition(tenantId, auditId, requestedBy);
  }

  return { auditId, requiresApproval, status };
}

/**
 * Approve a pending mode transition.
 * Requirements: 4.3 Mode Transition Validation
 */
export async function approveModeTransition(
  tenantId: string,
  auditId: string,
  approvedBy: string,
  role?: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const auditRes = await safeQuery(
    `SELECT * FROM "${schema}".mode_transition_audit
     WHERE audit_id = $1 AND tenant_id = $2 AND status = 'pending'`,
    [auditId, tenantId],
  );

  if (auditRes.rows.length === 0) {
    throw new Error('Transition request not found or already processed');
  }

  const audit = getFirstRow(auditRes);

  // Check role requirement if specified
  if (audit.approval_required_from_role && role !== audit.approval_required_from_role) {
    throw new Error(`Approval requires role: ${audit.approval_required_from_role}`);
  }

  // Update audit record
  await safeQuery(
    `UPDATE "${schema}".mode_transition_audit
     SET status = 'approved', approved_by = $1, approved_at = NOW()
     WHERE audit_id = $2`,
    [approvedBy, auditId],
  );

  // Execute the transition
  await executeModeTransition(tenantId, auditId, approvedBy);
}

/**
 * Reject a pending mode transition.
 * Requirements: 4.3 Mode Transition Validation
 */
export async function rejectModeTransition(
  tenantId: string,
  auditId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".mode_transition_audit
     SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2
     WHERE audit_id = $3 AND tenant_id = $4 AND status = 'pending'`,
    [rejectedBy, reason, auditId, tenantId],
  );
}

/**
 * Execute an approved mode transition (internal helper).
 * Requirements: 4.3 Mode Transition Validation
 */
async function executeModeTransition(tenantId: string, auditId: string, executedBy: string): Promise<void> {
  const schema = tenantSchema(tenantId);

  const auditRes = await safeQuery(
    `SELECT to_mode, from_mode FROM "${schema}".mode_transition_audit
     WHERE audit_id = $1 AND tenant_id = $2`,
    [auditId, tenantId],
  );

  if (auditRes.rows.length === 0) return;
  const toMode = getFirstRow(auditRes)?.to_mode;

  // Apply cooldown (prevent rapid switching)
  const cooldownMinutes = 15; // Configurable
  const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000);

  await safeQuery(
    `UPDATE "${schema}".mode_transition_audit
     SET cooldown_until = $1
     WHERE audit_id = $2`,
    [cooldownUntil.toISOString(), auditId],
  );

  // Update workspace table
  await safeQuery(
    `UPDATE workspaces SET platform_mode = $1 WHERE tenant_id = $2`,
    [toMode, tenantId],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  // Also update entitlements table
  await safeQuery(
    `UPDATE public.tenant_module_entitlements SET operation_mode = $1 WHERE tenant_id = $2`,
    [toMode, tenantId],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  // Auto-assign personal agents when transitioning to hyper/autonomous modes
  if (toMode === 'hybrid' || toMode === 'shadow_agent' || toMode === 'full_autonomous') {
    try {
      const { autoAssignAgentsForTenantMode } = await import('../../../ai/services/personal/personal-agent.service');
      await autoAssignAgentsForTenantMode(tenantId, toMode, executedBy || SYSTEM_JOB_ACTOR);
    } catch (err: unknown) {
      logger.error(`[PlatformMode] Failed to auto-assign agents during mode transition: ${toErrorMessage(err)}`);
      // Don't fail the mode transition if agent assignment fails
    }
  }

  // Log the mode transition
  await logModeOperation(tenantId, 'system', 'platform_mode_change', toMode, 'execute', {
    auditId, executedBy, timestamp: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS, {}));
}

/**
 * Set tenant platform mode with full audit trail.
 * Uses requestModeTransition internally.
 */
export async function setTenantPlatformMode(tenantId: string, mode: PlatformMode, setBy: string): Promise<void> {
  if (!isValidMode(mode)) throw new Error(`Invalid platform mode: ${mode}`);

  // Use requestModeTransition for proper audit trail
  const result = await requestModeTransition(tenantId, mode, setBy);

  // If approval required, throw error (caller should use requestModeTransition + approveModeTransition)
  if (result.requiresApproval) {
    throw new Error(`Mode transition requires approval. Audit ID: ${result.auditId}`);
  }
}
