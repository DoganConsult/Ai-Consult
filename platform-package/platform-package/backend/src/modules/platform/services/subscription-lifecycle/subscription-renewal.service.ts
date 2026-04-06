// @ts-nocheck
/**
 * Subscription Renewal Service
 *
 * Handles renewal failure tracking, automatic re-renewal after payment,
 * and sending renewal reminder notifications at configured intervals.
 */

import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { Subscription } from '../subscription-lifecycle.types';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { getSubscription, emitSubscriptionEvent } from './subscription-helpers.service';
import { writeAuditLog } from './subscription-audit.service';
import { renewSubscription } from './subscription-core.service';

// ─── Renewal Failure Handling ────────────────────────────────

export async function handleRenewalFailure(tenantId: string, details?: Record<string, any>): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${tenantId}`);

  const retryCount = ((existing as any).renewal_retry_count || 0) + 1;

  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      renewal_retry_count = $2, last_renewal_attempt_at = NOW(),
      status = CASE WHEN $3 >= 3 THEN 'past_due' ELSE status END,
      last_status_reason = 'Payment failed',
      updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId, retryCount, retryCount]
  );

  const sub = getFirstRow(result);

  await writeAuditLog(tenantId, 'payment_failed',
    { status: existing.status, renewal_retry_count: (existing as any).renewal_retry_count },
    { renewal_retry_count: retryCount, status: sub.status },
    'system', `Renewal failure #${retryCount}`
  );
  emitSubscriptionEvent('subscription.payment_failed', tenantId, sub.id, 'warning', {
    retryCount, ...details,
  });

  logger.info(`Renewal failure #${retryCount} for tenant ${tenantId}`);
  return sub;
}

export async function markRenewed(tenantId: string, _payload: { paymentId?: string; amount?: number; currency?: string; gateway?: string }): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  if (!existing) throw new Error(`No subscription found for tenant ${tenantId}`);

  const cycle = existing.billing_cycle || 'monthly';
  const daysToAdd = cycle === 'annual' ? 365 : 30;
  const currentEnd = existing.current_period_end ? new Date(existing.current_period_end) : new Date();
  const newStart = new Date(Math.max(currentEnd.getTime(), Date.now()));
  const newEnd = new Date(newStart.getTime() + daysToAdd * 86400000);

  return renewSubscription(tenantId, newStart, newEnd, 'system');
}

// ─── Renewal Reminders ───────────────────────────────────────

type RenewalReminderType = 'renewal_30d' | 'renewal_14d' | 'renewal_7d' | 'renewal_3d' | 'renewal_1d' | 'renewal_day';

export async function checkAndSendRenewalReminders(): Promise<number> {
  const REMINDER_DAYS: { days: number; type: RenewalReminderType }[] = [
    { days: 30, type: 'renewal_30d' },
    { days: 14, type: 'renewal_14d' },
    { days: 7, type: 'renewal_7d' },
    { days: 3, type: 'renewal_3d' },
    { days: 1, type: 'renewal_1d' },
    { days: 0, type: 'renewal_day' },
  ];

  let sent = 0;
  const activeSubs = await safeQuery(
    `SELECT * FROM public.subscriptions WHERE status IN ('active', 'renewal_due') AND current_period_end IS NOT NULL`,
    []
  );

  for (const sub of activeSubs.rows) {
    const periodEnd = new Date(sub.current_period_end);
    const daysLeft = Math.ceil((periodEnd.getTime() - Date.now()) / 86400000);

    for (const reminder of REMINDER_DAYS) {
      if (daysLeft <= reminder.days && daysLeft > (reminder.days - 1 < 0 ? -1 : reminder.days - 1)) {
        const alreadySent = await safeQuery(
          `SELECT 1 FROM public.subscription_notifications_log
           WHERE tenant_id = $1 AND event_type = $2
             AND sent_at > NOW() - INTERVAL '2 days'`,
          [sub.tenant_id, reminder.type]
        );
        if (alreadySent.rows.length === 0) {
          await safeQuery(
            `INSERT INTO public.subscription_notifications_log
              (tenant_id, event_type, channel, status)
             VALUES ($1, $2, 'both', 'sent')`,
            [sub.tenant_id, reminder.type]
          );
          await writeAuditLog(sub.tenant_id, 'renewal_reminder_sent', null, { reminderType: reminder.type, daysLeft }, 'system');
          emitSubscriptionEvent(`subscription.renewal_due`, sub.tenant_id, sub.id, 'info', { daysLeft, reminderType: reminder.type });
          sent++;
        }
      }
    }

    if (daysLeft <= 0 && (sub.status as string) === 'active') {
      try {
        await safeQuery(
          `UPDATE public.subscriptions SET status = 'renewal_due', updated_at = NOW() WHERE tenant_id = $1 AND status = 'active'`,
          [sub.tenant_id]
        );
      } catch { /* */ }
    }
  }

  if (sent > 0) logger.info(`Sent ${sent} renewal reminders`);
  return sent;
}
