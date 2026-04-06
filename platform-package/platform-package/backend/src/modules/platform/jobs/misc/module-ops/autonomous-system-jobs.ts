// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger.service';
// ============================================
// Shahin GRC — Autonomous System Jobs
// ============================================

import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getAutonomousSystemJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Autonomous step processor — every 5 minutes
    {
      name: 'autonomous-step-processor',
      cron: '*/5 * * * *',
      handler: async () => {
        logger.info("[Job] autonomous-step-processor executed");
        try {
          const { processAutonomousSteps } = await import('../../../workflow/services/ai/autonomous-workflow.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            const processed = await processAutonomousSteps(t.tenant_id);
            if (processed > 0) {
              logger.info(`[Job] autonomous-step-processor: processed ${processed} steps for tenant ${t.tenant_id}`);
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] autonomous-step-processor error:", toErrorMessage(err));
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
    // Post-Provisioning Warmup — every 10 min
    {
      name: 'post-provisioning-warmup',
      cron: '*/10 * * * *',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          let warmedUp = 0;
          const MAX_PER_TICK = 3; // Limit concurrency to avoid overloading

          for (const t of tenants) {
            if (warmedUp >= MAX_PER_TICK) break;
            try {
              const schema = `tenant_${t.tenant_id}`;
              const cycleCheck = await safeQuery(
                `SELECT COUNT(*)::int AS cnt FROM "${schema}".agrc_os_cycle_log`
              );
              if ((cycleCheck.rows[0]?.cnt ?? 0) > 2) continue; // Already warmed up

              // Ensure feature flag exists
              await safeQuery(`
                INSERT INTO "${schema}".feature_flags (feature_key, enabled)
                VALUES ('agrc_engine_enabled', true)
                ON CONFLICT (feature_key) DO UPDATE SET enabled = true
              `);

              // Run one orchestration cycle
              const { runAGRCOSCycle } = await import('../../services/agrc/agrc-os-orchestrator.service');
              const result = await runAGRCOSCycle(t.tenant_id);
              warmedUp++;
              logger.info(`[Job] post-provisioning-warmup: tenant ${t.tenant_id} — cycle completed (${result.controlsEvaluated} controls, ${result.enforcementActions} actions)`);
            } catch { /* tenant may not have all tables yet */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] post-provisioning-warmup error:", toErrorMessage(err));
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
    // Engagement OS Orchestrator — every 15 minutes
    {
      name: 'engagement-os-orchestrator',
      cron: '*/15 * * * *',
      handler: async () => {
        logger.info("[Job] engagement-os-orchestrator executed");
        try {
          const { runEngagementOSCycle } = await import("../../analytics/services/engagement/engagement-os-orchestrator.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runEngagementOSCycle(t.tenant_id);
            } catch { /* tenant cycle failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] engagement-os-orchestrator error:", toErrorMessage(err));
        }
      },
    },
  ];
}
