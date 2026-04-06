// ============================================
// DOS Tenancy — Tenant Status Service
// Tenant activation state management:
// status transitions with validation, audit
// trail of all transitions, and state-machine
// enforcement of valid transition paths.
// ============================================

import { safeQuery } from '../../../config/database';
import { logger } from '../observability/logger.service';
import { toErrorMessage } from '../../../utils/http-error.util';
import { randomUUID } from 'crypto';

// ── Types ──

export type TenantStatus = 'provisioning' | 'active' | 'suspended' | 'decommissioned' | 'deleted';

export interface TenantStatusRecord {
  tenant_id: string;
  status: TenantStatus;
  last_transition_at: string;
  last_transition_by: string | null;
  last_transition_reason: string | null;
}

export interface StatusTransitionRecord {
  transition_id: string;
  tenant_id: string;
  from_status: TenantStatus;
  to_status: TenantStatus;
  transitioned_by: string;
  reason: string | null;
  transitioned_at: string;
}

/**
 * Allowed state transitions enforced as a directed graph.
 * provisioning → active
 * active → suspended
 * active → decommissioned
 * suspended → active (reactivation)
 * suspended → decommissioned
 */
const VALID_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  provisioning: ['active'],
  active: ['suspended', 'decommissioned'],
  suspended: ['active', 'decommissioned'],
  decommissioned: [],
  deleted: [],
};

// ── Service Functions ──

/**
 * Get the current status of a tenant along with its last transition metadata.
 * Returns null if the tenant does not exist.
 */
export async function getTenantStatus(tenantId: string): Promise<TenantStatusRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT t.tenant_id, t.status,
              COALESCE(t.updated_at, t.created_at) AS last_transition_at,
              h.transitioned_by AS last_transition_by,
              h.reason AS last_transition_reason
       FROM dos.tenants t
       LEFT JOIN LATERAL (
         SELECT transitioned_by, reason
         FROM dos.tenant_status_transitions
         WHERE tenant_id = t.tenant_id
         ORDER BY transitioned_at DESC
         LIMIT 1
       ) h ON true
       WHERE t.tenant_id = $1`,
      [tenantId],
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as TenantStatusRecord;
  } catch (err) {
    logger.error('[DOS TenantStatus] Failed to get tenant status', { tenantId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Activate a tenant — transition from 'provisioning' to 'active'.
 * Records the activation timestamp and creates an audit trail entry.
 */
export async function activateTenant(
  tenantId: string,
  activatedBy: string,
): Promise<TenantStatusRecord> {
  return performTransition(tenantId, 'active', activatedBy, 'Tenant activated');
}

/**
 * Suspend a tenant — transition from 'active' to 'suspended'.
 * Requires a reason for the suspension (audit requirement).
 */
export async function suspendTenant(
  tenantId: string,
  reason: string,
  suspendedBy: string,
): Promise<TenantStatusRecord> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Suspension reason is required');
  }
  return performTransition(tenantId, 'suspended', suspendedBy, reason);
}

/**
 * Reactivate a previously suspended tenant — transition from 'suspended' to 'active'.
 */
export async function reactivateTenant(
  tenantId: string,
  reactivatedBy: string,
): Promise<TenantStatusRecord> {
  return performTransition(tenantId, 'active', reactivatedBy, 'Tenant reactivated from suspension');
}

/**
 * Decommission a tenant — terminal state transition from 'active' or 'suspended'.
 * Once decommissioned, the tenant cannot be reactivated.
 */
export async function decommissionTenant(
  tenantId: string,
  decommissionedBy: string,
): Promise<TenantStatusRecord> {
  return performTransition(tenantId, 'decommissioned', decommissionedBy, 'Tenant decommissioned');
}

/**
 * Retrieve the full audit trail of status transitions for a tenant,
 * ordered from oldest to newest.
 */
export async function getTenantStatusHistory(
  tenantId: string,
): Promise<StatusTransitionRecord[]> {
  try {
    const result = await safeQuery(
      `SELECT transition_id, tenant_id, from_status, to_status,
              transitioned_by, reason, transitioned_at
       FROM dos.tenant_status_transitions
       WHERE tenant_id = $1
       ORDER BY transitioned_at ASC`,
      [tenantId],
    );
    return result.rows as StatusTransitionRecord[];
  } catch (err) {
    logger.error('[DOS TenantStatus] Failed to get status history', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

/**
 * Check whether a transition to the target status is valid for the tenant's
 * current state. Returns true if the transition is allowed, false otherwise.
 */
export async function canTransitionTo(
  tenantId: string,
  targetStatus: TenantStatus,
): Promise<boolean> {
  try {
    const current = await getTenantStatus(tenantId);
    if (!current) return false;

    const allowed = VALID_TRANSITIONS[current.status] || [];
    return allowed.includes(targetStatus);
  } catch (err) {
    logger.error('[DOS TenantStatus] Failed to check transition validity', {
      tenantId, targetStatus, error: toErrorMessage(err),
    });
    // Law 11: deny by default
    return false;
  }
}

// ── Internal Helpers ──

/**
 * Core transition engine: validates the transition, updates the tenant row,
 * and inserts an audit trail record in a single logical operation.
 */
async function performTransition(
  tenantId: string,
  targetStatus: TenantStatus,
  performedBy: string,
  reason: string,
): Promise<TenantStatusRecord> {
  // Fetch current status
  const current = await getTenantStatus(tenantId);
  if (!current) {
    throw new Error(`Tenant '${tenantId}' not found`);
  }

  const fromStatus = current.status;

  // Validate transition is allowed
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid status transition: '${fromStatus}' → '${targetStatus}'. ` +
      `Allowed transitions from '${fromStatus}': [${allowed.join(', ')}]`,
    );
  }

  try {
    // Update the tenant status
    const activatedClause = targetStatus === 'active' ? ', activated_at = NOW()' : '';
    await safeQuery(
      `UPDATE dos.tenants
       SET status = $1, updated_at = NOW()${activatedClause}
       WHERE tenant_id = $2`,
      [targetStatus, tenantId],
    );

    // Record the transition in the audit trail
    const transitionId = randomUUID();
    await safeQuery(
      `INSERT INTO dos.tenant_status_transitions
         (transition_id, tenant_id, from_status, to_status, transitioned_by, reason, transitioned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [transitionId, tenantId, fromStatus, targetStatus, performedBy, reason],
    );

    logger.info('[DOS TenantStatus] Status transition recorded', {
      tenantId, from: fromStatus, to: targetStatus, by: performedBy,
    });

    // Return the updated status record
    const updated = await getTenantStatus(tenantId);
    if (!updated) {
      throw new Error('Tenant status could not be retrieved after transition');
    }
    return updated;
  } catch (err) {
    // Re-throw known validation errors
    if (err instanceof Error && err.message.includes('Invalid status transition')) {
      throw err;
    }
    logger.error('[DOS TenantStatus] Failed to perform status transition', {
      tenantId, from: fromStatus, to: targetStatus, error: toErrorMessage(err),
    });
    throw err;
  }
}

// ── Namespace Export ──

export const TenantStatusService = {
  getTenantStatus,
  activateTenant,
  suspendTenant,
  reactivateTenant,
  decommissionTenant,
  getTenantStatusHistory,
  canTransitionTo,
};
