import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { triggerAgentForScheduledJob } from '../workflow/agent-workflow-bridge.service';
import { recordScheduleRun } from './agent-scheduler.service';
import { logger } from '../../observability/logger.service';

let _intervalHandle: ReturnType<typeof setInterval> | null = null;
const TICK_INTERVAL_MS = 60_000;

export function startAgentCronRunner(): void {
  if (_intervalHandle) return;
  _intervalHandle = setInterval(() => {
    tickAllTenants().catch(() => {});
  }, TICK_INTERVAL_MS);
  tickAllTenants().catch(() => {});
}

export function stopAgentCronRunner(): void {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
  }
}

async function tickAllTenants(): Promise<void> {
  try {
    const { rows: tenants } = await safeQuery(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`,
      [],
    );
    for (const t of tenants) {
      const tenantId = (t.schema_name as string).replace('tenant_', '');
      await tickTenant(tenantId);
    }
  } catch {
    // schema query failed — skip this tick
  }
}

async function tickTenant(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT schedule_id, agent_code, job_type, input
       FROM "${schema}".dos_agent_schedules
       WHERE enabled = TRUE
         AND (next_run_at IS NULL OR next_run_at <= NOW())
         AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '1 minute')`,
      [],
    );

    for (const row of rows) {
      try {
        const input = typeof row.input === 'string' ? JSON.parse(row.input) : (row.input || {});
        await triggerAgentForScheduledJob(tenantId, row.agent_code, row.job_type, input);
        await recordScheduleRun(tenantId, row.schedule_id);

        await safeQuery(
          `UPDATE "${schema}".dos_agent_schedules
           SET next_run_at = NOW() + (
             CASE
               WHEN cron_expression ~ '^[0-9]+[mhd]$' THEN
                 CASE
                   WHEN cron_expression LIKE '%m' THEN (regexp_replace(cron_expression, '[^0-9]', '', 'g')::int || ' minutes')::interval
                   WHEN cron_expression LIKE '%h' THEN (regexp_replace(cron_expression, '[^0-9]', '', 'g')::int || ' hours')::interval
                   WHEN cron_expression LIKE '%d' THEN (regexp_replace(cron_expression, '[^0-9]', '', 'g')::int || ' days')::interval
                   ELSE INTERVAL '1 hour'
                 END
               ELSE INTERVAL '1 hour'
             END
           )
           WHERE schedule_id = $1`,
          [row.schedule_id],
        );
      } catch (err) {
        logger.warn(`[agent-cron] Failed to run schedule ${row.schedule_id} for agent ${row.agent_code}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch {
    // table may not exist yet — skip
  }
}

export const agentCronRunnerService = {
  startAgentCronRunner,
  stopAgentCronRunner,
};
