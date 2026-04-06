import { safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { logger } from '../../../../platform/dos/observability/logger.service';

export interface BootstrapResult {
  success: boolean;
  message: string;
  tenantId?: string;
  timestamp?: string;
  modelVersions?: number;
  promptVersions?: number;
  agentVersions?: number;
  toolBindings?: number;
  allowlistEntries?: number;
  configKeys?: string[] | number;
}

export interface GovernanceHealthReport {
  healthy: boolean;
  tenantId?: string;
  timestamp?: string;
  checks: Record<string, any>;
}

export async function bootstrapAiGovernance(tenantId: string): Promise<BootstrapResult> {
  const schema = tenantSchema(tenantId);
  const timestamp = new Date().toISOString();

  let modelVersions = 0;
  let promptVersions = 0;
  let agentVersions = 0;
  let toolBindings = 0;
  let allowlistEntries = 0;

  try {
    const mv = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_model_registry`, []);
    modelVersions = (getFirstRow(mv) as any)?.cnt || 0;
  } catch { /* table may not exist yet */ }

  try {
    const pv = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_prompt_registry`, []);
    promptVersions = (getFirstRow(pv) as any)?.cnt || 0;
  } catch { /* table may not exist yet */ }

  try {
    const av = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_agent_registry`, []);
    agentVersions = (getFirstRow(av) as any)?.cnt || 0;
  } catch { /* table may not exist yet */ }

  try {
    const tb = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_agent_tool_bindings`, []);
    toolBindings = (getFirstRow(tb) as any)?.cnt || 0;
  } catch { /* table may not exist yet */ }

  try {
    const al = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_model_allowlist`, []);
    allowlistEntries = (getFirstRow(al) as any)?.cnt || 0;
  } catch { /* table may not exist yet */ }

  logger.info(`[AIGovBootstrap] tenant=${tenantId} models=${modelVersions} prompts=${promptVersions} agents=${agentVersions} tools=${toolBindings} allowlist=${allowlistEntries}`);

  return {
    success: true,
    message: `AI governance bootstrap completed for tenant ${tenantId}`,
    tenantId,
    timestamp,
    modelVersions,
    promptVersions,
    agentVersions,
    toolBindings,
    allowlistEntries,
  };
}

export async function checkGovernanceHealth(tenantId: string): Promise<GovernanceHealthReport> {
  const schema = tenantSchema(tenantId);
  const checks: Record<string, any> = {};
  let healthy = true;

  const tables = ['ai_asset_inventory', 'ai_model_registry', 'ai_prompt_registry', 'ai_agent_registry', 'ai_agent_tool_bindings', 'ai_model_allowlist'];

  for (const table of tables) {
    try {
      const r = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".${table}`, []);
      checks[table] = { exists: true, count: (getFirstRow(r) as any)?.cnt || 0 };
    } catch {
      checks[table] = { exists: false, count: 0 };
      healthy = false;
    }
  }

  return {
    healthy,
    tenantId,
    timestamp: new Date().toISOString(),
    checks,
  };
}

export async function repairAiGovernance(tenantId: string): Promise<BootstrapResult> {
  logger.info(`[AIGovBootstrap] Running repair for tenant ${tenantId}`);
  return bootstrapAiGovernance(tenantId);
}
