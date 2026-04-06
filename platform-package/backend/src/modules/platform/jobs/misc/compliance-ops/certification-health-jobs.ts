// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger';
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getCertificationHealthJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    {
      name: 'daily-health-reset',
      cron: '0 3 * * *',
      description: 'Reset daily error counts and restore healthy status for all modules',
      handler: async () => {
        try {
          const { resetDailyErrorCounts } = await import('../../services/module/module-runtime-health.service');
          const tenants = await getProvisionedTenants();
          let total = 0;
          for (const t of tenants) {
            await resetDailyErrorCounts(t.tenant_id);
            total++;
          }
          logger.info(`[Job] daily-health-reset completed for ${total} tenants`);
        } catch (err: unknown) {
          logger.error('[Job] daily-health-reset error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'weekly-maturity-recalculation',
      cron: '0 4 * * 0',
      description: 'Recalculate module maturity stages based on 30-day activity metrics',
      handler: async () => {
        try {
          const { recalculateMaturityStages } = await import('../../services/module/module-runtime-health.service');
          const tenants = await getProvisionedTenants();
          let totalUpdated = 0;
          for (const t of tenants) {
            const updated = await recalculateMaturityStages(t.tenant_id);
            totalUpdated += updated;
          }
          logger.info(`[Job] weekly-maturity-recalculation completed: ${totalUpdated} modules updated across ${tenants.length} tenants`);
        } catch (err: unknown) {
          logger.error('[Job] weekly-maturity-recalculation error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'weekly-certification-refresh',
      cron: '0 5 * * 0',
      description: 'Re-run certification gates for all modules and packs',
      handler: async () => {
        try {
          const { certifyAllModules } = await import('../services/module/module-certification.service');
          const { certifyAllPacks } = await import('../../services/module/module-runtime-health.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            const reports = await certifyAllModules(t.tenant_id);
            const certified = reports.filter(r => r.certificationState === 'CERTIFIED_A_PLUS_PLUS').length;
            await certifyAllPacks(t.tenant_id);
            logger.info(`[Job] weekly-certification-refresh: tenant ${t.tenant_id} — ${certified}/${reports.length} modules certified`);
          }
        } catch (err: unknown) {
          logger.error('[Job] weekly-certification-refresh error:', toErrorMessage(err));
        }
      },
    },
  ];
}
