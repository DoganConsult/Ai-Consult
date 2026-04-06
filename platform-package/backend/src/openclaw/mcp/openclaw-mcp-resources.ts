/**
 * OpenClaw MCP Server - Resource Definitions and Handlers
 */

import { getOpenClawConfig } from '../config/openclaw.config';
import { getConnectors, getConnectorDetail } from '../../modules/integrations/services/connector.service';
import { getTemporalClient } from '../../temporal/client';
import { toErrorMessage } from '../../errors/http-error.util';
import { logger } from '../../platform/dos/observability/services/logger.service';
import { safeQuery, tenantSchema } from '../../config/database/database';
import {
  getWorkflows,
  getWorkflowById,
} from '../../modules/workflow/services/core/workflow.service';
import type { GenericRow } from '../../types/db-rows.types';

import type { McpParams, McpResource } from './enhanced-openclaw-mcp-server';

/** MCP resource content (readResource returns). May omit name/description for content-only responses. */
type McpResourceContent = { uri: string; mimeType: string; text?: string; name?: string; description?: string };

/**
 * List all available MCP resources (connectors, agents, workflows, files, databases, calculators).
 */
export async function listResources(
  params: McpParams,
  config: ReturnType<typeof getOpenClawConfig>,
  _listToolsFn: (params: McpParams) => Promise<Record<string, any>[]>,
): Promise<McpResourceContent[]> {
  const resources: McpResourceContent[] = [];
  const context = params._context || {};
  const tenantId = (params.tenantId || context.tenantId) as string | undefined;

  // Connectors
  if (config.exposeConnectors) {
    try {
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

  // Agents (A2A support)
  const agents = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];
  for (const agentId of agents) {
    resources.push({
      uri: `agent://${agentId}`,
      name: `Agent ${agentId}`,
      description: `GRC agent ${agentId} for compliance automation (A2A enabled)`,
      mimeType: 'application/json',
    });
  }

  // Workflows
  if (tenantId) {
    try {
      const workflows = await getWorkflows(tenantId);
      for (const wf of workflows) {
        resources.push({
          uri: `workflow://${wf.workflow_id}`,
          name: `Workflow: ${wf.name}`,
          description: `Workflow definition: ${wf.name}`,
          mimeType: 'application/json',
        });
      }
    } catch (err: unknown) {
      logger.warn('[OpenClaw] Failed to list workflows', { error: toErrorMessage(err) });
    }
  }

  // Files
  if (tenantId) {
    try {
      const schema = tenantSchema(tenantId);
      const fileResult = await safeQuery(
        `SELECT file_id, original_filename, file_size_bytes, content_type
         FROM "${schema}".file_storage
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 50`,
        []
      );
      for (const file of fileResult.rows) {
        resources.push({
          uri: `file://${file.file_id}`,
          name: `File: ${file.original_filename}`,
          description: `File storage: ${file.original_filename} (${((file.file_size_bytes || 0) / 1024).toFixed(1)}KB)`,
          mimeType: file.content_type || 'application/octet-stream',
        });
      }
    } catch (err: unknown) {
      logger.warn('[OpenClaw] Failed to list files', { error: toErrorMessage(err) });
    }
  }

  // Database tables (read-only, tenant-scoped)
  if (tenantId) {
    const schema = tenantSchema(tenantId);
    const tables = ['risks', 'controls', 'policies', 'evidence', 'incidents', 'vendors', 'assessments'];
    for (const table of tables) {
      resources.push({
        uri: `db://${schema}.${table}`,
        name: `Database: ${table}`,
        description: `Read-only access to ${table} table in tenant schema`,
        mimeType: 'application/json',
      });
    }
  }

  // Calculators
  resources.push({
    uri: 'calculator://monte-carlo',
    name: 'Monte Carlo Risk Calculator',
    description: 'Risk simulation calculator with configurable iterations',
    mimeType: 'application/json',
  });

  // Search
  resources.push({
    uri: 'search://global',
    name: 'Global Search',
    description: 'Unified search across all GRC entities',
    mimeType: 'application/json',
  });

  // Temporal workflows
  if (config.temporalEnabled) {
    resources.push({
      uri: 'workflow://temporal/agent-inference-cycle',
      name: 'Agent Inference Cycle Workflow',
      description: 'Temporal workflow for multi-agent execution cycles',
      mimeType: 'application/json',
    });
  }

  return resources;
}

/**
 * Read a specific resource by URI.
 */
export async function readResource(
  params: McpParams,
  config: ReturnType<typeof getOpenClawConfig>,
  listToolsFn: (params: McpParams) => Promise<Record<string, any>[]>,
): Promise<McpResource[]> {
  const { uri } = params;
  const context = params._context || {};
  const tenantId = (params.tenantId || context.tenantId) as string | undefined;

  if (uri!.startsWith('connector://')) {
    const connectorId = uri!.replace('connector://', '');
    if (!tenantId) {
      throw new Error('tenantId is required to read connector resource');
    }
    const connector = await getConnectorDetail(tenantId, connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }
    return [{
      uri: uri!,
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

  if (uri!.startsWith('agent://')) {
    const agentId = uri!.replace('agent://', '');

    const registryRes = await safeQuery(
      `SELECT agent_id, name_en, domain_en, icon, color, enabled, delegation_scope, quick_prompts
       FROM public.agent_registry WHERE agent_id = $1`,
      [agentId]
    );
    const agentMeta = registryRes.rows.length ? registryRes.rows[0] : null;
    if (!agentMeta) {
      throw new Error(`Agent not found in registry: ${agentId}`);
    }

    let latestRun: GenericRow | null = null;
    if (tenantId) {
      const schema = tenantSchema(tenantId);
      const runRes = await safeQuery(
        `SELECT run_id, status, autonomy_level, platform_mode, actions_proposed, actions_executed,
                duration_ms, created_at, updated_at
         FROM "${schema}".agent_runs
         WHERE agent_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [agentId, tenantId]
      );
      latestRun = runRes.rows.length ? runRes.rows[0] : null;
    }

    return [{
      uri: uri!,
      mimeType: 'application/json',
      text: JSON.stringify({
        agentId: agentMeta.agent_id,
        name: agentMeta.name_en,
        domain: agentMeta.domain_en,
        icon: agentMeta.icon,
        enabled: agentMeta.enabled,
        delegationScope: agentMeta.delegation_scope,
        status: latestRun?.status || (agentMeta.enabled ? 'idle' : 'disabled'),
        langgraphEnabled: config.langgraphEnabled,
        a2aEnabled: true,
        latestRun: latestRun ? {
          runId: latestRun.run_id,
          status: latestRun.status,
          autonomyLevel: latestRun.autonomy_level,
          platformMode: latestRun.platform_mode,
          actionsProposed: latestRun.actions_proposed,
          actionsExecuted: latestRun.actions_executed,
          durationMs: latestRun.duration_ms,
          createdAt: latestRun.created_at,
        } : null,
        tools: await listToolsFn({ agentId, ...params }),
      }, null, 2),
    }];
  }

  if (uri!.startsWith('workflow://')) {
    const workflowId = uri!.replace('workflow://', '');
    if (!tenantId) {
      throw new Error('tenantId is required to read workflow resource');
    }
    if (workflowId.startsWith('temporal/')) {
      let temporalStatus: Record<string, any> = { workflowId, temporalEnabled: config.temporalEnabled };
      if (config.temporalEnabled) {
        try {
          const client = await getTemporalClient();
          const temporalWorkflowType = workflowId.replace('temporal/', '');
          const latestId = `${temporalWorkflowType}-${tenantId}`;
          const handle = client.workflow.getHandle(latestId);
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
          temporalStatus = {
            workflowId,
            temporalEnabled: true,
            status: 'NOT_FOUND',
            description: 'No active execution found for this workflow',
          };
        }
      }
      return [{
        uri: uri!,
        mimeType: 'application/json',
        text: JSON.stringify(temporalStatus, null, 2),
      }];
    }
    const workflow = await getWorkflowById(tenantId, workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    return [{
      uri: uri!,
      mimeType: 'application/json',
      text: JSON.stringify({
        workflowId: workflow.workflow_id,
        name: workflow.name,
        definition: workflow.definition,
        version: workflow.version,
        status: 'active',
      }, null, 2),
    }];
  }

  if (uri!.startsWith('file://')) {
    const fileId = uri!.replace('file://', '');
    if (!tenantId) {
      throw new Error('tenantId is required to read file resource');
    }
    const schema = tenantSchema(tenantId);
    const fileResult = await safeQuery(
      `SELECT file_id, original_filename, file_size_bytes, content_type,
              storage_provider, uploaded_by, created_at
       FROM "${schema}".file_storage
       WHERE file_id = $1 AND deleted_at IS NULL`,
      [fileId]
    );
    if (!fileResult.rows.length) {
      throw new Error(`File not found: ${fileId}`);
    }
    const file = fileResult.rows[0];
    return [{
      uri: uri!,
      mimeType: file.content_type || 'application/octet-stream',
      text: JSON.stringify({
        fileId: file.file_id,
        originalFilename: file.original_filename,
        fileSizeBytes: file.file_size_bytes,
        contentType: file.content_type,
        storageProvider: file.storage_provider,
        uploadedBy: file.uploaded_by,
        createdAt: file.created_at,
        downloadUrl: `/api/files/${fileId}/download`,
      }, null, 2),
    }];
  }

  if (uri!.startsWith('db://')) {
    const dbPath = uri!.replace('db://', '');
    const [schema, table] = dbPath.split('.');
    if (!tenantId || schema !== tenantSchema(tenantId)) {
      throw new Error('Invalid database resource or tenant mismatch');
    }
    const result = await safeQuery(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    );
    return [{
      uri: uri!,
      mimeType: 'application/json',
      text: JSON.stringify({
        schema,
        table,
        columns: result.rows,
        readOnly: true,
        note: 'Use query_database tool to query data',
      }, null, 2),
    }];
  }

  if (uri === 'calculator://monte-carlo') {
    return [{
      uri: uri!,
      mimeType: 'application/json',
      text: JSON.stringify({
        calculator: 'monte-carlo',
        description: 'Monte Carlo risk simulation calculator',
        parameters: {
          riskId: 'string (required)',
          iterations: 'number (default: 1000, max: 10000)',
        },
        output: {
          distribution: 'number[]',
          mean: 'number',
          stdDev: 'number',
          percentiles: '{ p5, p25, p50, p75, p95 }',
        },
      }, null, 2),
    }];
  }

  if (uri === 'search://global') {
    return [{
      uri: uri!,
      mimeType: 'application/json',
      text: JSON.stringify({
        search: 'global',
        description: 'Unified search across all GRC entities',
        supportedTypes: ['risk', 'control', 'policy', 'evidence', 'incident', 'vendor'],
        parameters: {
          query: 'string (required)',
          types: 'string[] (optional)',
          page: 'number (optional, default: 1)',
          pageSize: 'number (optional, default: 25)',
        },
      }, null, 2),
    }];
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}
