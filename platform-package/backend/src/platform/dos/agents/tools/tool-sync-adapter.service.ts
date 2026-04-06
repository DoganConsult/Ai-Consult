import type { AgrcTool, ToolGovernanceMeta } from '../../../../ai/tools/tool-base';
import type { AgentToolDefinition, ToolRiskLevel, ToolReadWrite } from '../contracts/agent.types';
import { registerTool, getToolDefinition } from './agent-tool-registry.service';
import { getAgentDefinition } from '../registry/agent-registry.service';

function mapRiskLevel(meta: ToolGovernanceMeta): ToolRiskLevel {
  const tier = meta.riskTier;
  if (tier === 'critical') return 'critical';
  if (tier === 'high') return 'high';
  if (tier === 'medium') return 'moderate';
  return 'safe';
}

function mapReadWrite(meta: ToolGovernanceMeta): ToolReadWrite {
  const level = meta.sideEffectLevel;
  if (level === 'destructive' || level === 'write') return 'write';
  if (level === 'read') return 'read';
  return 'read';
}

export function adaptAgrcToolToDefinition(
  agentCode: string,
  tool: AgrcTool,
): AgentToolDefinition {
  const meta = tool.governance;
  return {
    toolCode: `${agentCode.toLowerCase()}.${tool.name}`,
    name: tool.name,
    owner: meta.module || agentCode,
    allowedAgentTypes: ['product', 'module', 'platform'],
    inputSchema: {},
    outputSchema: {},
    riskLevel: mapRiskLevel(meta),
    readWrite: mapReadWrite(meta),
    requiresApproval: meta.requiresApproval ?? false,
    dauthControlRequired: (meta.requiredScopes?.length ?? 0) > 0,
    auditRequired: meta.auditLevel === 'full' || meta.auditLevel === 'basic',
  };
}

export function syncAgentTools(agentCode: string, tenantId: string): string[] {
  let tools: AgrcTool[] = [];
  try {
    const { getToolsForAgent } = require('../../../../ai/tools/tool-registry');
    tools = getToolsForAgent(agentCode, tenantId);
  } catch {
    return [];
  }

  const synced: string[] = [];
  for (const tool of tools) {
    const def = adaptAgrcToolToDefinition(agentCode, tool);
    if (!getToolDefinition(def.toolCode)) {
      try {
        registerTool(def);
        synced.push(def.toolCode);
      } catch {
        // already registered
      }
    }
  }

  const agentDef = getAgentDefinition(agentCode);
  if (agentDef && synced.length > 0) {
    const existing = new Set(agentDef.allowedTools);
    for (const code of synced) existing.add(code);
  }

  return synced;
}

export function syncAllAgentTools(tenantId: string): Record<string, string[]> {
  let agentIds: string[] = [];
  try {
    const { getAllAgentIds } = require('../../../../ai/tools/tool-registry');
    agentIds = getAllAgentIds();
  } catch {
    return {};
  }

  const result: Record<string, string[]> = {};
  for (const agentId of agentIds) {
    result[agentId] = syncAgentTools(agentId, tenantId);
  }
  return result;
}
