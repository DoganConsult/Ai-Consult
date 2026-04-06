import { getAgentState, setAgentState } from '../registry/agent-registry.service';
import { publish } from '../../events/event-bus';
import type { AgentState } from '../contracts/agent.types';

const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  registered: ['active', 'shadow', 'disabled'],
  active:     ['paused', 'disabled', 'canary', 'retired'],
  paused:     ['active', 'disabled', 'retired'],
  disabled:   ['active', 'retired'],
  shadow:     ['active', 'canary', 'disabled', 'retired'],
  canary:     ['active', 'shadow', 'disabled', 'retired'],
  retired:    [],
};

export function isValidTransition(from: AgentState, to: AgentState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(from: AgentState): AgentState[] {
  return VALID_TRANSITIONS[from] ?? [];
}

export interface TransitionResult {
  success: boolean;
  previousState: AgentState;
  newState: AgentState;
  error?: string;
}

export async function transitionAgentState(
  tenantId: string,
  agentCode: string,
  targetState: AgentState,
  performedBy: string,
  reason: string,
): Promise<TransitionResult> {
  const currentState = await getAgentState(tenantId, agentCode);

  if (currentState === targetState) {
    return { success: true, previousState: currentState, newState: targetState };
  }

  if (!isValidTransition(currentState, targetState)) {
    return {
      success: false,
      previousState: currentState,
      newState: currentState,
      error: `invalid_transition:${currentState}->${targetState}. Allowed: [${getValidTransitions(currentState).join(',')}]`,
    };
  }

  if (targetState === 'retired') {
    const hasActiveRuns = await checkActiveRuns(tenantId, agentCode);
    if (hasActiveRuns) {
      return {
        success: false,
        previousState: currentState,
        newState: currentState,
        error: 'cannot_retire:active_runs_exist',
      };
    }
  }

  await setAgentState(tenantId, agentCode, targetState, performedBy, reason);

  await publish('agent.lifecycle.transition', tenantId, {
    agentCode,
    from: currentState,
    to: targetState,
    performedBy,
    reason,
  });

  return { success: true, previousState: currentState, newState: targetState };
}

async function checkActiveRuns(tenantId: string, agentCode: string): Promise<boolean> {
  try {
    const { safeQuery, tenantSchema } = await import('../../../../config/database/database');
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".dos_agent_runs
       WHERE agent_code = $1 AND status IN ('running', 'queued', 'awaiting-approval')`,
      [agentCode],
    );
    return (rows[0]?.cnt ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function bulkTransition(
  tenantId: string,
  agentCodes: string[],
  targetState: AgentState,
  performedBy: string,
  reason: string,
): Promise<TransitionResult[]> {
  const results: TransitionResult[] = [];
  for (const code of agentCodes) {
    results.push(await transitionAgentState(tenantId, code, targetState, performedBy, reason));
  }
  return results;
}

export const agentLifecycleService = {
  isValidTransition,
  getValidTransitions,
  transitionAgentState,
  bulkTransition,
};
