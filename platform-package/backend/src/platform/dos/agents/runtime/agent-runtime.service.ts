import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { publish } from '../../events/event-bus';
import { v4 as uuid } from 'uuid';
import { getAgentDefinition, isAgentActive } from '../registry/agent-registry.service';
import { evaluateAgentPolicy } from '../policies/agent-policy.service';
import { evaluateBudgetGuard } from '../policies/agent-budget-guard.service';
import { runPreExecutionMiddleware, runPostExecutionMiddleware } from '../policies/agent-middleware-bridge.service';
import { validateSodAndDelegation } from '../../../dauth/agents/policies/agent-sod-delegation.service';
import { buildAgentContext } from '../context/agent-context.service';
import { validateAgentOutput } from '../validation/agent-output-validator.service';
import { recordRunMetrics } from '../diagnostics/agent-diagnostics.service';
import { recordRunOutcome, evaluateCircuitBreaker } from '../health/agent-health.service';
import { executeToolCall } from '../tools/agent-tool-registry.service';
import type {
  AgentRunRequest,
  AgentRunResult,
  AgentRunStatus,
  AgentToolCallResult,
  AgentToolCallRequest,
  AgentContextPackage,
} from '../contracts/agent.types';

export async function executeAgentRun(request: AgentRunRequest): Promise<AgentRunResult> {
  const def = getAgentDefinition(request.agentCode);
  if (!def) {
    const failResult = buildFailedResult(request, 'agent_not_registered', `Agent '${request.agentCode}' is not registered`);
    await persistFailedPreRun(request.tenantId, failResult, request);
    return failResult;
  }

  const circuitOpen = await evaluateCircuitBreaker(request.tenantId, request.agentCode);
  if (circuitOpen) {
    const failResult = buildFailedResult(request, 'circuit_breaker_open', `Agent '${request.agentCode}' circuit breaker is open`);
    await persistFailedPreRun(request.tenantId, failResult, request);
    await publish('agent.run.failed', request.tenantId, {
      runId: failResult.runId, agentCode: request.agentCode, reason: 'circuit_breaker_open', correlationId: request.correlationId,
    });
    return failResult;
  }

  const active = await isAgentActive(request.tenantId, request.agentCode);
  if (!active) {
    const failResult = buildFailedResult(request, 'agent_not_active', `Agent '${request.agentCode}' is not active`);
    await persistFailedPreRun(request.tenantId, failResult, request);
    return failResult;
  }

  if (def.allowedTriggerSources.length > 0 && !def.allowedTriggerSources.includes(request.triggerSource)) {
    const failResult = buildFailedResult(request, 'trigger_source_not_allowed', `Trigger source '${request.triggerSource}' not allowed for agent '${request.agentCode}'`);
    await persistFailedPreRun(request.tenantId, failResult, request);
    return failResult;
  }

  const policyResult = await evaluateAgentPolicy(request.tenantId, request.agentCode, request);
  if (!policyResult.allowed) {
    await publish('agent.policy.blocked', request.tenantId, {
      agentCode: request.agentCode, reason: policyResult.reason, correlationId: request.correlationId,
    });
    return buildFailedResult(request, 'policy_blocked', policyResult.reason);
  }

  const budgetResult = await evaluateBudgetGuard(request.tenantId, request.agentCode);
  if (!budgetResult.allowed) {
    const failResult = buildFailedResult(request, 'budget_exceeded', budgetResult.reason);
    await persistFailedPreRun(request.tenantId, failResult, request);
    return failResult;
  }

  const sodResult = await validateSodAndDelegation(request);
  if (!sodResult.allowed) {
    const failResult = buildFailedResult(request, 'sod_delegation_blocked', sodResult.reason);
    await persistFailedPreRun(request.tenantId, failResult, request);
    await publish('agent.policy.blocked', request.tenantId, {
      agentCode: request.agentCode, reason: sodResult.reason, sodViolations: sodResult.sodViolations, correlationId: request.correlationId,
    });
    return failResult;
  }

  const middlewareCheck = await runPreExecutionMiddleware(request);
  if (middlewareCheck.blocked) {
    const failResult = buildFailedResult(request, 'middleware_blocked', middlewareCheck.reason || 'pre_execution_middleware_blocked');
    await persistFailedPreRun(request.tenantId, failResult, request);
    return failResult;
  }

  const runId = uuid();
  const startedAt = Date.now();

  await persistRunStart(request.tenantId, runId, request);
  await publish('agent.run.started', request.tenantId, {
    runId, agentCode: request.agentCode, correlationId: request.correlationId,
  });

  let context: AgentContextPackage;
  try {
    context = await buildAgentContext({
      tenantId: request.tenantId,
      agentCode: request.agentCode,
      runId,
      actorId: request.actorId,
      moduleCode: def.ownerCode,
      input: request.input,
      contextOverrides: request.contextOverrides,
    });
  } catch (ctxErr) {
    const reason = ctxErr instanceof Error ? ctxErr.message : 'context_build_failed';
    const failResult = buildFailedResult(request, 'context_build_failed', reason);
    (failResult as any).runId = runId;
    await persistRunEnd(request.tenantId, runId, failResult);
    await publish('agent.run.failed', request.tenantId, {
      runId, agentCode: request.agentCode, reason, correlationId: request.correlationId,
    });
    return failResult;
  }

  let status: AgentRunStatus = 'completed';
  let output: Record<string, unknown> = {};
  let toolCalls: AgentToolCallResult[] = [];
  let error: string | undefined;
  let tokensUsed = 0;
  let costUsd = 0;

  const retryPolicy = def.retryPolicy;
  const maxAttempts = 1 + (retryPolicy?.maxRetries ?? 0);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    status = 'completed';
    error = undefined;
    try {
      const executionResult = await delegateToExecutor(runId, request, context);
      output = executionResult.output;
      toolCalls = executionResult.toolCalls;
      tokensUsed += executionResult.tokensUsed;
      costUsd += executionResult.costUsd;

      if (executionResult.requiresApproval) {
        status = 'awaiting-approval';
      } else if (executionResult.escalated) {
        status = 'escalated';
      }

      const validation = await validateAgentOutput(request.agentCode, output);
      if (!validation.valid) {
        status = 'failed';
        error = `Output validation failed: ${validation.errors.join(', ')}`;
      }

      if (status === 'completed' && def.completionSignals.length > 0) {
        const outputKeys = Object.keys(output);
        const missingSignals = def.completionSignals.filter(s => !outputKeys.includes(s));
        if (missingSignals.length > 0) {
          status = 'failed';
          error = `Missing completion signals: ${missingSignals.join(', ')}`;
        }
      }
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
    }

    if (status !== 'failed') break;

    const isRetryable = retryPolicy && retryPolicy.retryableErrors.length > 0 && error
      ? retryPolicy.retryableErrors.some(re => error!.includes(re))
      : false;
    if (!isRetryable || attempt >= maxAttempts - 1) break;

    await new Promise(resolve => setTimeout(resolve, retryPolicy!.retryDelayMs));
  }

  if (status === 'completed' || status === 'awaiting-approval') {
    const postMiddleware = await runPostExecutionMiddleware(output);
    output = postMiddleware.output;
  }

  const durationMs = Date.now() - startedAt;
  const result: AgentRunResult = {
    runId, agentCode: request.agentCode, status, output, toolCalls,
    durationMs, tokensUsed, costUsd,
    approvalsRequired: status === 'awaiting-approval',
    escalated: status === 'escalated',
    correlationId: request.correlationId,
    error,
  };

  await persistRunEnd(request.tenantId, runId, result);
  recordRunOutcome(request.tenantId, request.agentCode, status === 'completed');
  await publish(
    status === 'failed' ? 'agent.run.failed'
      : status === 'escalated' ? 'agent.run.escalated'
      : 'agent.run.completed',
    request.tenantId,
    { runId, agentCode: request.agentCode, status, durationMs, correlationId: request.correlationId },
  );
  await recordRunMetrics(request.tenantId, result);

  return result;
}

