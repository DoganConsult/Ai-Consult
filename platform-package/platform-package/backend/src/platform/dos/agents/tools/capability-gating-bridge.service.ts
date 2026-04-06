import { getAgentDefinition } from '../registry/agent-registry.service';

export interface CapabilityGateOutcome {
  allowed: boolean;
  reason?: string;
  gatedBy?: string[];
}

export async function evaluateCapabilityGate(
  tenantId: string,
  agentCode: string,
  toolCode: string,
  userId?: string,
): Promise<CapabilityGateOutcome> {
  try {
    const { checkCapabilityGate } = await import('../../config/registry/capability-gating.service');
    const result = await checkCapabilityGate({
      tenantId,
      agentId: agentCode,
      toolName: toolCode,
      userId,
    });
    return {
      allowed: result.allowed,
      reason: result.reason,
      gatedBy: result.gatedBy,
    };
  } catch {
    return { allowed: true, reason: 'capability_gating_unavailable_allow_through' };
  }
}

export async function getGatedToolsForDosAgent(
  tenantId: string,
  agentCode: string,
  userId?: string,
): Promise<string[]> {
  const def = getAgentDefinition(agentCode);
  if (!def) return [];

  const results: string[] = [];
  for (const toolCode of def.allowedTools) {
    const gate = await evaluateCapabilityGate(tenantId, agentCode, toolCode, userId);
    if (gate.allowed) results.push(toolCode);
  }
  return results;
}

export const capabilityGatingBridgeService = {
  evaluateCapabilityGate,
  getGatedToolsForDosAgent,
};
