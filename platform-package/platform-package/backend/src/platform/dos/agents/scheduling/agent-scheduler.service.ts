// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { v4 as uuid } from 'uuid';
import { getAgentDefinition } from '../registry/agent-registry.service';

export interface AgentScheduleDefinition {
  scheduleId: string;
  agentCode: string;
  tenantId: string;
  cronExpression: string;
  jobType: string;
  input: Record<string, unknown>;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdBy: string;
}

export async function createSchedule(
  tenantId: string,
  params: Omit<AgentScheduleDefinition, 'scheduleId' | 'lastRunAt' | 'nextRunAt'>,
): Promise<AgentScheduleDefinition> {
  const def = getAgentDefinition(params.agentCode);
  if (!def) throw new Error(`Agent '${params.agentCode}' not registered`);
  if (!def.allowedTriggerSources.includes('schedule')) {
    throw new Error(`Agent '${params.agentCode}' does not accept schedule triggers`);
  }

  const scheduleId = uuid();
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_schedules
       (schedule_id, agent_code, tenant_id, cron_expression, job_type, input, enabled, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
    [scheduleId, params.agentCode, tenantId, params.cronExpression, params.jobType, JSON.stringify(params.input), params.enabled, params.createdBy],
  );

  try {
    const temporal: unknown = await import('../../../../temporal/schedules/register-all-schedules');
    if (typeof temporal.registerAgentSchedule === 'function') {
      await temporal.registerAgentSchedule(scheduleId, params.agentCode, tenantId, params.cronExpression, params.jobType);
    }
  } catch {
    // Temporal unavailable — schedule persisted in DB only
  }

  return { ...params, scheduleId, tenantId };
}

export async function updateSchedule(
  tenantId: string,
  scheduleId: string,
  updates: Partial<Pick<AgentScheduleDefinition, 'cronExpression' | 'input' | 'enabled'>>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const setClauses: string[] = [];
  const params: unknown[] = [scheduleId];
  let idx = 2;

  if (updates.cronExpression !== undefined) {
    setClauses.push(`cron_expression = $${idx++}`);
    params.push(updates.cronExpression);
  }
  if (updates.input !== undefined) {
    setClauses.push(`input = $${idx++}`);
    params.push(JSON.stringify(updates.input));
  }
  if (updates.enabled !== undefined) {
    setClauses.push(`enabled = $${idx++}`);
    params.push(updates.enabled);
  }

  if (setClauses.length === 0) return;
  setClauses.push('updated_at = NOW()');

  await safeQuery(
    `UPDATE "${schema}".dos_agent_schedules SET ${setClauses.join(', ')} WHERE schedule_id = $1`,
    params,
  );
}

export async function deleteSchedule(tenantId: string, scheduleId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".dos_agent_schedules WHERE schedule_id = $1`,
    [scheduleId],
  );
}

export async function getSchedulesForAgent(
  tenantId: string,
  agentCode: string,
): Promise<AgentScheduleDefinition[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_schedules WHERE agent_code = $1 ORDER BY created_at DESC`,
    [agentCode],
  );
  return rows.map(mapScheduleRow);
}

export async function getAllSchedules(tenantId: string): Promise<AgentScheduleDefinition[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_schedules ORDER BY agent_code, created_at DESC`,
    [],
  );
  return rows.map(mapScheduleRow);
}

export async function recordScheduleRun(
  tenantId: string,
  scheduleId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_agent_schedules SET last_run_at = NOW() WHERE schedule_id = $1`,
    [scheduleId],
  );
}

function mapScheduleRow(r: Record<string, unknown>): AgentScheduleDefinition {
  return {
    scheduleId: r.schedule_id as string,
    agentCode: r.agent_code as string,
    tenantId: r.tenant_id as string,
    cronExpression: r.cron_expression as string,
    jobType: r.job_type as string,
    input: typeof r.input === 'string' ? JSON.parse(r.input as string) : ((r.input as Record<string, unknown>) || {}),
    enabled: r.enabled as boolean,
    lastRunAt: (r.last_run_at as Date)?.toISOString?.() || undefined,
    nextRunAt: (r.next_run_at as Date)?.toISOString?.() || undefined,
    createdBy: r.created_by as string,
  };
}

export const agentSchedulerService = {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesForAgent,
  getAllSchedules,
  recordScheduleRun,
};
