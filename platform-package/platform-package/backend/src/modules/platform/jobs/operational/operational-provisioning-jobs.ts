// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/logger.service';
/**
 * Provisioning domain operational job definitions.
 * Covers autonomous step processor, provisioning health check,
 * and post-provisioning warmup.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { getFirstRow } from '../../../../shared/data/db-utils';

export async function getProvisioningOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../platform/dos/jobs/job-scheduler.service');

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

    // Provisioning Health Check — every 5 min
    {
      name: 'provisioning-health-check',
      cron: '*/5 * * * *',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../config/database/database');
          // Find jobs stuck in 'running' for > 30 min or 'queued' with steps started > 10 min ago
          const stuckJobs = await safeQuery(`
            SELECT j.id AS job_id, j.tenant_id, j.job_status,
                   COUNT(s.id) FILTER (WHERE s.status = 'queued') AS queued_steps,
                   COUNT(s.id) FILTER (WHERE s.status = 'completed') AS completed_steps,
                   COUNT(s.id) FILTER (WHERE s.status = 'failed') AS failed_steps,
                   j.created_at
            FROM provisioning_jobs j
            LEFT JOIN provisioning_steps s ON s.job_id = j.id
            WHERE j.job_status IN ('running', 'queued')
              AND j.created_at < NOW() - INTERVAL '30 minutes'
              AND j.created_at > NOW() - INTERVAL '24 hours'
            GROUP BY j.id, j.tenant_id, j.job_status, j.created_at
            HAVING COUNT(s.id) FILTER (WHERE s.status = 'queued') > 0
            ORDER BY j.created_at ASC
            LIMIT 5
          `);

          if (stuckJobs.rows.length === 0) return;
          logger.info(`[Job] provisioning-health-check: found ${stuckJobs.rows.length} stuck job(s)`);

          for (const job of stuckJobs.rows) {
            try {
              // Reset stuck 'running' steps back to 'queued'
              await safeQuery(`
                UPDATE provisioning_steps SET status = 'queued', error_message = NULL
                WHERE job_id = $1 AND status = 'running'
              `, [job.job_id]);

              // Reset job status to 'running' to allow step-runner to pick it up
              await safeQuery(`
                UPDATE provisioning_jobs SET job_status = 'running', updated_at = NOW()
                WHERE id = $1
              `, [job.job_id]);

              // Re-trigger the step runner
              const { ProvisioningStepRunnerService } = await import('../../../onboarding/services/provisioning/provisioning-step-runner.service');
              const runner = new ProvisioningStepRunnerService();
              setImmediate(() => runner.runJob(job.job_id).catch((e: unknown) =>
                logger.error(`[Job] provisioning-health-check: retry failed for job ${job.job_id}:`, toErrorMessage(e))
              ));

              logger.info(`[Job] provisioning-health-check: retrying job ${job.job_id} for tenant ${job.tenant_id} (${job.completed_steps} done, ${job.queued_steps} queued)`);
            } catch (err: unknown) {
              logger.error(`[Job] provisioning-health-check: error retrying job ${job.job_id}:`, toErrorMessage(err));
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] provisioning-health-check error:", toErrorMessage(err));
        }
      },
    },

    // Post-Provisioning Warmup — every 10 min
    {
      name: 'post-provisioning-warmup',
      cron: '*/10 * * * *',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../config/database/database');
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
              if ((getFirstRow(cycleCheck)?.cnt ?? 0) > 2) continue; // Already warmed up

              // Ensure feature flag exists (DO NOTHING — DB values take precedence)
              await safeQuery(`
                INSERT INTO "${schema}".feature_flags (feature_key, enabled)
                VALUES ('agrc_engine_enabled', true)
                ON CONFLICT (feature_key) DO NOTHING
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
  ];
}