export async function cancelAgentRun(tenantId: string, runId: string, cancelledBy: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_agent_runs SET status = 'cancelled', cancelled_by = $2, completed_at = NOW() WHERE run_id = $1 AND status IN ('queued','running','awaiting-approval')`,
    [runId, cancelledBy],
  );
}

export async function getRunHistory(
  tenantId: string,
  agentCode: string,
  limit = 50,
): Promise<AgentRunResult[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_runs WHERE agent_code = $1 ORDER BY created_at DESC LIMIT $2`,
    [agentCode, limit],
  );
  return rows.map(mapRunRow);
}

export async function getRunById(tenantId: string, runId: string): Promise<AgentRunResult | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_runs WHERE run_id = $1 LIMIT 1`,
    [runId],
  );
  return rows[0] ? mapRunRow(rows[0]) : null;
}

interface ExecutionResult {
  output: Record<string, unknown>;
  toolCalls: AgentToolCallResult[];
  tokensUsed: number;
  costUsd: number;
  requiresApproval: boolean;
  escalated: boolean;
}

async function delegateToExecutor(
  runId: string,
  request: AgentRunRequest,
  context: AgentContextPackage,
): Promise<ExecutionResult> {
  const agentDef = getAgentDefinition(request.agentCode);

  let graphResult: Record<string, unknown> | null = null;
  try {
    const { runAgentGraph } = await import('../../../../ai/graphs/agent-graph-factory');
    graphResult = await runAgentGraph(request.agentCode, request.tenantId, {
      platformMode: (request.input?.platformMode as string) || undefined,
    });
  } catch {
    // LangGraph unavailable — fall back to tool-loop execution
  }

  const toolCodes = (request.input?.toolCalls as string[]) ?? [];
  const toolCalls: AgentToolCallResult[] = [];
  let requiresApproval = false;
  let escalated = false;
  const outputs: Record<string, unknown>[] = [];

  for (const toolCode of toolCodes) {
    const toolRequest: AgentToolCallRequest = {
      runId,
      agentCode: request.agentCode,
      toolCode,
      tenantId: request.tenantId,
      actorId: request.actorId,
      input: (request.input?.toolInputs as Record<string, Record<string, unknown>>)?.[toolCode] ?? {},
      correlationId: request.correlationId,
    };
    const result = await executeToolCall(toolRequest);
    toolCalls.push(result);
    if (result.approvalRequired) requiresApproval = true;
    if (!result.success && result.error !== 'approval_required') {
      outputs.push({ toolCode, error: result.error });
    } else {
      outputs.push({ toolCode, output: result.output });
    }
  }

  const escalationRules = agentDef?.escalationRules ?? [];

  for (const rule of escalationRules) {
    if (rule.condition === 'tool_failure' && toolCalls.some(t => !t.success && t.error !== 'approval_required')) {
      escalated = true;
      outputs.push({ escalation: rule.condition, target: rule.target, targetId: rule.targetId });
      break;
    }
    if (rule.condition === 'blocked_action' && toolCalls.some(t => t.error === 'dauth_access_denied' || t.error === 'tool_not_allowed_for_agent')) {
      escalated = true;
      outputs.push({ escalation: rule.condition, target: rule.target, targetId: rule.targetId });
      break;
    }
    if (rule.condition === 'sod_violation' && toolCalls.some(t => t.error?.includes('sod'))) {
      escalated = true;
      outputs.push({ escalation: rule.condition, target: rule.target, targetId: rule.targetId });
      break;
    }
  }

  if (!escalated) {
    const defaultEscalation = context.restrictions.includes('no_write_actions') &&
      toolCalls.some(t => !t.success && t.error !== 'approval_required');
    if (defaultEscalation) escalated = true;
  }

  const tokensUsed = graphResult ? (graphResult.tokensUsed as number) || 0 : 0;
  const costUsd = graphResult ? (graphResult.costUsd as number) || 0 : 0;

  return {
    output: {
      toolResults: outputs,
      contextRestrictions: context.restrictions,
      ...(graphResult ? { graphOutput: graphResult } : {}),
    },
    toolCalls,
    tokensUsed,
    costUsd,
    requiresApproval,
    escalated,
  };
}

async function persistRunStart(tenantId: string, runId: string, request: AgentRunRequest): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_runs
       (run_id, agent_code, tenant_id, actor_id, trigger_source, task_id, status, input, correlation_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,'running',$7,$8,NOW())`,
    [runId, request.agentCode, tenantId, request.actorId, request.triggerSource, request.taskId || null, JSON.stringify(request.input), request.correlationId],
  );
}

