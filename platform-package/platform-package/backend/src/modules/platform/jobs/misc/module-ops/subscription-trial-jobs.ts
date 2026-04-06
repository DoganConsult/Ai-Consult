// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger.service';
import { emptyResult } from '../../../../../config/database/database';
/**
 * Subscription & Trial lifecycle domain job definitions.
 * Covers trial lifecycle checks, subscription reminders, grace expiry,
 * usage snapshots, and scheduled change processing.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';
import { swallowDefault, EC , catchHandler } from '../../../../../platform/dos/resilience/resilient-catch';

export async function getSubscriptionTrialJobs(): Promise<JobDefinition[]> {
  const { __getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Trial Lifecycle Check — daily at 2 AM
    {
      name: 'trial-lifecycle-check',
      cron: '0 2 * * *',
      handler: async () => {
        logger.info("[Job] trial-lifecycle-check executed");
        try {
          const { createNotification } = await import('../../../../notification/services/notification.service');
          const { safeQuery } = await import('../../../../../config/database/database');

          // 1. Expire overdue trials
          const expired = await safeQuery(
            `UPDATE public.subscriptions
             SET status = 'expired', updated_at = now()
             WHERE status = 'trial'
               AND trial_ends_at IS NOT NULL
               AND trial_ends_at < now()
             RETURNING tenant_id`
          );
          for (const row of expired.rows) {
            // Suspend the tenant
            await safeQuery(
              `UPDATE public.tenants SET status = 'suspended', updated_at = now() WHERE tenant_id = $1`,
              [row.tenant_id]
            ).catch(catchHandler(EC.EVENT_BUS, {}));
            // Notify tenant admins
            const admins = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
              `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role IN ('admin', 'tenant_owner') LIMIT 5`,
              [row.tenant_id]
            ), { operation: 'fallback query' });
            for (const admin of admins.rows) {
              await createNotification(row.tenant_id, {
                userId: admin.user_id,
                type: 'trial_expired',
                title: 'Your trial has expired',
                body: 'Your trial period has ended. Upgrade to continue using the platform.',
                link: '/settings/billing',
              }).catch(catchHandler(EC.EVENT_BUS, {}));
            }
            logger.info(`[Job] trial-lifecycle-check: expired trial for tenant ${row.tenant_id}`);
          }

          // 2. Warning notifications: 3 days before expiry
          const warning3d = await safeQuery(
            `SELECT s.tenant_id, s.trial_ends_at
             FROM public.subscriptions s
             WHERE s.status = 'trial'
               AND s.trial_ends_at IS NOT NULL
               AND s.trial_ends_at::date = (CURRENT_DATE + INTERVAL '3 days')::date`
          );
          for (const row of warning3d.rows) {
            const admins = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
              `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role IN ('admin', 'tenant_owner') LIMIT 5`,
              [row.tenant_id]
            ), { operation: 'fallback query' });
            for (const admin of admins.rows) {
              await createNotification(row.tenant_id, {
                userId: admin.user_id,
                type: 'trial_expiring_soon',
                title: 'Trial expires in 3 days',
                body: 'Your trial expires on ' + new Date(row.trial_ends_at).toLocaleDateString() + '. Upgrade now to keep your data.',
                link: '/settings/billing',
              }).catch(catchHandler(EC.EVENT_BUS, {}));
            }
          }

          // 3. Warning notifications: 1 day before expiry
          const warning1d = await safeQuery(
            `SELECT s.tenant_id, s.trial_ends_at
             FROM public.subscriptions s
             WHERE s.status = 'trial'
               AND s.trial_ends_at IS NOT NULL
               AND s.trial_ends_at::date = (CURRENT_DATE + INTERVAL '1 day')::date`
          );
          for (const row of warning1d.rows) {
            const admins = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
              `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role IN ('admin', 'tenant_owner') LIMIT 5`,
              [row.tenant_id]
            ), { operation: 'fallback query' });
            for (const admin of admins.rows) {
              await createNotification(row.tenant_id, {
                userId: admin.user_id,
                type: 'trial_expiring_tomorrow',
                title: 'Trial expires tomorrow',
                body: 'Your trial expires tomorrow. Upgrade now to avoid losing access.',
                link: '/settings/billing',
              }).catch(catchHandler(EC.EVENT_BUS, {}));
            }
          }

          if (expired.rowCount) {
            logger.info(`[Job] trial-lifecycle-check: expired ${expired.rowCount} trials, sent ${warning3d.rowCount} 3-day and ${warning1d.rowCount} 1-day warnings`);
          }
        } catch (err: unknown) {
          logger.error("[Job] trial-lifecycle-check error:", toErrorMessage(err));
        }
      },
    },

    // Subscription reminder job — daily at 6 AM
    {
      name: 'subscription-reminder-job',
      cron: '0 6 * * *',
      handler: async () => {
        try {
          const lifecycle = await import("../services/subscription-lifecycle.service");
          const sent = await lifecycle.checkAndSendRenewalReminders();
          logger.info(`[Job] subscription-reminder-job: sent ${sent} reminders`);
        } catch (err: unknown) {
          logger.error("[Job] subscription-reminder-job error:", toErrorMessage(err));
        }
      },
    },

    // Subscription grace expiry job — every 4 hours
    {
      name: 'subscription-grace-expiry-job',
      cron: '0 */4 * * *',
      handler: async () => {
        try {
          const lifecycle = await import("../services/subscription-lifecycle.service");
          const results = await lifecycle.runAllSubscriptionJobs();
          logger.info("[Job] subscription-grace-expiry-job:", JSON.stringify(results));
        } catch (err: unknown) {
          logger.error("[Job] subscription-grace-expiry-job error:", toErrorMessage(err));
        }
      },
    },

    // Subscription usage snapshot job — daily at 2 AM
    {
      name: 'subscription-usage-snapshot-job',
      cron: '0 2 * * *',
      handler: async () => {
        try {
          const lifecycle = await import("../services/subscription-lifecycle.service");
          const { query } = await import('../../../../../config/database/database');
          const tenants = await query("SELECT tenant_id FROM public.tenants WHERE status = 'active'");
          for (const t of tenants.rows) {
            try {
              await lifecycle.captureUsageSnapshot(t.tenant_id);
            } catch { /* per-tenant non-fatal */ }
          }
          logger.info(`[Job] subscription-usage-snapshot-job: captured ${tenants.rows.length} snapshots`);
        } catch (err: unknown) {
          logger.error("[Job] subscription-usage-snapshot-job error:", toErrorMessage(err));
        }
      },
    },

    // Subscription scheduled change job — daily at 1 AM
    {
      name: 'subscription-scheduled-change-job',
      cron: '0 1 * * *',
      handler: async () => {
        try {
          const lifecycle = await import("../services/subscription-lifecycle.service");
          const downgrades = await lifecycle.executeScheduledDowngrades();
          logger.info(`[Job] subscription-scheduled-change-job: executed ${downgrades} downgrades`);
        } catch (err: unknown) {
          logger.error("[Job] subscription-scheduled-change-job error:", toErrorMessage(err));
        }
      },
    },
  ];
}
