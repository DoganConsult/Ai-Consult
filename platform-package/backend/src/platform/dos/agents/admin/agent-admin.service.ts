import { safeQuery, tenantSchema } from '../../../../config/database/database';
import {
  getAgentDefinition,
  getAllAgentDefinitions,
  getAgentState,
  setAgentState,
} from '../registry/agent-registry.service';
import { getAgentDiagnostics, getPlatformDiagnostics } from '../diagnostics/agent-diagnostics.service';
import { getPendingApprovals, resolveApproval, getApprovalsByRun } from '../approvals/agent-approval.service';
import { getRunHistory, cancelAgentRun } from '../runtime/agent-runtime.service';
import { getAllAgentHealth } from '../health/agent-health.service';
import { publish } from '../../events/event-bus';
import type {
  AgentDefinition,
  AgentState,
  AgentAdminAction,
  AgentRunResult,
  AgentApprovalRequest,
  AgentDiagnosticsSnapshot,
  AgentHealthSnapshot,
  ReplacementPosture,
} from '../contracts/agent.types';

export async function enableAgent(tenantId: string, agentCode: string, performedBy: string): Promise<void> {
  await setAgentState(tenantId, agentCode, 'active', performedBy, 'admin_enable');
}

export async function disableAgent(tenantId: string, agentCode: string, performedBy: string, reason: string): Promise<void> {
  await setAgentState(tenantId, agentCode, 'disabled', performedBy, reason);
}

export async function pauseAgent(tenantId: string, agentCode: string, performedBy: string, reason: string): Promise<void> {
  await setAgentState(tenantId, agentCode, 'paused', performedBy, reason);
}

export async function retireAgent(tenantId: string, agentCode: string, performedBy: string, reason: string): Promise<void> {
  await setAgentState(tenantId, agentCode, 'retired', performedBy, reason);
}

export async function getAgentAdminView(
  tenantId: string,
  agentCode: string,
): Promise<{
  definition: AgentDefinition | undefined;
  state: AgentState;
  diagnostics: AgentDiagnosticsSnapshot;
  recentRuns: AgentRunResult[];
  pendingApprovals: AgentApprovalRequest[];
  approvalHistory: AgentApprovalRequest[];
  health: AgentHealthSnapshot;
  replacementPosture: ReplacementPosture;
}> {
  const [definition, state, diagnostics, recentRuns, health] = await Promise.all([
    Promise.resolve(getAgentDefinition(agentCode)),
    getAgentState(tenantId, agentCode),
    getAgentDiagnostics(tenantId, agentCode),
    getRunHistory(tenantId, agentCode, 20),
    (await import('../health/agent-health.service')).checkAgentHealth(tenantId, agentCode),
  ]);
  const pendingApprovals = await getPendingApprovals(tenantId, 20);
  const agentApprovals = pendingApprovals.filter(a => a.agentCode === agentCode);

  const approvalHistory: AgentApprovalRequest[] = [];
  for (const run of recentRuns.slice(0, 10)) {
    const runApprovals = await getApprovalsByRun(tenantId, run.runId);
    approvalHistory.push(...runApprovals);
  }

  const replacementPosture: ReplacementPosture = definition?.replacementPolicy.posture ?? 'replacement-prohibited';

  return { definition, state, diagnostics, recentRuns, pendingApprovals: agentApprovals, approvalHistory, health, replacementPosture };
}

export async function getPlatformAdminOverview(tenantId: string): Promise<{
  agents: { code: string; name: string; state: AgentState; mode: string; type: string }[];
  diagnostics: ReturnType<typeof getPlatformDiagnostics> extends Promise<infer T> ? T : never;
  healthSummary: AgentHealthSnapshot[];
  pendingApprovals: AgentApprovalRequest[];
}> {
  const defs = getAllAgentDefinitions();
  const agents: { code: string; name: string; state: AgentState; mode: string; type: string }[] = [];
  for (const def of defs) {
    const state = await getAgentState(tenantId, def.agentCode);
    agents.push({ code: def.agentCode, name: def.name, state, mode: def.executionMode, type: def.agentType });
  }

  const [diagnostics, healthSummary, pendingApprovals] = await Promise.all([
    getPlatformDiagnostics(tenantId),
    getAllAgentHealth(tenantId),
    getPendingApprovals(tenantId, 50),
  ]);

  return { agents, diagnostics, healthSummary, pendingApprovals };
}

