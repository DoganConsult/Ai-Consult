// @ts-nocheck
/**
 * Subscription Extensions Service
 *
 * Manages the extension request workflow (request, approve, reject, apply)
 * and subscription change requests.
 */

import { safeQuery } from '../../../../config/database/database';
import {
  ExtensionType,
  _Subscription,
  SubscriptionExtension,
  SubscriptionChangeRequest,
} from '../subscription-lifecycle.types';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { getSubscription, emitSubscriptionEvent } from './subscription-helpers.service';
import { writeAuditLog } from './subscription-audit.service';

// ─── Extension Workflow ──────────────────────────────────────

export async function requestExtension(
  tenantId: string, extensionType: ExtensionType, days: number, reason: string, requestedBy: string
): Promise<SubscriptionExtension> {
  const result = await safeQuery(
    `INSERT INTO public.subscription_extensions
      (tenant_id, extension_type, extension_days, reason, status, requested_by)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     RETURNING *`,
    [tenantId, extensionType, days, reason, requestedBy]
  );
  const ext = getFirstRow(result);
  await writeAuditLog(tenantId, 'extension_requested', null, { extensionType, days, reason }, requestedBy);
  emitSubscriptionEvent('subscription.extended', tenantId, ext.extension_id, 'info', { extensionType, days, reason });
  return ext;
}

export async function approveExtension(extensionId: string, approvedBy: string, notes?: string): Promise<SubscriptionExtension> {
  const result = await safeQuery(
    `UPDATE public.subscription_extensions SET
      status = 'approved', approved_by = $2, approved_at = NOW(), decision_notes = $3
     WHERE extension_id = $1 AND status = 'pending'
     RETURNING *`,
    [extensionId, approvedBy, notes || null]
  );
  if (!getFirstRow(result)) throw new Error('Extension not found or already processed');
  const ext = getFirstRow(result);
  await writeAuditLog(ext.tenant_id, 'extension_approved', null, { extensionId, days: ext.extension_days }, approvedBy, notes);
  return ext;
}

export async function rejectExtension(extensionId: string, rejectedBy: string, notes?: string): Promise<SubscriptionExtension> {
  const result = await safeQuery(
    `UPDATE public.subscription_extensions SET
      status = 'rejected', approved_by = $2, approved_at = NOW(), decision_notes = $3
     WHERE extension_id = $1 AND status = 'pending'
     RETURNING *`,
    [extensionId, rejectedBy, notes || null]
  );
  if (!getFirstRow(result)) throw new Error('Extension not found or already processed');
  const ext = getFirstRow(result);
  await writeAuditLog(ext.tenant_id, 'extension_rejected', null, { extensionId }, rejectedBy, notes);
  return ext;
}

export async function applyExtension(extensionId: string): Promise<SubscriptionExtension> {
  const extResult = await safeQuery(
    `SELECT * FROM public.subscription_extensions WHERE extension_id = $1 AND status = 'approved'`,
    [extensionId]
  );
  if (!getFirstRow(extResult)) throw new Error('Extension not found or not approved');
  const ext = getFirstRow(extResult);

  const sub = await getSubscription(ext.tenant_id);
  if (!sub) throw new Error(`No subscription found for tenant ${ext.tenant_id}`);

  const isTrialExt = ext.extension_type === 'trial';
  const dateField = isTrialExt ? 'trial_ends_at' : 'current_period_end';
  const currentDate = sub[dateField] ? new Date(sub[dateField] as string) : new Date();
  const newDate = new Date(currentDate.getTime() + ext.extension_days * 86400000);

  await safeQuery(
    `UPDATE public.subscriptions SET ${dateField} = $2, updated_at = NOW()
     WHERE tenant_id = $1`,
    [ext.tenant_id, newDate]
  );

  await safeQuery(
    `UPDATE public.subscription_extensions SET status = 'applied', applied_at = NOW()
     WHERE extension_id = $1`,
    [extensionId]
  );

  await writeAuditLog(ext.tenant_id, 'extension_applied',
    { [dateField]: currentDate.toISOString() },
    { [dateField]: newDate.toISOString(), extension_days: ext.extension_days },
    ext.approved_by || 'system'
  );

  const updated = await safeQuery(`SELECT * FROM public.subscription_extensions WHERE extension_id = $1`, [extensionId]);
  return getFirstRow(updated);
}

export async function getExtensions(tenantId: string): Promise<SubscriptionExtension[]> {
  const result = await safeQuery(
    `SELECT * FROM public.subscription_extensions WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows;
}

// ─── Change Requests ─────────────────────────────────────────

export async function createChangeRequest(
  tenantId: string, requestType: string, targetTier: string | null, reason: string, requestedBy: string, effectiveMode?: string
): Promise<SubscriptionChangeRequest> {
  const result = await safeQuery(
    `INSERT INTO public.subscription_change_requests
      (tenant_id, request_type, target_tier, reason, status, requested_by, effective_mode)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6)
     RETURNING *`,
    [tenantId, requestType, targetTier, reason, requestedBy, effectiveMode || 'immediate']
  );
  return getFirstRow(result);
}
