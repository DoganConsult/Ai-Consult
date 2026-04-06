// @ts-nocheck
// ============================================
// OpenClaw Enhanced MCP Server
// Exposes: Files, Databases, Search, Calculators, Workflows, GRC Systems
// Supports: A2A (Agent-to-Agent), AG-UI (Real-time streaming)
// ============================================

import { getOpenClawConfig } from '../config/openclaw.config';
import { createLangfuseTrace } from '../../langgraph/observability/langfuse-client.service';
import { getOpenTelemetryContext } from '../../langgraph/observability/tracing-correlation.service';
import { toErrorMessage } from '../../errors/http-error.util';
import { logger } from '../../platform/dos/observability/services/logger.service';

import { buildToolDefinitions, executeToolCall } from './openclaw-mcp-tools';
import { listResources, readResource } from './openclaw-mcp-resources';

/** Common MCP request params with optional context */
export interface McpParams extends Record<string, any> {
  _context?: Record<string, any>;
  tenantId?: string;
  uri?: string;
  name?: string;
  arguments?: Record<string, any>;
  agentId?: string;
}

/** MCP resource entry */
export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType: string;
  text?: string;
}

/** MCP tool result */
export interface McpToolResult {
  content: Array<{ type: string; json?: unknown; text?: string }>;
  isError: boolean;
}

export interface EnhancedOpenClawMcpServer {
  listResources(params: McpParams): Promise<McpResource[]>;
  readResource(params: McpParams): Promise<McpResource[]>;
  listTools(params: McpParams): Promise<Record<string, any>[]>;
  callTool(params: McpParams): Promise<McpToolResult>;
  listPrompts(params: McpParams): Promise<Record<string, any>[]>;
  getPrompt(params: McpParams): Promise<Record<string, any>>;
  // A2A: Agent-to-Agent communication
  sendAgentMessage?(params: McpParams): Promise<unknown>;
  // AG-UI: Real-time event streaming
  subscribeToEvents?(params: McpParams): Promise<unknown>;
}

/**
 * Create Enhanced OpenClaw MCP server with full GRC system integration
 */
export function createEnhancedOpenClawMcpServer(): EnhancedOpenClawMcpServer {
  const config = getOpenClawConfig();

  const server: EnhancedOpenClawMcpServer = {
    async listResources(params: McpParams): Promise<McpResource[]> {
      return listResources(params, config, server.listTools.bind(server));
    },

    async readResource(params: McpParams): Promise<McpResource[]> {
      return readResource(params, config, server.listTools.bind(server));
    },

    async listTools(_params: McpParams): Promise<Record<string, any>[]> {
      return buildToolDefinitions(config);
    },

    async callTool(params: McpParams): Promise<McpToolResult> {
      const { name, arguments: args = {} } = params as { name: string; arguments: Record<string, any> };
      const context = (params._context || {}) as Record<string, any>;
      const tenantId = (args.tenantId || context.tenantId) as string;

      if (!tenantId) {
        throw new Error('tenantId is required for tool execution');
      }

      // Create tracing context
      const otelContext = getOpenTelemetryContext();
      const __langfuseTrace = createLangfuseTrace('openclaw-tool-call', {
        tenantId,
        toolName: name,
        otelTraceId: otelContext?.traceId,
        otelSpanId: otelContext?.spanId,
        correlationId: context.correlationId,
      });

      try {
        const result = await executeToolCall(name, args, context, config);

        return {
          content: [{
            type: 'json',
            json: result,
          }],
          isError: false,
        };
      } catch (err: unknown) {
        const errorMsg = toErrorMessage(err);
        logger.error('[OpenClaw] Tool execution error', { tool: name, error: errorMsg });
        return {
          content: [{
            type: 'text',
            text: `Tool execution failed: ${errorMsg}`,
          }],
          isError: true,
        };
      }
    },

    async listPrompts(_params: McpParams): Promise<Record<string, any>[]> {
      const prompts: Record<string, any>[] = [];
      const agents = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];
      for (const agentId of agents) {
        prompts.push({
          name: `agent_${agentId}_system_prompt`,
          description: `System prompt for agent ${agentId}`,
          arguments: [
            {
              name: 'tenantId',
              description: 'Tenant ID',
              required: true,
            },
          ],
        });
      }
      return prompts;
    },

    async getPrompt(params: McpParams): Promise<Record<string, any>> {
      const { name, arguments: _args } = params;
      if (name!.startsWith('agent_') && name!.endsWith('_system_prompt')) {
        const agentId = name!.replace('agent_', '').replace('_system_prompt', '');
        const { loadAgentSpecs } = require('../../mcp/loaders/spec-loader');
        const agentSpecs = loadAgentSpecs();
        const agentSpec = agentSpecs.get(agentId);
        if (!agentSpec) {
          throw new Error(`Agent ${agentId} not found`);
        }
        return {
          messages: [{
            role: 'system',
            content: {
              type: 'text',
              text: agentSpec.systemPrompt || `Agent ${agentId} system prompt`,
            },
          }],
        };
      }
      throw new Error(`Unknown prompt: ${name}`);
    },
  };

  return server;
}
