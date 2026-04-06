// @ts-nocheck
/**
 * Training domain job definitions.
 * Covers training overdue checks, expiring certifications, and deadline reminders.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';
import { logger } from '../../../../../platform/dos/observability/logger.service';

export async function getTrainingJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Training overdue check — daily at 3 AM
    {
      name: 'training-overdue-check',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info("[Job] training-overdue-check executed");
        try {
          const { checkOverdueAssignments } = await import('../../../../training/services/training-advanced.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const count = await checkOverdueAssignments(t.tenant_id);
              if (count > 0) {
                logger.info(`[Job] training-overdue-check: marked ${count} overdue for tenant ${t.tenant_id}`);
              }
            } catch (err: unknown) {
              logger.warn('[Job] training-overdue-check failed for tenant', {
                tenantId: t.tenant_id,
                error: toErrorMessage(err)
              });
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] training-overdue-check error:", toErrorMessage(err));
        }
      },
    },

    // Training expiring certs — daily at 4 AM
    {
      name: 'training-expiring-certs',
      cron: '0 4 * * *',
      handler: async () => {
        logger.info("[Job] training-expiring-certs executed");
        try {
          const { checkExpiringCertifications } = await import('../../../../training/services/training-advanced.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const expiring = await checkExpiringCertifications(t.tenant_id);
              if (expiring.length > 0) {
                logger.info(`[Job] training-expiring-certs: ${expiring.length} expiring for tenant ${t.tenant_id}`);
              }
            } catch (err: unknown) {
              logger.warn('[Job] training-expiring-certs failed for tenant', {
                tenantId: t.tenant_id,
                error: toErrorMessage(err)
              });
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] training-expiring-certs error:", toErrorMessage(err));
        }
      },
    },

    // Training deadline reminder — daily at 7 AM
    {
      name: 'training-deadline-reminder',
      cron: '0 7 * * *',
      handler: async () => {
        logger.info("[Job] training-deadline-reminder executed");
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            const __schema = `tenant_${t.tenant_id}`;
            try {
              const { checkOverdueAssignments, checkExpiringCertifications } = await import('../../../../training/services/training-advanced.service');
              const overdueCount = await checkOverdueAssignments(t.tenant_id);
              if (overdueCount > 0) {
                logger.info(`[Job] training-deadline-reminder: ${overdueCount} overdue assignments for ${t.tenant_id}`);
              }
              const expiringCerts = await checkExpiringCertifications(t.tenant_id);
              if (expiringCerts.length > 0) {
                logger.info(`[Job] training-deadline-reminder: ${expiringCerts.length} expiring certs for ${t.tenant_id}`);
              }
            } catch (e: unknown) {
              if (!toErrorMessage(e).includes("does not exist")) {
                logger.error(`[Job] training-deadline-reminder error for ${t.tenant_id}: ${toErrorMessage(e)}`);
              }
            }
          }
        } catch (err: unknown) { logger.error("[Job] training-deadline-reminder error:", toErrorMessage(err)); }
      },
    },
  ];
}
