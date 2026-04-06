import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getAgentDefinition, getAllAgentDefinitions, getAgentState } from '../registry/agent-registry.service';
import { checkAgentHealth } from '../health/agent-health.service';
import type {
  AgentRunResult,
  AgentDiagnosticsSnapshot,
  
} from '../contracts/agent.types';

export async function recordRunMetrics(
  tenantId: string,
  result: AgentRunResult,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_metrics
       (agent_code, run_id, status, duration_ms, tokens_used, cost_usd, tool_call_count, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [
      result.agentCode, result.runId, result.status,
      result.durationMs, result.tokensUsed, result.costUsd,
      result.toolCalls.length,
    ],
  );
}

export async function getAgentDiagnostics(
  tenantId: string,
  agentCode: string,
): Promise<AgentDiagnosticsSnapshot> {
  const def = getAgentDefinition(agentCode);
  const state = await getAgentState(tenantId, agentCode);
  const health = await checkAgentHealth(tenantId, agentCode);
  const schema = tenantSchema(tenantId);

  const { rows: metricRows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_runs,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       COALESCE(SUM(tokens_used),0)::int AS total_tokens,
       COALESCE(SUM(cost_usd),0)::numeric AS total_cost,
       COALESCE(AVG(duration_ms),0)::int AS avg_duration,
       COALESCE(SUM(tool_call_count),0)::int AS total_tool_calls
     FROM "${schema}".dos_agent_metrics
     WHERE agent_code = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [agentCode],
  );

  const m = metricRows[0] || {};

  return {
    agentCode,
    tenantId,
    state,
    mode: def?.executionMode ?? 'observe-only',
    health,
    totalRuns24h: m.total_runs ?? 0,
    completedRuns24h: m.completed ?? 0,
    failedRuns24h: m.failed ?? 0,
    totalTokens24h: m.total_tokens ?? 0,
    totalCost24h: parseFloat(m.total_cost) || 0,
    avgDurationMs: m.avg_duration ?? 0,
    totalToolCalls24h: m.total_tool_calls ?? 0,
    replacementPosture: def?.replacementPolicy.posture ?? 'replacement-prohibited',
    toolInventory: def?.allowedTools ?? [],
    policyInventory: {
      approvalForWrite: def?.approvalPolicy.requiresApprovalForWrite ?? true,
      selfApprovalBlocked: def?.approvalPolicy.selfApprovalBlocked ?? true,
      blockedCategories: def?.approvalPolicy.blockedActionCategories ?? [],
    },
    snapshotAt: new Date().toISOString(),
  };
}

export async function getPlatformDiagnostics(
  tenantId: string,
): Promise<{
  agents: AgentDiagnosticsSnapshot[];
  summary: { total: number; active: number; unhealthy: number; totalCost24h: number };
}> {
  const defs = getAllAgentDefinitions();
  const agents: AgentDiagnosticsSnapshot[] = [];
  let active = 0;
  let unhealthy = 0;
  let totalCost = 0;

  for (const def of defs) {
    const diag = await getAgentDiagnostics(tenantId, def.agentCode);
    agents.push(diag);
    if (diag.state === 'active' || diag.state === 'canary') active++;
    if (diag.health.posture === 'unhealthy') unhealthy++;
    totalCost += diag.totalCost24h;
  }

  return {
    agents,
    summary: { total: defs.length, active, unhealthy, totalCost24h: totalCost },
  };
}

export const agentDiagnosticsService = {
  recordRunMetrics,
  getAgentDiagnostics,
  getPlatformDiagnostics,
};
