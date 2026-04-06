import { logger } from '../../../../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export interface AgentAction {
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, any>;
  [key: string]: any;
}

export interface AgentRunResult {
  success: boolean;
  agent_id: string;
  tenant_id: string;
  run_id?: string;
  output?: any;
  actions?: AgentAction[];
  error?: string;
  duration_ms?: number;
}

export interface AgentRunOpts {
  dryRun?: boolean;
  maxActions?: number;
  timeout?: number;
  context?: Record<string, any>;
}

export async function executeAction(
  _tenantId: string,
  _agentId: string,
  _action: AgentAction,
): Promise<{ success: boolean; error?: string }> {
  logger.info('[AgentRunner] executeAction called — no product runtime registered');
  return { success: false, error: 'No product agent runtime registered in platform package' };
}

export const CONTEXT_BUILDERS: Record<string, (...args: any[]) => Promise<any>> = {};

export async function runAllAgents(
  _tenantId: string,
  _opts?: AgentRunOpts,
): Promise<AgentRunResult[]> {
  logger.info('[AgentRunner] runAllAgents called — no product agent runtime registered');
  return [];
}

export function _fallbackAgentResponse(agentId: string, error: unknown): AgentRunResult {
  return {
    success: false,
    agent_id: agentId,
    tenant_id: '',
    error: toErrorMessage(error),
  };
}

export async function runAgent(
  tenantId: string,
  agentId: string,
  _opts?: AgentRunOpts,
): Promise<AgentRunResult> {
  logger.info(`[AgentRunner] runAgent(${agentId}) — no product agent runtime registered`);
  return {
    success: false,
    agent_id: agentId,
    tenant_id: tenantId,
    error: 'No product agent runtime registered in platform package',
  };
}
