// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { executeAgentRun } from '../runtime/agent-runtime.service';
import { createTask } from '../tasks/agent-task.service';
import { getAgentDefinition, getAllAgentDefinitions } from '../registry/agent-registry.service';
import { v4 as uuid } from 'uuid';
import type { AgentRunRequest, AgentRunResult, AgentTaskDefinition } from '../contracts/agent.types';

export interface WorkflowTriggerRequest {
  workflowType: string;
  workflowId: string;
  transitionFrom: string;
  transitionTo: string;
  entityType: string;
  entityId: string;
  moduleCode: string;
  tenantId: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowAgentResult {
  agentCode: string;
  taskId: string;
  runResult: AgentRunResult | null;
  skipped: boolean;
  skipReason?: string;
}

export function findAgentsForWorkflow(
  moduleCode: string,
  _entityType: string,
): string[] {
  return getAllAgentDefinitions()
    .filter(def => {
      if (def.ownerCode !== moduleCode && def.ownerCode !== 'platform') return false;
      if (!def.allowedTriggerSources.includes('workflow')) return false;
      return true;
    })
    .map(def => def.agentCode);
}

export async function triggerAgentsForWorkflowTransition(
  request: WorkflowTriggerRequest,
): Promise<WorkflowAgentResult[]> {
  const agentCodes = findAgentsForWorkflow(request.moduleCode, request.entityType);
  const results: WorkflowAgentResult[] = [];

  for (const agentCode of agentCodes) {
    const def = getAgentDefinition(agentCode);
    if (!def) {
      results.push({ agentCode, taskId: '', runResult: null, skipped: true, skipReason: 'agent_not_registered' });
      continue;
    }

    const correlationId = uuid();
    let task: AgentTaskDefinition;
    try {
      task = await createTask(request.tenantId, {
        agentCode,
        tenantId: request.tenantId,
        taskType: 'workflow_transition',
        moduleCode: request.moduleCode,
        entityType: request.entityType,
        entityId: request.entityId,
        priority: 'medium',
        input: {
          workflowType: request.workflowType,
          workflowId: request.workflowId,
          fromState: request.transitionFrom,
          toState: request.transitionTo,
          ...(request.metadata || {}),
        },
        createdBy: request.actorId,
        correlationId,
      });
    } catch (err) {
      results.push({ agentCode, taskId: '', runResult: null, skipped: true, skipReason: err instanceof Error ? err.message : String(err) });
      continue;
    }

    const runRequest: AgentRunRequest = {
      agentCode,
      tenantId: request.tenantId,
      actorId: request.actorId,
      triggerSource: 'workflow',
      taskId: task.taskId,
      input: {
        workflowType: request.workflowType,
        workflowId: request.workflowId,
        fromState: request.transitionFrom,
        toState: request.transitionTo,
        entityType: request.entityType,
        entityId: request.entityId,
        moduleCode: request.moduleCode,
        ...(request.metadata || {}),
      },
      correlationId,
    };

    const runResult = await executeAgentRun(runRequest);
    results.push({ agentCode, taskId: task.taskId, runResult, skipped: false });
  }

  return results;
}

export async function triggerAgentForScheduledJob(
  tenantId: string,
  agentCode: string,
  jobType: string,
  input: Record<string, unknown> = {},
): Promise<AgentRunResult> {
  const correlationId = uuid();
  const runRequest: AgentRunRequest = {
    agentCode,
    tenantId,
    actorId: `system:scheduler`,
    triggerSource: 'schedule',
    input: { taskType: jobType, ...input },
    correlationId,
  };
  return executeAgentRun(runRequest);
}

export const agentWorkflowBridgeService = {
  findAgentsForWorkflow,
  triggerAgentsForWorkflowTransition,
  triggerAgentForScheduledJob,
};
