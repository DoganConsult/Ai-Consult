import { getAgentDefinition } from '../registry/agent-registry.service';
import { retrieveMemories } from '../memory/agent-memory.service';
import type { AgentContextPackage, AgentMemoryEntry } from '../contracts/agent.types';

export interface ContextBuildRequest {
  tenantId: string;
  agentCode: string;
  runId: string;
  actorId: string;
  moduleCode: string;
  entityType?: string;
  entityId?: string;
  input: Record<string, unknown>;
  contextOverrides?: Record<string, unknown>;
}

export async function buildAgentContext(request: ContextBuildRequest): Promise<AgentContextPackage> {
  const def = getAgentDefinition(request.agentCode);
  const allowedContexts = def?.allowedContexts ?? [];

  const memories = await retrieveMemories(request.tenantId, request.agentCode, undefined, 50);
  const filteredMemories = filterMemoriesByContext(memories, allowedContexts);

  let permissions: string[] = [];
  let scopes: string[] = [];
  try {
    const dauthImport = await import('../../../dauth/access/access-snapshot.service');
    const snapshot = await dauthImport.getAccessSnapshot(request.tenantId, request.actorId);
    permissions = snapshot?.effectivePermissions ?? [];
    scopes = snapshot?.scopeBindings?.map((s: { scopeType: string; scopeId: string }) => `${s.scopeType}:${s.scopeId}`) ?? [];
  } catch (err) {
    const isObserveOnly = def?.executionMode === 'observe-only';
    if (!isObserveOnly) {
      throw new Error(`dauth_unavailable: cannot build agent context without access snapshot for actor ${request.actorId}`);
    }
    permissions = [];
    scopes = [];
  }

  const restrictions = buildRestrictions(def);

  const contextData: Record<string, unknown> = {
    ...request.input,
    ...(request.contextOverrides || {}),
  };

  return {
    tenantId: request.tenantId,
    agentCode: request.agentCode,
    runId: request.runId,
    moduleCode: request.moduleCode,
    entityType: request.entityType,
    entityId: request.entityId,
    permissions,
    scopes,
    memories: filteredMemories,
    contextData,
    restrictions,
  };
}

function filterMemoriesByContext(memories: AgentMemoryEntry[], allowedContexts: string[]): AgentMemoryEntry[] {
  if (allowedContexts.length === 0 || allowedContexts.includes('*')) return memories;
  return memories.filter(m => allowedContexts.includes(m.scope) || allowedContexts.includes(m.key));
}

function buildRestrictions(def: ReturnType<typeof getAgentDefinition>): string[] {
  if (!def) return ['no_agent_definition'];
  const restrictions: string[] = [];
  if (def.executionMode === 'observe-only') restrictions.push('no_write_actions');
  if (def.executionMode === 'advisory') restrictions.push('no_direct_mutations');
  if (def.approvalPolicy.requiresApprovalForWrite) restrictions.push('write_requires_approval');
  if (def.approvalPolicy.selfApprovalBlocked) restrictions.push('no_self_approval');
  if (def.replacementPolicy.posture === 'replacement-prohibited') restrictions.push('replacement_prohibited');
  for (const zone of def.approvalPolicy.blockedActionCategories) {
    restrictions.push(`blocked:${zone}`);
  }
  return restrictions;
}

export const agentContextService = {
  buildAgentContext,
};
