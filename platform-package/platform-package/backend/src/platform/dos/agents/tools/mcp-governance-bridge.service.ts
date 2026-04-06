import { executeToolCall } from './agent-tool-registry.service';
import { getAgentDefinition } from '../registry/agent-registry.service';
import { publish } from '../../events/event-bus';
import { v4 as uuid } from 'uuid';
import type { AgentToolCallRequest, AgentToolCallResult } from '../contracts/agent.types';

export interface McpToolRequest {
  toolName: string;
  arguments: Record<string, unknown>;
  tenantId: string;
  userId?: string;
  agentId?: string;
}

export interface McpGovernedResult {
  content: Array<{ type: 'text' | 'json'; text?: string; json?: unknown }>;
  isError: boolean;
  governanceApplied: boolean;
  dosToolResult?: AgentToolCallResult;
}

export async function executeMcpToolGoverned(
  request: McpToolRequest,
): Promise<McpGovernedResult> {
  const { toolName, arguments: args, tenantId, userId, agentId } = request;

  if (!agentId || !getAgentDefinition(agentId)) {
    return executeUngoverned(request);
  }

  const toolCode = `${agentId.toLowerCase()}.${toolName}`;
  const correlationId = uuid();

  const dosRequest: AgentToolCallRequest = {
    runId: correlationId,
    agentCode: agentId,
    toolCode,
    tenantId,
    actorId: userId || `system:mcp`,
    input: args,
    correlationId,
  };

  const dosResult = await executeToolCall(dosRequest);

  if (!dosResult.success && dosResult.error === 'tool_not_registered') {
    return executeUngoverned(request);
  }

  if (!dosResult.success) {
    return {
      content: [{ type: 'text', text: `Governance blocked: ${dosResult.error}` }],
      isError: true,
      governanceApplied: true,
      dosToolResult: dosResult,
    };
  }

  let mcpResult: unknown;
  try {
    const { executeMcpTool } = await import('../../../../mcp/handlers/tool-executor');
    const rawResult = await executeMcpTool({ toolName, arguments: args as Record<string, any>, tenantId, userId, agentId });
    mcpResult = rawResult;
  } catch (err) {
    return {
      content: [{ type: 'text', text: `MCP execution failed: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
      governanceApplied: true,
      dosToolResult: dosResult,
    };
  }

  await publish('agent.tool.completed', tenantId, {
    runId: correlationId,
    agentCode: agentId,
    toolCode,
    source: 'mcp',
    correlationId,
  });

  return {
    content: (mcpResult as McpGovernedResult)?.content || [{ type: 'json', json: mcpResult }],
    isError: false,
    governanceApplied: true,
    dosToolResult: dosResult,
  };
}

async function executeUngoverned(request: McpToolRequest): Promise<McpGovernedResult> {
  try {
    const { executeMcpTool } = await import('../../../../mcp/handlers/tool-executor');
    const result = await executeMcpTool({
      toolName: request.toolName,
      arguments: request.arguments as Record<string, any>,
      tenantId: request.tenantId,
      userId: request.userId,
      agentId: request.agentId,
    });
    return {
      content: result.content,
      isError: result.isError ?? false,
      governanceApplied: false,
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `MCP error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
      governanceApplied: false,
    };
  }
}

export const mcpGovernanceBridgeService = {
  executeMcpToolGoverned,
};
