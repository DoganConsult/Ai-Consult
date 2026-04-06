import { logger } from '../../../../platform/dos/observability/logger.service';
/**
 * Workflow domain operational job definitions.
 * Covers auto-task generation, auto-eval runner, workflow stall recovery,
 * and stale task detection.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';

export async function getWorkflowOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Auto-Task Generator — daily at 5 AM
    {
      name: 'auto-task-generator',
      cron: '0 5 * * *',
      handler: async () => {
        logger.info("[Job] auto-task-generator executed");
        try {
          const { runAutoTaskScan } = await import('../../services/auto/auto-task.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runAutoTaskScan(t.tenant_id);
            } catch { /* tenant scan failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] auto-task-generator error:", toErrorMessage(err));
        }
      },
    },

    // Auto-Eval Runner — every 2 hours
    {
      name: 'auto-eval-runner',
      cron: '0 */2 * * *',
      handler: async () => {
        logger.info("[Job] auto-eval-runner executed");
        try {
          const { runAutoEvaluation } = await import('../../services/auto/auto-eval.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runAutoEvaluation(t.tenant_id);
            } catch { /* tenant eval failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] auto-eval-runner error:", toErrorMessage(err));
        }
      },
    },

    // Workflow stall recovery — every 5 minutes
    {
      name: 'workflow-stall-recovery',
      cron: '*/5 * * * *',
      handler: async () => {
        try {
          const { runStallRecoveryForAllTenants } = await import('../../../workflow/services/ops/recovery/workflow-stall-recovery.service');
          await runStallRecoveryForAllTenants();
        } catch (err: unknown) {
          logger.error("[Job] workflow-stall-recovery error:", toErrorMessage(err));
        }
      },
    },

    // Stale task detection — daily at 7 AM (Priority 17)
    {
      name: 'stale-task-detection',
      cron: '0 7 * * *', // Daily at 7 AM
      handler: async () => {
        logger.info("[Job] stale-task-detection executed");
        try {
          const { detectStaleTasks } = await import('../../../workflow/services/tasks/process-task-monitor.service');
          const tenants = await getProvisionedTenants();
          let totalStale7Days = 0;
          let totalStale14Days = 0;
          let totalEscalated = 0;
          let totalObservations = 0;
          let totalNotifications = 0;
          const allErrors: string[] = [];

          for (const t of tenants) {
            try {
              const result = await detectStaleTasks(t.tenant_id);
              totalStale7Days += result.stale7Days;
              totalStale14Days += result.stale14Days;
              totalEscalated += result.escalated;
              totalObservations += result.observationsCreated;
              totalNotifications += result.notificationsSent;

              if (result.stale7Days > 0 || result.stale14Days > 0) {
                logger.info(`[Job] stale-task-detection: tenant ${t.tenant_id} — ${result.stale7Days} tasks stale 7+ days, ${result.stale14Days} tasks stale 14+ days, ${result.escalated} escalated`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] stale-task-detection error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
                allErrors.push(`[${t.tenant_id}] ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalStale7Days > 0 || totalStale14Days > 0) {
            logger.info(`[Job] stale-task-detection: ${totalStale7Days} tasks stale 7+ days, ${totalStale14Days} tasks stale 14+ days, ${totalEscalated} escalated, ${totalObservations} observations created, ${totalNotifications} notifications sent across ${tenants.length} tenants`);
          }
          if (allErrors.length > 0) {
            logger.warn(`[Job] stale-task-detection: ${allErrors.length} errors occurred`);
          }
        } catch (err: unknown) {
          logger.error("[Job] stale-task-detection error:", toErrorMessage(err));
        }
      },
    },
  ];
}
