/**
 * Subscription Audit Service
 *
 * Writes and queries the subscription audit log. Every state change
 * across the lifecycle records an immutable audit entry.
 */

import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { AuditAction, SubscriptionAuditEntry } from '../subscription-lifecycle.types';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

// ─── Audit Log Write ─────────────────────────────────────────

export async function writeAuditLog(
  tenantId: string,
  action: AuditAction,
  oldState: Record<string, any> | null,
  newState: Record<string, any> | null,
  performedBy?: string,
  reason?: string
): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.subscription_audit_log
        (tenant_id, action, old_state, new_state, performed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tenantId,
        action,
        oldState ? JSON.stringify(oldState) : null,
        newState ? JSON.stringify(newState) : null,
        performedBy || SYSTEM_JOB_ACTOR,
        reason || null,
      ]
    );
  } catch (err) {
    logger.error('Failed to write subscription audit log', { tenantId, action, err });
  }
}

// ─── Audit Log Query ─────────────────────────────────────────

export async function getAuditLog(tenantId: string, limit = 50): Promise<SubscriptionAuditEntry[]> {
  const result = await safeQuery(
    `SELECT * FROM public.subscription_audit_log WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit]
  );
  return result.rows;
}
