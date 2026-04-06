// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { publish } from '../../events/event-bus';
import { getAgentDefinition } from '../registry/agent-registry.service';
import type {
  AgentToolDefinition,
  AgentToolCallRequest,
  AgentToolCallResult,
  ToolRiskLevel,
} from '../contracts/agent.types';

const _toolRegistry = new Map<string, AgentToolDefinition>();

export function registerTool(def: AgentToolDefinition): void {
  if (_toolRegistry.has(def.toolCode)) {
    throw new Error(`Tool '${def.toolCode}' already registered`);
  }
  _toolRegistry.set(def.toolCode, Object.freeze(def));
}

export function registerToolBatch(defs: AgentToolDefinition[]): void {
  for (const d of defs) registerTool(d);
}

export function getToolDefinition(toolCode: string): AgentToolDefinition | undefined {
  return _toolRegistry.get(toolCode);
}

export function getAllToolDefinitions(): AgentToolDefinition[] {
  return Array.from(_toolRegistry.values());
}

export function getToolsByRisk(riskLevel: ToolRiskLevel): AgentToolDefinition[] {
  return getAllToolDefinitions().filter(t => t.riskLevel === riskLevel);
}

export function getToolsForAgent(agentCode: string): AgentToolDefinition[] {
  const def = getAgentDefinition(agentCode);
  if (!def) return [];
  return def.allowedTools
    .map(code => _toolRegistry.get(code))
    .filter((t): t is AgentToolDefinition => !!t);
}

export function isToolAllowedForAgent(agentCode: string, toolCode: string): boolean {
  const def = getAgentDefinition(agentCode);
  if (!def) return false;
  return def.allowedTools.includes(toolCode);
}

export function validateToolDefinition(def: AgentToolDefinition): string[] {
  const errors: string[] = [];
  if (!def.toolCode) errors.push('toolCode is required');
  if (!def.name) errors.push('name is required');
  if (!def.owner) errors.push('owner is required');
  if (!def.riskLevel) errors.push('riskLevel is required');
  if (!def.readWrite) errors.push('readWrite is required');
  if (def.readWrite === 'write' && !def.requiresApproval && def.riskLevel !== 'safe') {
    errors.push('write tools with risk above safe must require approval');
  }
  return errors;
}

