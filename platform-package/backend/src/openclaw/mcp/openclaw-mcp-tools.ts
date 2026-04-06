// @ts-nocheck
/**
 * OpenClaw MCP Server - Tool Definitions and Handlers
 */

import { getOpenClawConfig } from '../config/openclaw.config';
import { testConnection } from '../../modules/integrations/services/connector.service';
import { executeAgentTool } from '../../ai/copilot/services/copilot.service';
import { getTemporalClient } from '../../temporal/client';
import { toErrorMessage } from '../../errors/http-error.util';
import { safeQuery, tenantSchema } from '../../config/database/database';
import { search as globalSearch, SearchOptions } from '../../platform/dos/search/global-search.service';
import { runSimulation } from '../../modules/risk/services/scoring/monte-carlo.service';
import {
  
  getWorkflows,
  getWorkflowAnalytics,
  WorkflowExecutionContext,
} from '../../modules/workflow/services/core/workflow.service';
import {
  listFiles as listFilesForEntity,
} from '../../platform/dos/storage/file-storage.service';


/**
 * Build the list of available MCP tool definitions.
 */
export function buildToolDefinitions(config: ReturnType<typeof getOpenClawConfig>): Record<string, any>[] {
  const tools: Record<string, any>[] = [];

  // ── Connector Tools ──
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

  // ── Agent Tools (A2A enabled) ──
  if (config.langgraphEnabled) {
    tools.push({
      name: 'execute_agent',
      description: 'Execute a LangGraph agent (A2A: can be called by other agents)',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID (A01-A12)' },
          tenantId: { type: 'string', description: 'Tenant ID' },
          query: { type: 'string', description: 'Query or task for the agent' },
          dryRun: { type: 'boolean', description: 'Dry run mode (no actions executed)' },
          replayFromRunId: { type: 'string', description: 'Replay from a previous run ID' },
          callerAgentId: { type: 'string', description: 'A2A: ID of calling agent (optional)' },
        },
        required: ['agentId', 'tenantId', 'query'],
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

    // A2A: Agent-to-Agent messaging
    tools.push({
      name: 'send_agent_message',
      description: 'A2A: Send a message from one agent to another',
      inputSchema: {
        type: 'object',
        properties: {
          fromAgentId: { type: 'string', description: 'Source agent ID' },
          toAgentId: { type: 'string', description: 'Target agent ID' },
          message: { type: 'string', description: 'Message content' },
          payload: { type: 'object', description: 'Optional structured payload' },
          tenantId: { type: 'string', description: 'Tenant ID' },
        },
        required: ['fromAgentId', 'toAgentId', 'message', 'tenantId'],
      },
    });
  }

  // ── File Tools ──
  tools.push({
    name: 'list_files',
    description: 'List files in tenant storage',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        entityType: { type: 'string', description: 'Filter by entity type (optional)' },
        entityId: { type: 'string', description: 'Filter by entity ID (optional)' },
        limit: { type: 'number', description: 'Maximum number of files to return (default: 50)' },
      },
      required: ['tenantId'],
    },
  });

  tools.push({
    name: 'get_file_metadata',
    description: 'Get file metadata by file ID',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        fileId: { type: 'string', description: 'File ID' },
      },
      required: ['tenantId', 'fileId'],
    },
  });

  // ── Database Tools (Read-only, safe queries) ──
  tools.push({
    name: 'query_database',
    description: 'Execute a read-only SQL query on tenant database (safe, tenant-isolated)',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        table: { type: 'string', description: 'Table name (risks, controls, policies, etc.)' },
        where: { type: 'object', description: 'WHERE conditions as key-value pairs' },
        limit: { type: 'number', description: 'Maximum rows to return (default: 100, max: 1000)' },
        orderBy: { type: 'string', description: 'Column to order by (optional)' },
        orderDirection: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort direction (default: DESC)' },
      },
      required: ['tenantId', 'table'],
    },
  });

  // ── Search Tools ──
  tools.push({
    name: 'search_grc',
    description: 'Global search across all GRC entities (risks, controls, policies, evidence, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        query: { type: 'string', description: 'Search query string' },
        types: { type: 'array', items: { type: 'string' }, description: 'Filter by entity types (optional)' },
        page: { type: 'number', description: 'Page number (default: 1)' },
        pageSize: { type: 'number', description: 'Results per page (default: 25, max: 100)' },
      },
      required: ['tenantId', 'query'],
    },
  });

  // ── Calculator Tools ──
  tools.push({
    name: 'calculate_monte_carlo',
    description: 'Run Monte Carlo risk simulation',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        riskId: { type: 'string', description: 'Risk ID to simulate' },
        iterations: { type: 'number', description: 'Number of iterations (default: 1000, max: 10000)' },
      },
      required: ['tenantId', 'riskId'],
    },
  });

  // ── Workflow Tools ──
  tools.push({
    name: 'list_workflows',
    description: 'List available workflows for tenant',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        departmentId: { type: 'string', description: 'Filter by department ID (optional)' },
      },
      required: ['tenantId'],
    },
  });

  tools.push({
    name: 'execute_workflow',
    description: 'Execute a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        workflowId: { type: 'string', description: 'Workflow ID to execute' },
        triggerType: { type: 'string', description: 'Trigger type (manual, event, scheduled)' },
        triggerData: { type: 'object', description: 'Trigger data payload (optional)' },
        userId: { type: 'string', description: 'User ID executing the workflow (optional)' },
      },
      required: ['tenantId', 'workflowId', 'triggerType'],
    },
  });

  tools.push({
    name: 'get_workflow_status',
    description: 'Get workflow execution status and analytics',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        workflowId: { type: 'string', description: 'Workflow ID' },
      },
      required: ['tenantId', 'workflowId'],
    },
  });

  // ── Temporal Workflow Tools ──
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

  tools.push({
    name: 'collect_evidence',
    description: 'Collect evidence from an external connector (SIEM, IAM, CMDB, Vuln scanner, ITSM, ERP, M365)',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        connectorType: { type: 'string', enum: ['siem', 'iam', 'cmdb', 'vuln', 'itsm', 'erp', 'm365'], description: 'Connector adapter type' },
        connectorId: { type: 'string', description: 'Connector ID from integration_configs' },
      },
      required: ['tenantId', 'connectorType', 'connectorId'],
    },
  });

  tools.push({
    name: 'parse_document',
    description: 'Parse a document to extract text, metadata, and structure using Tika or Unstructured.io',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', description: 'Tenant ID' },
        fileId: { type: 'string', description: 'File ID from file_storage to parse' },
      },
      required: ['tenantId', 'fileId'],
    },
  });

  tools.push({
    name: 'check_parser_health',
    description: 'Check health of document parsing services (Tika, Unstructured.io)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  });

  return tools;
}

/**
 * Execute a tool by name with the given arguments.
 */
export async function executeToolCall(
  name: string,
  args: Record<string, any>,
  context: Record<string, any>,
  config: ReturnType<typeof getOpenClawConfig>,
): Promise<unknown> {
  const tenantId = (args.tenantId || context.tenantId) as string;
  const userId = (args.userId || context.userId) as string;

  switch (name) {
    // ── Connector Tools ──
    case 'test_connector':
      return await testConnection({
        sourceSystemType: args.sourceSystemType as any,
        credentials: args.credentials as any,
        platform: args.platform as any,
      });

    case 'sync_connector': {
      const { syncConnection } = require('../../modules/integrations/services/connector-sync.service');
      return await syncConnection(tenantId, args.connectorId);
    }

    // ── Agent Tools (A2A) ──
    case 'execute_agent': {
      if (!config.langgraphEnabled) {
        throw new Error('LangGraph is not enabled');
      }
      const { runAgent } = require('../../modules/ai/services/agent-runner.service');

      // Publish AG-UI progress event
      const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { publishProgressEvent } = require('../ag-ui/ag-ui-streaming');
      publishProgressEvent(args.agentId, runId, {
        step: 'starting',
        percentage: 0,
        message: `Starting agent ${args.agentId}...`,
      });

      try {
        const result = await runAgent(tenantId, args.agentId, {
          query: args.query,
          dryRun: args.dryRun || false,
          replayFromRunId: args.replayFromRunId,
          callerAgentId: args.callerAgentId, // A2A support
          runId, // Pass runId for AG-UI streaming
        });

        // Publish completion event
        const { publishCompleteEvent } = require('../ag-ui/ag-ui-streaming');
        publishCompleteEvent(args.agentId, runId, {
          success: true,
          summary: result.summary,
          artifacts: [],
        });
        return result;
      } catch (err: unknown) {
        // Publish error event
        const { publishErrorEvent } = require('../ag-ui/ag-ui-streaming');
        publishErrorEvent(args.agentId, runId, {
          message: toErrorMessage(err),
          code: 'AGENT_EXECUTION_ERROR',
        });
        throw err;
      }
    }

    case 'execute_agent_tool':
      return await executeAgentTool(
        tenantId,
        args.agentId,
        args.toolName,
        args.arguments || {},
      );

    case 'send_agent_message': {
      // A2A: Store message in agent message queue
      const { sendAgentMessage } = require('../a2a/agent-message-queue');
      return await sendAgentMessage(
        tenantId,
        args.fromAgentId,
        args.toAgentId,
        args.message,
        args.payload
      );
    }

    // ── File Tools ──
    case 'list_files':
      if (args.entityType && args.entityId) {
        return await listFilesForEntity(tenantId, args.entityType, args.entityId);
      } else {
        const listSchema = tenantSchema(tenantId);
        const listLimit = Math.min((args.limit as number) || 50, 200);
        const listResult = await safeQuery(
          `SELECT file_id, original_filename, file_size_bytes, content_type,
                  entity_type, entity_id, uploaded_by, created_at
           FROM "${listSchema}".file_storage
           WHERE deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT $1`,
          [listLimit]
        );
        return listResult.rows;
      }

    case 'get_file_metadata': {
      const metaSchema = tenantSchema(tenantId);
      const metaResult = await safeQuery(
        `SELECT file_id, original_filename, file_size_bytes, content_type,
                storage_provider, entity_type, entity_id, uploaded_by, created_at
         FROM "${metaSchema}".file_storage
         WHERE file_id = $1 AND deleted_at IS NULL`,
        [args.fileId]
      );
      if (!metaResult.rows.length) {
        throw new Error(`File not found: ${args.fileId}`);
      }
      return metaResult.rows[0];
    }

    // ── Database Tools (Read-only, safe) ──
    case 'query_database': {
      const schema = tenantSchema(tenantId);
      const table = args.table as string;
      const limit = Math.min((args.limit as number) || 100, 1000);

      const allowedTables = ['risks', 'controls', 'policies', 'evidence', 'incidents', 'vendors', 'assessments'];
      if (!allowedTables.includes(table)) {
        throw new Error(`Table ${table} is not allowed. Allowed tables: ${allowedTables.join(', ')}`);
      }

      let sql = `SELECT * FROM "${schema}"."${table}"`;
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      if (args.where && typeof args.where === 'object') {
        const conditions: string[] = [];
        for (const [key, value] of Object.entries(args.where as Record<string, any>)) {
          conditions.push(`"${key}" = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      if (args.orderBy) {
        const direction = args.orderDirection === 'ASC' ? 'ASC' : 'DESC';
        sql += ` ORDER BY "${args.orderBy}" ${direction}`;
      } else {
        sql += ` ORDER BY updated_at DESC`;
      }

      sql += ` LIMIT $${paramIndex}`;
      queryParams.push(limit);

      const dbResult = await safeQuery(sql, queryParams);
      return {
        table,
        rows: dbResult.rows,
        count: dbResult.rows.length,
        limit,
      };
    }

    // ── Search Tools ──
    case 'search_grc': {
      const searchOptions: SearchOptions = {
        types: args.types as string[] | undefined,
        page: (args.page as number) || 1,
        pageSize: Math.min((args.pageSize as number) || 25, 100),
        userRole: context.userRole as string | undefined,
      };
      return await globalSearch(tenantId, args.query as string, searchOptions);
    }

    // ── Calculator Tools ──
    case 'calculate_monte_carlo':
      return await runSimulation(
        tenantId,
        args.riskId as string,
        (args.iterations as number) || 1000
      );

    // ── Workflow Tools ──
    case 'list_workflows':
      return await getWorkflows(tenantId, {
        departmentId: args.departmentId as string | undefined,
      });

    case 'execute_workflow': {
      const executionContext: WorkflowExecutionContext = {
        userId,
        departmentId: args.departmentId as string | undefined,
        isTenantWideRole: args.isTenantWideRole as boolean | undefined,
      };
      return await executeWorkflow(tenantId, args.workflowId as string, {
        type: args.triggerType as string,
        data: (args.triggerData as Record<string, any>) || {},
      }, executionContext);
    }

    case 'get_workflow_status':
      return await getWorkflowAnalytics(tenantId, args.workflowId as string);

    // ── Temporal Workflow Tools ──
    case 'start_agent_cycle': {
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
      return {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
        status: 'started',
      };
    }

    case 'collect_evidence': {
      const adapterMap: Record<string, string> = {
        siem: '../../connectors/security-ops/siem.adapter', iam: '../../connectors/security-ops/iam.adapter',
        cmdb: '../../connectors/enterprise/cmdb.adapter', vuln: '../../connectors/security-ops/vuln.adapter',
        itsm: '../../connectors/enterprise/itsm.adapter', erp: '../../connectors/enterprise/erp.adapter',
        m365: '../../connectors/data-infra/m365.connector',
      };
      const adapterPath = adapterMap[args.connectorType as string];
      if (!adapterPath) throw new Error(`Unknown connector type: ${args.connectorType}`);
      const connSchema = tenantSchema(tenantId);
      const connRow = await safeQuery(
        `SELECT config FROM "${connSchema}".integration_configs WHERE integration_id = $1 AND enabled = true`,
        [args.connectorId]
      );
      if (!connRow.rows.length) throw new Error(`Connector config not found: ${args.connectorId}`);
      const connConfig = typeof connRow.rows[0].config === 'string' ? JSON.parse(connRow.rows[0].config) : connRow.rows[0].config;
      const adapterModule = require(adapterPath);
      const AdapterClass = Object.values(adapterModule).find((v: unknown) => typeof v === 'function' && v.prototype?.collect) as any;
      if (!AdapterClass) throw new Error(`No adapter class exported from ${args.connectorType}`);
      const adapter = new AdapterClass();
      return await adapter.collect(connConfig, { tenantId, from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), to: new Date().toISOString() });
    }

    case 'parse_document': {
      const fileSchema = tenantSchema(tenantId);
      const fileRow = await safeQuery(
        `SELECT storage_key, original_filename FROM "${fileSchema}".file_storage WHERE file_id = $1 AND deleted_at IS NULL`,
        [args.fileId]
      );
      if (!fileRow.rows.length) throw new Error(`File not found: ${args.fileId}`);
      const { getFile } = require('../../platform/dos/storage/file-storage.service');
      const fileData = await getFile(tenantId, args.fileId as string);
      try {
        const { parseWithTika } = require('../../connectors/cloud-storage/tika.connector');
        return await parseWithTika(fileData.buffer, fileRow.rows[0].original_filename);
      } catch {
        const { parseWithUnstructured } = require('../../connectors/cloud-storage/unstructured.connector');
        const elements = await parseWithUnstructured(fileData.buffer, fileRow.rows[0].original_filename);
        return { text: elements.map((e: unknown) => e.text).join('\n'), elements, parser: 'unstructured' };
      }
    }

    case 'check_parser_health': {
      const results: Record<string, boolean> = {};
      try { const { checkTikaHealth } = require('../../connectors/cloud-storage/tika.connector'); results.tika = await checkTikaHealth(); } catch { results.tika = false; }
      try { const { checkUnstructuredHealth } = require('../../connectors/cloud-storage/unstructured.connector'); results.unstructured = await checkUnstructuredHealth(); } catch { results.unstructured = false; }
      return results;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
