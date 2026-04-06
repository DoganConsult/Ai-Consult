// @ts-nocheck
/**
 * Subscription Batch Processing Service
 *
 * Cron-driven batch operations: expire trials, transition past-due
 * subscriptions into grace periods, expire grace periods, auto-resume
 * paused subscriptions, and capture usage snapshots.
 */

import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { GRACE_PERIOD_DAYS, getSubscription, emitSubscriptionEvent } from './subscription-helpers.service';
import { writeAuditLog } from './subscription-audit.service';
import { executeScheduledDowngrades } from './subscription-core.service';
import { checkAndSendRenewalReminders } from './subscription-renewal.service';

// ─── Expired Trials ──────────────────────────────────────────

export async function processExpiredTrials(): Promise<number> {
  const result = await safeQuery(
    `UPDATE public.subscriptions SET status = 'trial_expired', updated_at = NOW()
     WHERE status IN ('trial_active', 'trialing')
       AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW()
     RETURNING tenant_id, id`,
    []
  );
  for (const row of result.rows) {
    await writeAuditLog(row.tenant_id, 'trial_extended', { status: 'trial_active' }, { status: 'trial_expired' }, 'system', 'Trial period ended');
    emitSubscriptionEvent('subscription.trial_expired', row.tenant_id, row.id, 'warning', {});
  }
  if (result.rows.length > 0) {
    logger.info(`Processed ${result.rows.length} expired trials`);
  }
  return result.rows.length;
}

// ─── Expired Periods ─────────────────────────────────────────

export async function processExpiredPeriods(): Promise<number> {
  const result = await safeQuery(
    `UPDATE public.subscriptions SET status = 'past_due', updated_at = NOW()
     WHERE status = 'active'
       AND current_period_end IS NOT NULL AND current_period_end < NOW()
       AND renewal_mode = 'manual'
     RETURNING tenant_id, id`,
    []
  );
  for (const row of result.rows) {
    await writeAuditLog(row.tenant_id, 'payment_failed', { status: 'active' }, { status: 'past_due' }, 'system', 'Period expired without renewal');
    emitSubscriptionEvent('subscription.past_due', row.tenant_id, row.id, 'warning', {});
  }
  if (result.rows.length > 0) {
    logger.info(`Processed ${result.rows.length} expired periods → past_due`);
  }
  return result.rows.length;
}

// ─── Grace Period Entry ──────────────────────────────────────

export async function processGracePeriodEntries(): Promise<number> {
  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      status = 'grace_period',
      grace_ends_at = NOW() + INTERVAL '${GRACE_PERIOD_DAYS} days',
      updated_at = NOW()
     WHERE status = 'past_due'
       AND grace_ends_at IS NULL
       AND updated_at < NOW() - INTERVAL '3 days'
     RETURNING tenant_id, id`,
    []
  );
  for (const row of result.rows) {
    await writeAuditLog(row.tenant_id, 'grace_period_entered', { status: 'past_due' }, { status: 'grace_period' }, 'system');
    emitSubscriptionEvent('subscription.grace_period_entered', row.tenant_id, row.id, 'critical', { graceDays: GRACE_PERIOD_DAYS });
  }
  if (result.rows.length > 0) {
    logger.info(`Moved ${result.rows.length} subscriptions into grace period`);
  }
  return result.rows.length;
}

// ─── Grace Period Expiration ─────────────────────────────────

export async function processGracePeriodExpirations(): Promise<number> {
  const result = await safeQuery(
    `UPDATE public.subscriptions SET status = 'expired', updated_at = NOW()
     WHERE status = 'grace_period'
       AND grace_ends_at IS NOT NULL AND grace_ends_at < NOW()
     RETURNING tenant_id, id`,
    []
  );
  for (const row of result.rows) {
    await writeAuditLog(row.tenant_id, 'grace_period_expired', { status: 'grace_period' }, { status: 'expired' }, 'system');
    emitSubscriptionEvent('subscription.expired', row.tenant_id, row.id, 'critical', { reason: 'Grace period ended' });
  }
  if (result.rows.length > 0) {
    logger.info(`Expired ${result.rows.length} subscriptions (grace period ended)`);
  }
  return result.rows.length;
}

// ─── Expired Pauses ──────────────────────────────────────────

export async function processExpiredPauses(): Promise<number> {
  const result = await safeQuery(
    `UPDATE public.subscriptions SET
      status = 'active', pause_starts_at = NULL, pause_ends_at = NULL, updated_at = NOW()
     WHERE status = 'paused'
       AND pause_ends_at IS NOT NULL AND pause_ends_at < NOW()
     RETURNING tenant_id, id`,
    []
  );
  for (const row of result.rows) {
    await writeAuditLog(row.tenant_id, 'resumed', { status: 'paused' }, { status: 'active' }, 'system', 'Pause period ended');
    emitSubscriptionEvent('subscription.resumed', row.tenant_id, row.id, 'info', { reason: 'Pause period ended' });
  }
  if (result.rows.length > 0) {
    logger.info(`Auto-resumed ${result.rows.length} paused subscriptions`);
  }
  return result.rows.length;
}

// ─── Usage Snapshot ──────────────────────────────────────────

export async function captureUsageSnapshot(tenantId: string): Promise<void> {
  try {
    const sub = await getSubscription(tenantId);
    if (!sub) return;

    let usersCount = 0, frameworksCount = 0;
    try {
      const uRes = await safeQuery(`SELECT COUNT(*)::int AS count FROM public.users WHERE tenant_id = $1`, [tenantId]);
      usersCount = getFirstRow(uRes)?.count || 0;
    } catch { /* */ }
    try {
      const fRes = await safeQuery(`SELECT COUNT(*)::int AS count FROM public.tenant_frameworks WHERE tenant_id = $1`, [tenantId]);
      frameworksCount = getFirstRow(fRes)?.count || 0;
    } catch { /* */ }

    await safeQuery(
      `INSERT INTO public.usage_snapshots
        (tenant_id, tier, users_count, frameworks_count, controls_count, risks_count, storage_mb, snapshot_date)
       VALUES ($1, $2, $3, $4, 0, 0, 0, CURRENT_DATE)
       ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET
        users_count = EXCLUDED.users_count, frameworks_count = EXCLUDED.frameworks_count`,
      [tenantId, sub.tier, usersCount, frameworksCount]
    );

    await safeQuery(
      `INSERT INTO public.tenant_usage_snapshots
        (tenant_id, users_count, frameworks_count)
       VALUES ($1, $2, $3)`,
      [tenantId, usersCount, frameworksCount]
    );
  } catch (err) {
    logger.error(`Failed to capture usage snapshot for tenant ${tenantId}`, { err });
  }
}

// ─── Run All Subscription Jobs ───────────────────────────────

export async function runAllSubscriptionJobs(): Promise<Record<string, number>> {
  const results = {
    expiredTrials: await processExpiredTrials(),
    expiredPeriods: await processExpiredPeriods(),
    gracePeriodEntries: await processGracePeriodEntries(),
    gracePeriodExpirations: await processGracePeriodExpirations(),
    scheduledDowngrades: await executeScheduledDowngrades(),
    expiredPauses: await processExpiredPauses(),
    renewalReminders: await checkAndSendRenewalReminders(),
  };

  logger.info('Subscription batch processing complete', results);
  return results;
}
