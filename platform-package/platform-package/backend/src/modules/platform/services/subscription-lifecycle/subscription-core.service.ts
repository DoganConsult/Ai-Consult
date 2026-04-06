// @ts-nocheck
/**
 * Subscription Core Lifecycle Service
 *
 * Handles the primary lifecycle operations: activate, transition,
 * pause, resume, cancel, renew, extend trial, set renewal mode,
 * and downgrade scheduling.
 */

import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../../../platform/dos/observability/logger.service';
import {
  SubscriptionStatus,
  Subscription,
  ActivateSubscriptionRequest,
  TransitionRequest,
  PauseSubscriptionRequest,
  ExtendTrialRequest,
  ScheduleDowngradeRequest,
} from '../subscription-lifecycle.types';
import { getFirstRow } from '../../../../shared/data/db-utils';
import {
  GRACE_PERIOD_DAYS,
  getSubscription,
  validateTransition,
  emitSubscriptionEvent,
  mapStatusToAuditAction,
} from './subscription-helpers.service';
import { writeAuditLog } from './subscription-audit.service';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

// ─── Activate ────────────────────────────────────────────────

export async function activateSubscription(req: ActivateSubscriptionRequest): Promise<Subscription> {
  const existing = await getSubscription(req.tenantId);
  const oldState = existing ? { status: existing.status, tier: existing.tier } : null;

  if (existing && (existing.status as string) !== 'trial_active' && (existing.status as string) !== 'trialing' &&
      (existing.status as string) !== 'trial_expired' &&
      (existing.status as string) !== 'expired' && (existing.status as string) !== 'cancelled' && (existing.status as string) !== 'preview') {
    if ((existing.status as string) === 'active') {
      const result = await safeQuery(
        `UPDATE public.subscriptions SET
          tier = $2, billing_cycle = $3,
          updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING *`,
        [
          req.tenantId, req.tier, req.billingCycle || 'monthly',
        ]
      );
      return getFirstRow(result);
    }
    if (!validateTransition(existing.status as SubscriptionStatus, 'active')) {
      throw new Error(`Cannot activate: invalid transition from '${existing.status}' to 'active'`);
    }
  }

  const billingCycle = req.billingCycle || 'monthly';
  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400000);

  const result = await safeQuery(
    `INSERT INTO public.subscriptions
      (tenant_id, tier, status, billing_cycle,
       current_period_start, current_period_end, renewal_mode)
     VALUES ($1, $2, 'active', $3, $4, $5, 'auto')
     ON CONFLICT (tenant_id) DO UPDATE SET
      tier = EXCLUDED.tier, status = 'active', billing_cycle = EXCLUDED.billing_cycle,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      renewal_mode = COALESCE(public.subscriptions.renewal_mode, 'auto'),
      grace_ends_at = NULL, cancelled_at = NULL,
      pause_starts_at = NULL, pause_ends_at = NULL,
      renewal_retry_count = 0, last_renewal_attempt_at = NULL,
      updated_at = NOW()
     RETURNING *`,
    [
      req.tenantId, req.tier, billingCycle,
      periodStart, periodEnd,
    ]
  );

  const sub = getFirstRow(result);

  await writeAuditLog(req.tenantId, 'activated', oldState, { status: 'active', tier: req.tier }, req.performedBy);
  emitSubscriptionEvent('subscription.activated', req.tenantId, sub.id, 'info', {
    tier: req.tier, billingCycle: req.billingCycle,
  });

  logger.info(`Subscription activated for tenant ${req.tenantId}`, { tier: req.tier });
  return sub;
}

// ─── Transition ──────────────────────────────────────────────

export async function transitionStatus(req: TransitionRequest): Promise<Subscription> {
  const existing = await getSubscription(req.tenantId);
  if (!existing) {
    throw new Error(`No subscription found for tenant ${req.tenantId}`);
  }

  const fromStatus = existing.status as SubscriptionStatus;
  if (!validateTransition(fromStatus, req.toStatus)) {
    throw new Error(`Invalid transition from '${fromStatus}' to '${req.toStatus}'`);
  }

  const oldState = { status: existing.status, tier: existing.tier };

  const extraSets: string[] = [];
  const extraParams: any[] = [];
  let paramIdx = 3;

  if (req.toStatus === 'grace_period') {
    paramIdx++;
    extraSets.push(`grace_ends_at = $${paramIdx}`);
    extraParams.push(new Date(Date.now() + GRACE_PERIOD_DAYS * 86400000));
  }

  if (fromStatus === 'grace_period' && req.toStatus !== 'grace_period') {
    extraSets.push('grace_ends_at = NULL');
  }

  if (req.toStatus === 'cancelled') {
    extraSets.push('cancelled_at = NOW()');
  }

  if (req.reason) {
    extraSets.push('last_status_reason = $' + (++paramIdx));
    extraParams.push(req.reason);
  }

  const setClauses = [`status = $2`, `updated_at = NOW()`, ...extraSets].join(', ');

  const result = await safeQuery(
    `UPDATE public.subscriptions SET ${setClauses} WHERE tenant_id = $1 RETURNING *`,
    [req.tenantId, req.toStatus, ...extraParams]
  );

  const sub = getFirstRow(result);

  const auditAction = mapStatusToAuditAction(fromStatus, req.toStatus);
  await writeAuditLog(req.tenantId, auditAction, oldState, { status: req.toStatus }, req.performedBy, req.reason);

  emitSubscriptionEvent(`subscription.${req.toStatus}`, req.tenantId, sub.id,
    req.toStatus === 'expired' || req.toStatus === 'suspended' ? 'critical' : 'info',
    { from: fromStatus, to: req.toStatus, reason: req.reason }
  );

  logger.info(`Subscription transitioned ${fromStatus} → ${req.toStatus} for tenant ${req.tenantId}`);
  return sub;
}

