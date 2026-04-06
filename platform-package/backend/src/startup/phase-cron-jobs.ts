// @ts-nocheck
import { toErrorMessage } from '../errors/http-error.util';
import { logger } from '../platform/dos/observability/logger.service';

export async function runCronJobsPhase(): Promise<void> {
  const instanceId = parseInt(process.env.NODE_APP_INSTANCE || '0', 10);
  if (instanceId !== 0) return;

  if (process.env.TEMPORAL_ENABLED === 'true') {
    try {
      const { ensureSchedules } = await import('../config/workflow/temporal-schedules');
      await ensureSchedules();
      logger.info('[Temporal] Schedules registered');
    } catch (e: unknown) {
      logger.warn('[Temporal] Schedule registration failed — falling back to node-cron', { error: toErrorMessage(e) });
      try {
        const { registerDefaultJobs } = await import('../platform/dos/jobs/job-scheduler.service');
        await registerDefaultJobs();
      } catch (e2: unknown) { logger.warn('[CronJobs] Default job registration skipped', { error: toErrorMessage(e2) }); }
    }
  } else {
    try {
      const { registerDefaultJobs } = await import('../platform/dos/jobs/job-scheduler.service');
      await registerDefaultJobs();
      logger.info('[Platform] Cron jobs registered (node-cron, Temporal disabled)');
    } catch (e: unknown) { logger.warn('[CronJobs] Default job registration skipped', { error: toErrorMessage(e) }); }
  }
}
