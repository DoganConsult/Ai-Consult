import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { publish } from '../../events/event-bus';
import { v4 as uuid } from 'uuid';
import { getAgentDefinition } from '../registry/agent-registry.service';
import type { AgentTaskDefinition } from '../contracts/agent.types';

export async function createTask(
  tenantId: string,
  params: Omit<AgentTaskDefinition, 'taskId' | 'status' | 'assignedAt' | 'completedAt' | 'escalatedTo' | 'output'>,
): Promise<AgentTaskDefinition> {
  const def = getAgentDefinition(params.agentCode);
  if (def && def.allowedTaskTypes.length > 0 && !def.allowedTaskTypes.includes(params.taskType)) {
    throw new Error(`Task type '${params.taskType}' not allowed for agent '${params.agentCode}'`);
  }
  const taskId = uuid();
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_tasks
       (task_id, agent_code, tenant_id, task_type, module_code, entity_type, entity_id,
        priority, status, input, created_by, correlation_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,$11,NOW())`,
    [
      taskId, params.agentCode, tenantId, params.taskType, params.moduleCode,
      params.entityType || null, params.entityId || null, params.priority,
      JSON.stringify(params.input), params.createdBy, params.correlationId,
    ],
  );
  await publish('agent.task.created', tenantId, { taskId, agentCode: params.agentCode, taskType: params.taskType });
  return { ...params, taskId, status: 'pending', tenantId };
}

export async function assignTask(tenantId: string, taskId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_agent_tasks SET status='assigned', assigned_at=NOW() WHERE task_id=$1 AND status='pending'`,
    [taskId],
  );
}

export async function completeTask(
  tenantId: string,
  taskId: string,
  output: Record<string, unknown>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_agent_tasks SET status='completed', output=$2, completed_at=NOW() WHERE task_id=$1`,
    [taskId, JSON.stringify(output)],
  );
}

export async function failTask(tenantId: string, taskId: string, error: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_agent_tasks SET status='failed', output=$2, completed_at=NOW() WHERE task_id=$1`,
    [taskId, JSON.stringify({ error })],
  );
}

export async function escalateTask(tenantId: string, taskId: string, escalatedTo: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_agent_tasks SET status='escalated', escalated_to=$2, completed_at=NOW() WHERE task_id=$1`,
    [taskId, escalatedTo],
  );
}

export async function getTasksByAgent(
  tenantId: string,
  agentCode: string,
  status?: string,
  limit = 50,
): Promise<AgentTaskDefinition[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [agentCode, limit];
  let statusClause = '';
  if (status) {
    params.push(status);
    statusClause = ` AND status = $${params.length}`;
  }
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_tasks WHERE agent_code = $1${statusClause} ORDER BY created_at DESC LIMIT $2`,
    params,
  );
  return rows.map(mapTaskRow);
}

export async function getTaskById(tenantId: string, taskId: string): Promise<AgentTaskDefinition | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_tasks WHERE task_id = $1 LIMIT 1`,
    [taskId],
  );
  return rows[0] ? mapTaskRow(rows[0]) : null;
}

function mapTaskRow(r: Record<string, unknown>): AgentTaskDefinition {
  return {
    taskId: r.task_id as string,
    agentCode: r.agent_code as string,
    tenantId: r.tenant_id as string,
    taskType: r.task_type as string,
    moduleCode: r.module_code as string,
    entityType: (r.entity_type as string) || undefined,
    entityId: (r.entity_id as string) || undefined,
    priority: r.priority as AgentTaskDefinition['priority'],
    status: r.status as AgentTaskDefinition['status'],
    assignedAt: (r.assigned_at as Date)?.toISOString?.() || undefined,
    completedAt: (r.completed_at as Date)?.toISOString?.() || undefined,
    escalatedTo: (r.escalated_to as string) || undefined,
    input: typeof r.input === 'string' ? JSON.parse(r.input as string) : ((r.input as Record<string, unknown>) || {}),
    output: r.output ? (typeof r.output === 'string' ? JSON.parse(r.output as string) : (r.output as Record<string, unknown>)) : undefined,
    createdBy: r.created_by as string,
    correlationId: r.correlation_id as string,
  };
}

export const agentTaskService = {
  createTask,
  assignTask,
  completeTask,
  failTask,
  escalateTask,
  getTasksByAgent,
  getTaskById,
};
