// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger.service';
/**
 * Phase 7 Module Security Jobs
 * - Data retention enforcement (daily at 3 AM)
 * - RBAC drift detection (daily at 4 AM)
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getModuleSecurityJobs(): Promise<JobDefinition[]> {
  const { __getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Data retention enforcement — daily at 3 AM
    // Enforces purge strategies (soft_delete, archive, hard_delete) per module policy
    {
      name: 'data-retention-enforcement',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info('[Job] data-retention-enforcement started');
        try {
          const { runDataRetentionForAllTenants } = await import('./data-retention-enforcement.job');
          await runDataRetentionForAllTenants();
        } catch (err: unknown) {
          logger.error('[Job] data-retention-enforcement error:', toErrorMessage(err));
        }
      },
    },

    // RBAC drift detection — daily at 4 AM
    // Compares DB permissions/roles/actions against static registry, logs drift events
    {
      name: 'rbac-drift-detection',
      cron: '0 4 * * *',
      handler: async () => {
        logger.info('[Job] rbac-drift-detection started');
        try {
          const { detectRbacDriftForAllTenants } = await import('./rbac-drift-detection.job');
          await detectRbacDriftForAllTenants();
        } catch (err: unknown) {
          logger.error('[Job] rbac-drift-detection error:', toErrorMessage(err));
        }
      },
    },
  ];
}