// ─── Pause / Resume ──────────────────────────────────────────

export async function pauseSubscription(req: PauseSubscriptionRequest): Promise<Subscription> {
  const existing = await getSubscription(req.tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${req.tenantId}`);
  if (!validateTransition(existing.status as SubscriptionStatus, 'paused')) {
    throw new Error(`Cannot pause: subscription is in '${existing.status}' state`);
  }

  const pauseUntil = req.resumeDate || new Date(Date.now() + 30 * 86400000).toISOString();

  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      status = 'paused', pause_starts_at = NOW(), pause_ends_at = $2, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [req.tenantId, pauseUntil]
  );

  const sub = getFirstRow(result);
  await writeAuditLog(req.tenantId, 'paused', { status: existing.status }, { status: 'paused', pauseUntil }, req.performedBy, req.reason);
  emitSubscriptionEvent('subscription.paused', req.tenantId, sub.id, 'warning', { pauseUntil });
  logger.info(`Subscription paused for tenant ${req.tenantId} until ${pauseUntil}`);
  return sub;
}

export async function resumeSubscription(tenantId: string, performedBy?: string): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${tenantId}`);
  if ((existing.status as string) !== 'paused') {
    throw new Error(`Cannot resume: subscription is in '${existing.status}' state, not 'paused'`);
  }

  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      status = 'active', pause_starts_at = NULL, pause_ends_at = NULL, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId]
  );

  const sub = getFirstRow(result);
  await writeAuditLog(tenantId, 'resumed', { status: 'paused' }, { status: 'active' }, performedBy);
  emitSubscriptionEvent('subscription.resumed', tenantId, sub.id, 'info', {});
  logger.info(`Subscription resumed for tenant ${tenantId}`);
  return sub;
}

// ─── Trial Extension ─────────────────────────────────────────

export async function extendTrial(req: ExtendTrialRequest): Promise<Subscription> {
  const existing = await getSubscription(req.tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${req.tenantId}`);
  if ((existing.status as string) !== 'trial_active' && (existing.status as string) !== 'trialing') {
    throw new Error(`Cannot extend trial: subscription is in '${existing.status}' state`);
  }

  const currentEnd = existing.trial_ends_at ? new Date(existing.trial_ends_at) : new Date();
  const newEnd = new Date(currentEnd.getTime() + req.extensionDays * 86400000);

  const result = await safeQuery(
    `UPDATE public.subscriptions SET trial_ends_at = $2, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [req.tenantId, newEnd]
  );

  const sub = getFirstRow(result);
  await writeAuditLog(req.tenantId, 'trial_extended',
    { trial_ends_at: existing.trial_ends_at },
    { trial_ends_at: newEnd.toISOString(), extensionDays: req.extensionDays },
    req.performedBy, req.reason
  );
  emitSubscriptionEvent('subscription.trial_extended', req.tenantId, sub.id, 'info', {
    extensionDays: req.extensionDays, newEnd: newEnd.toISOString(),
  });
  logger.info(`Trial extended by ${req.extensionDays} days for tenant ${req.tenantId}`);
  return sub;
}

// ─── Downgrade Scheduling ────────────────────────────────────

