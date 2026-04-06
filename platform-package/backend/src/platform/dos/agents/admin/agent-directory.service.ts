import { getAllAgentDefinitions, getAgentDefinition } from '../registry/agent-registry.service';
import { getToolsForAgent, getAllToolDefinitions } from '../tools/agent-tool-registry.service';
import { checkAgentHealth, getAllAgentHealth } from '../health/agent-health.service';
import { getAgentDiagnostics } from '../diagnostics/agent-diagnostics.service';
import type { AgentDefinition, AgentToolDefinition, AgentHealthSnapshot, AgentDiagnosticsSnapshot } from '../contracts/agent.types';

export interface AgentDirectoryEntry {
  agentCode: string;
  name: string;
  version: string;
  agentType: string;
  ownerLayer: string;
  ownerCode: string;
  executionMode: string;
  uiExposurePolicy: string;
  toolCount: number;
  tools: Array<{ toolCode: string; name: string; riskLevel: string; readWrite: string }>;
  governance: {
    requiresApprovalForWrite: boolean;
    selfApprovalBlocked: boolean;
    humanReviewRequired: boolean;
    fallbackResponse: string;
  };
  health?: {
    posture: string;
    consecutiveFailures: number;
    runs24h: number;
    failures24h: number;
    avgDurationMs: number;
  };
  escalationRules: Array<{ condition: string; target: string; description: string }>;
  replacementPosture: string;
  eventSubscriptions: string[];
  instructionSource: string;
}

export interface AgentDirectoryOverview {
  totalAgents: number;
  byType: Record<string, number>;
  byMode: Record<string, number>;
  byOwner: Record<string, number>;
  totalTools: number;
  agents: AgentDirectoryEntry[];
}

function mapToolToSummary(t: AgentToolDefinition) {
  return { toolCode: t.toolCode, name: t.name, riskLevel: t.riskLevel, readWrite: t.readWrite };
}

function mapDefinitionToEntry(def: AgentDefinition, health?: AgentHealthSnapshot): AgentDirectoryEntry {
  const tools = getToolsForAgent(def.agentCode);
  return {
    agentCode: def.agentCode,
    name: def.name,
    version: def.version,
    agentType: def.agentType,
    ownerLayer: def.ownerLayer,
    ownerCode: def.ownerCode,
    executionMode: def.executionMode,
    uiExposurePolicy: def.uiExposurePolicy,
    toolCount: tools.length,
    tools: tools.map(mapToolToSummary),
    governance: {
      requiresApprovalForWrite: def.approvalPolicy.requiresApprovalForWrite,
      selfApprovalBlocked: def.approvalPolicy.selfApprovalBlocked,
      humanReviewRequired: def.approvalPolicy.humanReviewRequired,
      fallbackResponse: def.approvalPolicy.fallbackResponse,
    },
    health: health ? {
      posture: health.posture,
      consecutiveFailures: health.consecutiveFailures,
      runs24h: health.runs24h,
      failures24h: health.failures24h,
      avgDurationMs: health.avgDurationMs,
    } : undefined,
    escalationRules: def.escalationRules.map(r => ({
      condition: r.condition,
      target: r.target,
      description: r.description,
    })),
    replacementPosture: def.replacementPolicy.posture,
    eventSubscriptions: def.eventSubscriptions,
    instructionSource: def.instructionSource,
  };
}

export async function getAgentDirectory(tenantId: string): Promise<AgentDirectoryOverview> {
  const defs = getAllAgentDefinitions();
  const allTools = getAllToolDefinitions();

  let healthMap = new Map<string, AgentHealthSnapshot>();
  try {
    const healthList = await getAllAgentHealth(tenantId);
    for (const h of healthList) healthMap.set(h.agentCode, h);
  } catch { /* health unavailable */ }

  const agents = defs.map(d => mapDefinitionToEntry(d, healthMap.get(d.agentCode)));

  const byType: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  for (const d of defs) {
    byType[d.agentType] = (byType[d.agentType] || 0) + 1;
    byMode[d.executionMode] = (byMode[d.executionMode] || 0) + 1;
    byOwner[d.ownerCode] = (byOwner[d.ownerCode] || 0) + 1;
  }

  return {
    totalAgents: defs.length,
    byType,
    byMode,
    byOwner,
    totalTools: allTools.length,
    agents,
  };
}

export async function getAgentDirectoryDetail(tenantId: string, agentCode: string): Promise<AgentDirectoryEntry & { diagnostics?: AgentDiagnosticsSnapshot } | null> {
  const def = getAgentDefinition(agentCode);
  if (!def) return null;

  let health: AgentHealthSnapshot | undefined;
  try { health = await checkAgentHealth(tenantId, agentCode); } catch { /* */ }

  let diagnostics: AgentDiagnosticsSnapshot | undefined;
  try { diagnostics = await getAgentDiagnostics(tenantId, agentCode); } catch { /* */ }

  return {
    ...mapDefinitionToEntry(def, health),
    diagnostics,
  };
}