async function persistRunEnd(tenantId: string, runId: string, result: AgentRunResult): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_agent_runs SET
       status=$2, output=$3, duration_ms=$4, tokens_used=$5, cost_usd=$6, error=$7, completed_at=NOW()
     WHERE run_id=$1`,
    [runId, result.status, JSON.stringify(result.output), result.durationMs, result.tokensUsed, result.costUsd, result.error || null],
  );
}

async function persistFailedPreRun(tenantId: string, result: AgentRunResult, request: AgentRunRequest): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_runs
       (run_id, agent_code, tenant_id, actor_id, trigger_source, status, input, error, correlation_id, created_at, completed_at)
     VALUES ($1,$2,$3,$4,$5,'failed',$6,$7,$8,NOW(),NOW())`,
    [result.runId, request.agentCode, tenantId, request.actorId, request.triggerSource, JSON.stringify(request.input), result.error || null, request.correlationId],
  );
}

function mapRunRow(r: Record<string, unknown>): AgentRunResult {
  return {
    runId: r.run_id as string,
    agentCode: r.agent_code as string,
    status: r.status as AgentRunStatus,
    output: typeof r.output === 'string' ? JSON.parse(r.output as string) : ((r.output as Record<string, unknown>) || {}),
    toolCalls: [],
    durationMs: (r.duration_ms as number) || 0,
    tokensUsed: (r.tokens_used as number) || 0,
    costUsd: parseFloat(String(r.cost_usd)) || 0,
    approvalsRequired: r.status === 'awaiting-approval',
    escalated: r.status === 'escalated',
    correlationId: (r.correlation_id as string) || '',
    error: (r.error as string) || undefined,
  };
}

function buildFailedResult(request: AgentRunRequest, code: string, message: string): AgentRunResult {
  return {
    runId: uuid(),
    agentCode: request.agentCode,
    status: 'failed',
    output: { errorCode: code },
    toolCalls: [],
    durationMs: 0,
    tokensUsed: 0,
    costUsd: 0,
    approvalsRequired: false,
    escalated: false,
    correlationId: request.correlationId,
    error: message,
  };
}

export const agentRuntimeService = {
  executeAgentRun,
  cancelAgentRun,
  getRunHistory,
  getRunById,
};
