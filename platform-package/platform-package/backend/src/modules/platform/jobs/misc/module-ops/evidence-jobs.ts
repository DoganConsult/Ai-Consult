// @ts-nocheck
/**
 * Evidence domain job definitions.
 * Covers freshness checking, notification batching, and package retention.
 */
import { JobDefinition } from './job-types';
import { logger } from '../../services/misc/logger.service';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getEvidenceJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../services/misc/job-scheduler.service');

  return [
    // Evidence freshness check — daily at 2 AM
    {
      name: 'evidence-freshness-check',
      cron: '0 2 * * *',
      description: 'Scan all evidence, update freshness_status based on valid_to and admin thresholds',
      handler: async () => {
        logger.info('[Job] evidence-freshness-check started');
        try {
          const { batchFreshnessCheck } = await import('../../evidence/services/collection/evidence-freshness.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await batchFreshnessCheck(t.tenant_id);
              if (result.updated > 0) {
                logger.info(`[Job] evidence-freshness-check tenant=${t.tenant_id}: checked=${result.checked}, updated=${result.updated}, stale=${result.staleCount}, expired=${result.expiredCount}`);
              }
            } catch (err: unknown) {
              logger.warn(`[Job] evidence-freshness-check tenant=${t.tenant_id} error: ${toErrorMessage(err)}`);
            }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-freshness-check error:', toErrorMessage(err));
        }
        logger.info('[Job] evidence-freshness-check completed');
      },
    },

    // Evidence notification batch — every 4 hours
    {
      name: 'evidence-notification-batch',
      cron: '0 */4 * * *',
      description: 'Send overdue reminders, expiry alerts, review nudges, connector failure alerts',
      handler: async () => {
        logger.info('[Job] evidence-notification-batch started');
        try {
          const { batchNotify } = await import('../../evidence/services/core/evidence-notification.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await batchNotify(t.tenant_id);
              const total = result.overdueReminders + result.expiryAlerts + result.reviewNudges + result.connectorAlerts;
              if (total > 0) {
                logger.info(`[Job] evidence-notification-batch tenant=${t.tenant_id}: overdue=${result.overdueReminders}, expiry=${result.expiryAlerts}, review=${result.reviewNudges}, connector=${result.connectorAlerts}`);
              }
            } catch (err: unknown) {
              logger.warn(`[Job] evidence-notification-batch tenant=${t.tenant_id} error: ${toErrorMessage(err)}`);
            }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-notification-batch error:', toErrorMessage(err));
        }
        logger.info('[Job] evidence-notification-batch completed');
      },
    },

    // Evidence package retention — weekly on Sunday at 3 AM
    {
      name: 'evidence-package-retention',
      cron: '0 3 * * 0',
      description: 'Clean up expired evidence export files per retention rules',
      handler: async () => {
        logger.info('[Job] evidence-package-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database/database');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              // Mark expired exports
              const result = await safeQuery(
                `UPDATE "${schema}".evidence_exports
                 SET status = 'expired'
                 WHERE status != 'expired'
                   AND expires_at IS NOT NULL
                   AND expires_at < NOW()`,
                []
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] evidence-package-retention tenant=${t.tenant_id}: expired ${result.rowCount} exports`);
              }
            } catch (err: unknown) {
              logger.warn(`[Job] evidence-package-retention tenant=${t.tenant_id} error: ${toErrorMessage(err)}`);
            }
          }
        } catch (err: unknown) {
          logger.error('[Job] evidence-package-retention error:', toErrorMessage(err));
        }
        logger.info('[Job] evidence-package-retention completed');
      },
    },
  ];
}