export async function executeToolCall(request: AgentToolCallRequest): Promise<AgentToolCallResult> {
  const tool = getToolDefinition(request.toolCode);
  if (!tool) {
    return { toolCode: request.toolCode, success: false, output: {}, durationMs: 0, approvalRequired: false, error: 'tool_not_registered' };
  }

  if (!isToolAllowedForAgent(request.agentCode, request.toolCode)) {
    return { toolCode: request.toolCode, success: false, output: {}, durationMs: 0, approvalRequired: false, error: 'tool_not_allowed_for_agent' };
  }

  const agentDef = getAgentDefinition(request.agentCode);
  if (agentDef && tool.readWrite !== 'read' && agentDef.writeBoundaries.length > 0) {
    const writeTarget = (request.input?.writeTarget as string) || request.toolCode;
    const withinBoundary = agentDef.writeBoundaries.some(b => writeTarget.startsWith(b) || b === '*');
    if (!withinBoundary) {
      return { toolCode: request.toolCode, success: false, output: {}, durationMs: 0, approvalRequired: false, error: `write_boundary_violation:${writeTarget}` };
    }
  }

  const start = Date.now();

  await publish('agent.tool.called', request.tenantId, {
    runId: request.runId, agentCode: request.agentCode, toolCode: request.toolCode,
    riskLevel: tool.riskLevel, correlationId: request.correlationId,
  });

  if (tool.dauthControlRequired) {
    try {
      const dauthAccess = await import('../../../dauth/access/access-snapshot.service');
      const snapshot = await dauthAccess.getAccessSnapshot(request.tenantId, request.actorId);
      const hasPermission = snapshot?.effectivePermissions?.some(
        (p: string) => p.includes(request.toolCode) || p.includes('agent.tool.execute') || p === '*',
      );
      if (!hasPermission) {
        return { toolCode: request.toolCode, success: false, output: {}, durationMs: Date.now() - start, approvalRequired: false, error: 'dauth_access_denied' };
      }

      if (snapshot?.scopeBindings && snapshot.scopeBindings.length > 0) {
        const writeTarget = (request.input?.writeTarget as string) || '';
        const __scopeContext = (request.input?.scopeContext as string) || '';
        if (tool.readWrite !== 'read' && writeTarget) {
          const withinScope = snapshot.scopeBindings.some(
            (s: { scopeType: string; scopeId: string }) =>
              writeTarget.startsWith(s.scopeId) || s.scopeType === 'global' || s.scopeId === '*',
          );
          if (!withinScope) {
            return { toolCode: request.toolCode, success: false, output: {}, durationMs: Date.now() - start, approvalRequired: false, error: `dauth_scope_denied:${writeTarget}` };
          }
        }
      }
    } catch {
      return { toolCode: request.toolCode, success: false, output: {}, durationMs: Date.now() - start, approvalRequired: false, error: 'dauth_control_unavailable' };
    }
  }

  if (tool.requiresApproval) {
    const riskLevelOrder: Record<string, number> = { safe: 0, moderate: 1, high: 2, critical: 3 };
    const toolRiskScore = riskLevelOrder[tool.riskLevel] ?? 1;
    const autoApproveThreshold = agentDef?.approvalPolicy.autoApproveBelow ?? 0;
    if (toolRiskScore >= autoApproveThreshold) {
      return {
        toolCode: request.toolCode,
        success: false,
        output: { message: 'approval_required' },
        durationMs: Date.now() - start,
        approvalRequired: true,
      };
    }
  }

  await persistToolCall(request.tenantId, request);

  if (tool.auditRequired) {
    await persistToolAudit(request.tenantId, request, tool);
  }

  let output: Record<string, unknown> = {};
  let success = true;
  let error: string | undefined;

  try {
    const agentCodeUpper = request.agentCode.toUpperCase();
    const { getToolsForAgent: getAgrcTools } = await import('../../../../ai/tools/tool-registry');
    const agrcTools = getAgrcTools(agentCodeUpper, request.tenantId);
    const toolName = request.toolCode.includes('.') ? request.toolCode.split('.').slice(1).join('.') : request.toolCode;
    const agrcTool = agrcTools.find((t: { name: string }) => t.name === toolName);

    if (agrcTool) {
      const rawResult = await agrcTool._call(request.input || {});
      try {
        output = JSON.parse(rawResult);
      } catch {
        output = { result: rawResult };
      }
    }
  } catch (execErr) {
    success = false;
    error = execErr instanceof Error ? execErr.message : String(execErr);
  }

  const durationMs = Date.now() - start;
  const result: AgentToolCallResult = {
    toolCode: request.toolCode,
    success,
    output,
    durationMs,
    approvalRequired: false,
    error,
  };

  await publish('agent.tool.completed', request.tenantId, {
    runId: request.runId, agentCode: request.agentCode, toolCode: request.toolCode,
    success, durationMs, correlationId: request.correlationId,
  });

  return result;
}

async function persistToolAudit(tenantId: string, request: AgentToolCallRequest, tool: AgentToolDefinition): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_tool_audit
       (run_id, agent_code, tool_code, actor_id, risk_level, read_write, dauth_controlled, correlation_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
    [request.runId, request.agentCode, request.toolCode, request.actorId, tool.riskLevel, tool.readWrite, tool.dauthControlRequired, request.correlationId],
  );
}

async function persistToolCall(tenantId: string, request: AgentToolCallRequest): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_tool_calls
       (run_id, agent_code, tool_code, actor_id, input, correlation_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [request.runId, request.agentCode, request.toolCode, request.actorId, JSON.stringify(request.input), request.correlationId],
  );
}

export function resetToolRegistry(): void {
  _toolRegistry.clear();
}

export const agentToolRegistryService = {
  registerTool,
  registerToolBatch,
  getToolDefinition,
  getAllToolDefinitions,
  getToolsByRisk,
  getToolsForAgent,
  isToolAllowedForAgent,
  validateToolDefinition,
  executeToolCall,
  resetToolRegistry,
};