export async function executeAdminAction(
  tenantId: string,
  action: AgentAdminAction,
): Promise<{ success: boolean; message: string }> {
  switch (action.actionCode) {
    case 'enable':
      await enableAgent(tenantId, action.agentCode, action.performedBy);
      return { success: true, message: `Agent '${action.agentCode}' enabled` };
    case 'disable':
      await disableAgent(tenantId, action.agentCode, action.performedBy, action.reason);
      return { success: true, message: `Agent '${action.agentCode}' disabled` };
    case 'pause':
      await pauseAgent(tenantId, action.agentCode, action.performedBy, action.reason);
      return { success: true, message: `Agent '${action.agentCode}' paused` };
    case 'retire':
      await retireAgent(tenantId, action.agentCode, action.performedBy, action.reason);
      return { success: true, message: `Agent '${action.agentCode}' retired` };
    case 'cancel_run':
      if (action.targetRunId) {
        await cancelAgentRun(tenantId, action.targetRunId, action.performedBy);
        return { success: true, message: `Run '${action.targetRunId}' cancelled` };
      }
      return { success: false, message: 'targetRunId required for cancel_run' };
    case 'approve':
      if (action.targetApprovalId) {
        await resolveApproval(tenantId, action.targetApprovalId, 'approved', action.performedBy, action.reason);
        return { success: true, message: `Approval '${action.targetApprovalId}' granted` };
      }
      return { success: false, message: 'targetApprovalId required for approve' };
    case 'deny':
      if (action.targetApprovalId) {
        await resolveApproval(tenantId, action.targetApprovalId, 'denied', action.performedBy, action.reason);
        return { success: true, message: `Approval '${action.targetApprovalId}' denied` };
      }
      return { success: false, message: 'targetApprovalId required for deny' };
    default:
      return { success: false, message: `Unknown admin action: ${action.actionCode}` };
  }
}

export async function updateReplacementPosture(
  tenantId: string,
  agentCode: string,
  newPosture: import('../contracts/agent.types').ReplacementPosture,
  performedBy: string,
  reason: string,
): Promise<void> {
  const def = getAgentDefinition(agentCode);
  const previousPosture = def?.replacementPolicy.posture ?? 'replacement-prohibited';
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_state_log (agent_code, previous_state, new_state, performed_by, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [agentCode, `replacement:${previousPosture}`, `replacement:${newPosture}`, performedBy, reason],
  );
  await publish('agent.replacement.status.changed', tenantId, {
    agentCode, previousPosture, newPosture, performedBy, reason,
  });
}

export async function getAgentIncidents(
  tenantId: string,
  agentCode: string,
  limit = 20,
): Promise<{ runId: string; error: string; occurredAt: string }[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT run_id, error, completed_at FROM "${schema}".dos_agent_runs
     WHERE agent_code = $1 AND status = 'failed' AND error IS NOT NULL
     ORDER BY completed_at DESC LIMIT $2`,
    [agentCode, limit],
  );
  return rows.map((r: Record<string, unknown>) => ({
    runId: r.run_id as string,
    error: (r.error as string) || '',
    occurredAt: (r.completed_at as Date)?.toISOString?.() || '',
  }));
}

export async function getAgentRollbackHistory(
  tenantId: string,
  agentCode: string,
  limit = 20,
): Promise<{ previousState: string; newState: string; performedBy: string; reason: string; at: string }[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT previous_state, new_state, performed_by, reason, created_at FROM "${schema}".dos_agent_state_log
     WHERE agent_code = $1 ORDER BY created_at DESC LIMIT $2`,
    [agentCode, limit],
  );
  return rows.map((r: Record<string, unknown>) => ({
    previousState: r.previous_state as string,
    newState: r.new_state as string,
    performedBy: r.performed_by as string,
    reason: (r.reason as string) || '',
    at: (r.created_at as Date)?.toISOString?.() || '',
  }));
}

export const agentAdminService = {
  enableAgent,
  disableAgent,
  pauseAgent,
  retireAgent,
  getAgentAdminView,
  getPlatformAdminOverview,
  executeAdminAction,
  updateReplacementPosture,
  getAgentIncidents,
  getAgentRollbackHistory,
};
