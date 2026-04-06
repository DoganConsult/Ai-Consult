// @ts-nocheck
// ============================================
// OpenClaw MCP Server Implementation
// Exposes connectors, agents, and tools via MCP protocol
// Integrated with LangGraph, Temporal, LangSmith
// ============================================

import { getOpenClawConfig } from '../config/openclaw.config';
import { getConnectors, getConnectorDetail, testConnection } from '../../modules/integrations/services/connector.service';
import { executeAgentTool } from '../../ai/copilot/services/copilot.service';
import { getTemporalClient } from '../../temporal/client';
import { createLangfuseTrace } from '../../langgraph/observability/langfuse-client.service';
import { getOpenTelemetryContext } from '../../langgraph/observability/tracing-correlation.service';
import { toErrorMessage } from '../../errors/http-error.util';
import { logger } from '../../platform/dos/observability/services/logger.service';
import { safeQuery, tenantSchema } from '../../config/database/database';
import type { GenericRow } from '../../types/db-rows.types';

/** Common MCP request params with optional context */
interface McpParams extends Record<string, any> {
  _context?: Record<string, any>;
  tenantId?: string;
  uri?: string;
  name?: string;
  arguments?: Record<string, any>;
  agentId?: string;
}

/** MCP resource entry */
interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType: string;
  text?: string;
}

/** MCP tool result */
interface McpToolResult {
  content: Array<{ type: string; json?: unknown; text?: string }>;
  isError: boolean;
}

export interface OpenClawMcpServer {
  listResources(params: McpParams): Promise<McpResource[]>;
  readResource(params: McpParams): Promise<McpResource[]>;
  listTools(params: McpParams): Promise<Record<string, any>[]>;
  callTool(params: McpParams): Promise<McpToolResult>;
  listPrompts(params: McpParams): Promise<Record<string, any>[]>;
  getPrompt(params: McpParams): Promise<Record<string, any>>;
}

/**
 * Create OpenClaw MCP server instance
 */
