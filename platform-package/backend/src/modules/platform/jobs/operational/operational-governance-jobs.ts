import { logger } from '../../../../platform/dos/observability/logger.service';
/**
 * Governance domain operational job definitions.
 * Covers autonomy review and maturity auto-assessment.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';

export async function getGovernanceOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Autonomy Review — monthly on the 1st at 2 AM (Feature 19)
    {
      name: 'autonomy-review',
      cron: '0 2 1 * *',
      handler: async () => {
        logger.info("[Job] autonomy-review executed");
        try {
          const { reviewTenantAutonomy } = await import('../../services/autonomy/autonomy-review.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const recommendation = await reviewTenantAutonomy(t.tenant_id);
              if (recommendation) {
                logger.info(`[Job] autonomy-review: tenant ${t.tenant_id} — current: ${recommendation.currentMode}, recommended: ${recommendation.recommendedMode}, ` +
                  `accuracy: ${(recommendation.metrics.avgEvalScore * 100).toFixed(1)}%, ` +
                  `HITL override: ${(recommendation.metrics.hitlOverrideRate * 100).toFixed(1)}%, ` +
                  `consecutive passes: ${recommendation.consecutivePassCycles}`);
              }
            } catch (err: unknown) {
              logger.warn(`[Job] autonomy-review failed for tenant ${t.tenant_id}:`, toErrorMessage(err));
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] autonomy-review error:", toErrorMessage(err));
        }
      },
    },

    // Governance Maturity Auto-Assessment — quarterly on 1st of Jan, Apr, Jul, Oct at 3 AM (Feature 50)
    {
      name: 'maturity-auto-assessment-quarterly',
      cron: '0 3 1 1,4,7,10 *',
      handler: async () => {
        logger.info("[Job] maturity-auto-assessment-quarterly executed");
        try {
          const { autoAssessMaturity } = await import('../../../governance/services/governance/governance-maturity-auto-assessment.service');
          const tenants = await getProvisionedTenants();
          let totalAssessments = 0;
          let totalErrors = 0;

          for (const t of tenants) {
            try {
              const result = await autoAssessMaturity(t.tenant_id);
              totalAssessments++;
              logger.info(`[Job] maturity-auto-assessment-quarterly: tenant ${t.tenant_id} — assessed at level ${result.level} (aggregate: ${result.aggregate.toFixed(2)})`);
            } catch (tenantErr: unknown) {
              totalErrors++;
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] maturity-auto-assessment-quarterly error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalAssessments > 0) {
            logger.info(`[Job] maturity-auto-assessment-quarterly: ${totalAssessments} assessments completed, ${totalErrors} errors across ${tenants.length} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] maturity-auto-assessment-quarterly error:", toErrorMessage(err));
        }
      },
    },
  ];
}