export async function scheduleDowngrade(req: ScheduleDowngradeRequest): Promise<Subscription> {
  const existing = await getSubscription(req.tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${req.tenantId}`);

  const effectiveAt = req.effectiveDate || existing.current_period_end || new Date().toISOString();

  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      downgrade_scheduled_tier = $2, downgrade_scheduled_at = $3, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [req.tenantId, req.targetTier, effectiveAt]
  );

  const sub = getFirstRow(result);
  await writeAuditLog(req.tenantId, 'downgrade_scheduled',
    { tier: existing.tier },
    { targetTier: req.targetTier, effectiveAt },
    req.performedBy, req.reason
  );
  emitSubscriptionEvent('subscription.downgrade_scheduled', req.tenantId, sub.id, 'info', {
    currentTier: existing.tier, targetTier: req.targetTier, effectiveAt,
  });
  logger.info(`Downgrade scheduled for tenant ${req.tenantId}: ${existing.tier} → ${req.targetTier} at ${effectiveAt}`);
  return sub;
}

export async function cancelScheduledDowngrade(tenantId: string, performedBy?: string): Promise<Subscription> {
  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      downgrade_scheduled_tier = NULL, downgrade_scheduled_at = NULL, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId]
  );
  if (!getFirstRow(result)) throw new Error(`No subscription found for tenant ${tenantId}`);

  const sub = getFirstRow(result);
  await writeAuditLog(tenantId, 'downgrade_cancelled', { downgrade_scheduled_tier: sub.downgrade_scheduled_tier }, null, performedBy);
  emitSubscriptionEvent('subscription.downgrade_cancelled', tenantId, sub.id, 'info', {});
  return sub;
}

export async function executeScheduledDowngrades(): Promise<number> {
  const result = await safeQuery(
    `SELECT * FROM public.subscriptions
     WHERE downgrade_scheduled_at IS NOT NULL AND downgrade_scheduled_at <= NOW()
       AND downgrade_scheduled_tier IS NOT NULL`,
    []
  );

  let count = 0;
  for (const sub of result.rows) {
    try {
      const oldTier = sub.tier;
      await safeQuery(
        `UPDATE public.subscriptions SET
          tier = downgrade_scheduled_tier,
          downgrade_scheduled_tier = NULL, downgrade_scheduled_at = NULL,
          updated_at = NOW()
        WHERE id = $1`,
        [sub.id]
      );
      await writeAuditLog(sub.tenant_id, 'tier_downgraded',
        { tier: oldTier },
        { tier: sub.downgrade_scheduled_tier },
        'system', 'Scheduled downgrade executed'
      );
      emitSubscriptionEvent('subscription.tier_downgraded', sub.tenant_id, sub.id, 'warning', {
        from: oldTier, to: sub.downgrade_scheduled_tier,
      });
      count++;
      logger.info(`Executed scheduled downgrade for tenant ${sub.tenant_id}: ${oldTier} → ${sub.downgrade_scheduled_tier}`);
    } catch (err) {
      logger.error(`Failed to execute downgrade for tenant ${sub.tenant_id}`, { err });
    }
  }
  return count;
}

// ─── Cancel ──────────────────────────────────────────────────

export async function cancelSubscription(
  tenantId: string, reason?: string, performedBy?: string
): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${tenantId}`);
  if (!validateTransition(existing.status as SubscriptionStatus, 'cancelled')) {
    throw new Error(`Cannot cancel: subscription is in '${existing.status}' state`);
  }

  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      status = 'cancelled', cancelled_at = NOW(),
      downgrade_scheduled_tier = NULL, downgrade_scheduled_at = NULL,
      pause_starts_at = NULL, pause_ends_at = NULL,
      last_status_reason = $2,
      updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId, reason || null]
  );

  const sub = getFirstRow(result);
  await writeAuditLog(tenantId, 'cancelled', { status: existing.status }, { status: 'cancelled' }, performedBy, reason);
  emitSubscriptionEvent('subscription.cancelled', tenantId, sub.id, 'warning', { reason });
  logger.info(`Subscription cancelled for tenant ${tenantId}`);
  return sub;
}

// ─── Renew ───────────────────────────────────────────────────

export async function renewSubscription(
  tenantId: string, periodStart: Date | string, periodEnd: Date | string, performedBy?: string
): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${tenantId}`);

  const needsActivation = (existing.status as string) !== 'active' && (existing.status as string) !== 'renewal_due';
  const newStatus = needsActivation ? 'active' : existing.status;

  if (needsActivation && !validateTransition(existing.status as SubscriptionStatus, 'active')) {
    throw new Error(`Cannot renew: transition from '${existing.status}' to 'active' is invalid`);
  }

  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      status = $2, current_period_start = $3, current_period_end = $4,
      grace_ends_at = NULL, renewal_retry_count = 0, last_renewal_attempt_at = NULL,
      updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId, newStatus, periodStart, periodEnd]
  );

  const sub = getFirstRow(result);
  await writeAuditLog(tenantId, 'renewed',
    { status: existing.status, current_period_end: existing.current_period_end },
    { status: newStatus, current_period_start: periodStart, current_period_end: periodEnd },
    performedBy || SYSTEM_JOB_ACTOR
  );
  emitSubscriptionEvent('subscription.renewed', tenantId, sub.id, 'info', {
    periodStart, periodEnd,
  });
  logger.info(`Subscription renewed for tenant ${tenantId}`);
  return sub;
}

// ─── Renewal Mode ────────────────────────────────────────────

export async function setRenewalMode(
  tenantId: string, mode: 'auto' | 'manual', performedBy?: string
): Promise<Subscription> {
  const result = await safeQuery(
    `UPDATE public.subscriptions SET renewal_mode = $2, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId, mode]
  );
  if (!getFirstRow(result)) throw new Error(`No subscription found for tenant ${tenantId}`);

  const sub = getFirstRow(result);
  await writeAuditLog(tenantId, 'renewal_mode_changed', null, { renewal_mode: mode }, performedBy);
  return sub;
}