export function createOpenClawMcpServer(): OpenClawMcpServer {
  const config = getOpenClawConfig();

  return {
    /**
     * List available resources (connectors, agents, workflows)
     */
    async listResources(params: McpParams): Promise<McpResource[]> {
      const resources: McpResource[] = [];
      const context = params._context || {};

      // List connectors if enabled
      if (config.exposeConnectors) {
        try {
          const tenantId = params.tenantId || context.tenantId;
          if (tenantId) {
            const connectors = await getConnectors(tenantId);
            for (const connector of connectors) {
              resources.push({
                uri: `connector://${connector.connectorId}`,
                name: `Connector: ${connector.sourceSystemType}`,
                description: `Evidence connector for ${connector.sourceSystemType}`,
                mimeType: 'application/json',
              });
            }
          }
        } catch (err: unknown) {
          logger.warn('[OpenClaw] Failed to list connectors', { error: toErrorMessage(err) });
        }
      }

      // List agents
      const agents = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];
      for (const agentId of agents) {
        resources.push({
          uri: `agent://${agentId}`,
          name: `Agent ${agentId}`,
          description: `GRC agent ${agentId} for compliance automation`,
          mimeType: 'application/json',
        });
      }

      // List Temporal workflows
      if (config.temporalEnabled) {
        resources.push({
          uri: 'workflow://agent-inference-cycle',
          name: 'Agent Inference Cycle Workflow',
          description: 'Temporal workflow for multi-agent execution cycles',
          mimeType: 'application/json',
        });
      }

      return resources;
    },

    /**
     * Read resource contents
     */
    async readResource(params: McpParams): Promise<McpResource[]> {
      const { uri } = params;
      const context = params._context || {};

      if (uri.startsWith('connector://')) {
        const connectorId = uri.replace('connector://', '');
        const tenantId = params.tenantId || context.tenantId;
        if (!tenantId) {
          throw new Error('tenantId is required to read connector resource');
        }

        const connector = await getConnectorDetail(tenantId, connectorId);
        if (!connector) {
          throw new Error(`Connector not found: ${connectorId}`);
        }

        return [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            connectorId: connector.connectorId,
            sourceSystemType: connector.sourceSystemType,
            status: connector.status,
            lastSuccessAt: connector.lastSuccessAt,
            failureCount: connector.failureCount,
          }, null, 2),
        }];
      }

      if (uri.startsWith('agent://')) {
        const agentId = uri.replace('agent://', '');
        const tenantId = params.tenantId || context.tenantId;

        // Query agent metadata from public.agent_registry
        const registryRes = await safeQuery(
          `SELECT agent_id, name_en, domain_en, icon, color, enabled, delegation_scope
           FROM public.agent_registry WHERE agent_id = $1`,
          [agentId]
        );
        const agentMeta = registryRes.rows.length ? registryRes.rows[0] : null;
        if (!agentMeta) {
          throw new Error(`Agent not found in registry: ${agentId}`);
        }

        // Query latest run status from tenant schema if tenantId is available
        let latestRun: GenericRow | null = null;
        if (tenantId) {
          const schema = tenantSchema(tenantId);
          const runRes = await safeQuery(
            `SELECT run_id, status, autonomy_level, platform_mode, actions_proposed, actions_executed,
                    duration_ms, created_at
             FROM "${schema}".agent_runs
             WHERE agent_id = $1 AND tenant_id = $2
             ORDER BY created_at DESC LIMIT 1`,
            [agentId, tenantId]
          );
          latestRun = runRes.rows.length ? runRes.rows[0] : null;
        }

        return [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            agentId: agentMeta.agent_id,
            name: agentMeta.name_en,
            domain: agentMeta.domain_en,
            enabled: agentMeta.enabled,
            status: latestRun?.status || (agentMeta.enabled ? 'idle' : 'disabled'),
            langgraphEnabled: config.langgraphEnabled,
            latestRun: latestRun ? {
              runId: latestRun.run_id,
              status: latestRun.status,
              autonomyLevel: latestRun.autonomy_level,
              actionsProposed: latestRun.actions_proposed,
              actionsExecuted: latestRun.actions_executed,
              durationMs: latestRun.duration_ms,
              createdAt: latestRun.created_at,
            } : null,
            tools: await this.listTools({ agentId, ...params }),
          }, null, 2),
        }];
      }

      if (uri.startsWith('workflow://')) {
        const workflowId = uri.replace('workflow://', '');
        const tenantId = params.tenantId || context.tenantId;

        // Query actual Temporal workflow status if available
        let temporalStatus: Record<string, any> = { workflowId, temporalEnabled: config.temporalEnabled };
        if (config.temporalEnabled) {
          try {
            const client = await getTemporalClient();
            const handle = client.workflow.getHandle(workflowId);
            const description = await handle.describe();
            temporalStatus = {
              workflowId,
              temporalEnabled: true,
              temporalWorkflowId: description.workflowId,
              runId: description.runId,
              status: description.status?.name || 'UNKNOWN',
              taskQueue: description.taskQueue,
              startTime: description.startTime,
              closeTime: description.closeTime,
            };
          } catch {
            // If Temporal lookup fails, check if this is a tenant workflow definition
            if (tenantId) {
              try {
                const schema = tenantSchema(tenantId);
                const wfRes = await safeQuery(
                  `SELECT workflow_id, name, definition, version, created_at, updated_at
                   FROM "${schema}".workflows WHERE workflow_id = $1`,
                  [workflowId]
                );
                if (wfRes.rows.length) {
                  const wf = wfRes.rows[0];
                  temporalStatus = {
                    workflowId: wf.workflow_id,
                    name: wf.name,
                    definition: wf.definition,
                    version: wf.version,
                    source: 'database',
                    createdAt: wf.created_at,
                    updatedAt: wf.updated_at,
                  };
                } else {
                  temporalStatus = {
                    workflowId,
                    temporalEnabled: config.temporalEnabled,
                    status: 'NOT_FOUND',
                    description: 'No workflow found with this ID',
                  };
                }
              } catch {
                temporalStatus = {
                  workflowId,
                  temporalEnabled: config.temporalEnabled,
                  status: 'NOT_FOUND',
                  description: 'No active execution found for this workflow',
                };
              }
            } else {
              temporalStatus = {
                workflowId,
                temporalEnabled: config.temporalEnabled,
                status: 'NOT_FOUND',
                description: 'No active execution found for this workflow',
              };
            }
          }
        }

        return [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(temporalStatus, null, 2),
        }];
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    },

    /**
     * List available tools (connectors + agent tools)
     */
    async listTools(params: McpParams): Promise<Record<string, any>[]> {
      const tools: Record<string, any>[] = [];
      const _context = params._context || {};

      // Connector tools
      if (config.exposeConnectors) {
        tools.push({
          name: 'test_connector',
          description: 'Test a connector configuration',
          inputSchema: {
            type: 'object',
            properties: {
              connectorId: { type: 'string', description: 'Connector ID to test' },
              tenantId: { type: 'string', description: 'Tenant ID' },
            },
            required: ['connectorId', 'tenantId'],
          },
        });

        tools.push({
          name: 'sync_connector',
          description: 'Trigger a connector sync operation',
          inputSchema: {
            type: 'object',
            properties: {
              connectorId: { type: 'string', description: 'Connector ID to sync' },
              tenantId: { type: 'string', description: 'Tenant ID' },
            },
            required: ['connectorId', 'tenantId'],
          },
        });
      }

      // Agent execution tools
      if (config.langgraphEnabled) {
        tools.push({
          name: 'execute_agent',
          description: 'Execute a LangGraph agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'Agent ID (A01-A12)' },
              tenantId: { type: 'string', description: 'Tenant ID' },
              dryRun: { type: 'boolean', description: 'Dry run mode (no actions executed)' },
              replayFromRunId: { type: 'string', description: 'Replay from a previous run ID' },
            },
            required: ['agentId', 'tenantId'],
          },
        });

        tools.push({
          name: 'execute_agent_tool',
          description: 'Execute a specific tool for an agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'Agent ID' },
              toolName: { type: 'string', description: 'Tool name to execute' },
              arguments: { type: 'object', description: 'Tool arguments' },
              tenantId: { type: 'string', description: 'Tenant ID' },
            },
            required: ['agentId', 'toolName', 'tenantId'],
          },
        });
      }

      // Temporal workflow tools
      if (config.temporalEnabled) {
        tools.push({
          name: 'start_agent_cycle',
          description: 'Start a Temporal agent inference cycle workflow',
          inputSchema: {
            type: 'object',
            properties: {
              tenantId: { type: 'string', description: 'Tenant ID' },
              agentIds: { type: 'array', items: { type: 'string' }, description: 'Optional: specific agent IDs' },
              platformMode: { type: 'string', description: 'Optional: platform mode override' },
            },
            required: ['tenantId'],
          },
        });
      }

      return tools;
    },

    /**
     * Call a tool
     */
    async callTool(params: McpParams): Promise<McpToolResult> {
      const { name, arguments: args } = params;
      const context = params._context || {};
      const tenantId = args.tenantId || context.tenantId;

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
        let result: unknown;

        switch (name) {
          case 'test_connector':
            result = await testConnection({
              sourceSystemType: args.sourceSystemType,
              credentials: args.credentials,
              platform: args.platform,
            });
            break;

          case 'sync_connector':
            // Import connector sync service
            const { syncConnection } = require('../../modules/integrations/services/connector-sync.service');
            result = await syncConnection(tenantId, args.connectorId);
            break;

          case 'execute_agent':
            if (!config.langgraphEnabled) {
              throw new Error('LangGraph is not enabled');
            }
            // Import LangGraph agent runner
            const { runAgent } = require('../../modules/ai/services/agent-runner.service');
            result = await runAgent(tenantId, args.agentId, {
              dryRun: args.dryRun || false,
              replayFromRunId: args.replayFromRunId,
            });
            break;

          case 'execute_agent_tool':
            result = await executeAgentTool(
              tenantId,
              args.agentId,
              args.toolName,
              args.arguments || {},
            );
            break;

          case 'start_agent_cycle':
            if (!config.temporalEnabled) {
              throw new Error('Temporal is not enabled');
            }
            const client = await getTemporalClient();
            const workflowId = `agent-cycle-${tenantId}-${Date.now()}`;
            const handle = await client.workflow.start('agentInferenceCycleWorkflow', {
              args: [{
                tenantId,
                agentIds: args.agentIds,
                platformMode: args.platformMode,
              }],
              taskQueue: 'agrc-agent',
              workflowId,
            });
            result = {
              workflowId: handle.workflowId,
              runId: handle.firstExecutionRunId,
              status: 'started',
            };
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

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

    /**
     * List available prompts
     */
    async listPrompts(_params: McpParams): Promise<Record<string, any>[]> {
      // Return agent system prompts as MCP prompts
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

    /**
     * Get prompt content
     */
    async getPrompt(params: McpParams): Promise<Record<string, any>> {
      const { name, arguments: _args } = params;

      if (name.startsWith('agent_') && name.endsWith('_system_prompt')) {
        const agentId = name.replace('agent_', '').replace('_system_prompt', '');
        // Load agent spec
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
}
