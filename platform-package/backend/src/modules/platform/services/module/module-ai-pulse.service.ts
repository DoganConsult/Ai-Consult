import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

const LOG_TAG = '[AiPulse]';

export interface ModuleAiPulse {
  moduleCode: string;
  healthStatus: string;
  maturityLevel: string;
  certificationState: string;
  agentsActive: number;
  agentActions24h: number;
  discoveries24h: number;
  proposalsPending: number;
  lastAgentRunAt: string | null;
  recentActions: Array<{
    agentId: string;
    actionType: string;
    summary: string;
    createdAt: string;
  }>;
}

export async function getModuleAiPulse(tenantId: string, moduleCode: string): Promise<ModuleAiPulse> {
  const schema = tenantSchema(tenantId);
  const pulse: ModuleAiPulse = {
    moduleCode,
    healthStatus: 'unknown',
    maturityLevel: 'starter',
    certificationState: 'HIDDEN',
    agentsActive: 0,
    agentActions24h: 0,
    discoveries24h: 0,
    proposalsPending: 0,
    lastAgentRunAt: null,
    recentActions: [],
  };

  try {
    const { rows: healthRows } = await safeQuery(
      `SELECT health_status FROM "${schema}".module_runtime_health WHERE module_code = $1`, [moduleCode]
    );
    if (healthRows.length > 0) pulse.healthStatus = healthRows[0].health_status;
  } catch {}

  try {
    const { rows: matRows } = await safeQuery(
      `SELECT maturity_level FROM "${schema}".module_maturity_stages WHERE module_code = $1`, [moduleCode]
    );
    if (matRows.length > 0) pulse.maturityLevel = matRows[0].maturity_level;
  } catch {}

  try {
    const { rows: certRows } = await safeQuery(
      `SELECT certification_state FROM "${schema}".module_certifications WHERE module_code = $1`, [moduleCode]
    );
    if (certRows.length > 0) pulse.certificationState = certRows[0].certification_state;
  } catch {}

  try {
    const { rows: agentRows } = await safeQuery(
      `SELECT COUNT(DISTINCT agent_id)::int AS cnt,
              MAX(started_at) AS last_run
       FROM "${schema}".agent_runs
       WHERE module_code = $1 AND started_at > NOW() - INTERVAL '24 hours'`,
      [moduleCode]
    );
    if (agentRows.length > 0) {
      pulse.agentsActive = agentRows[0].cnt ?? 0;
      pulse.lastAgentRunAt = agentRows[0].last_run ?? null;
    }
  } catch {}

  try {
    const { rows: actionRows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_actions_log
       WHERE module_code = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [moduleCode]
    );
    pulse.agentActions24h = actionRows[0]?.cnt ?? 0;
  } catch {}

  try {
    const { rows: discRows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".agent_discoveries
       WHERE module_code = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [moduleCode]
    );
    pulse.discoveries24h = discRows[0]?.cnt ?? 0;
  } catch {}

  try {
    const { rows: propRows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".agent_proposals
       WHERE module_code = $1 AND status = 'pending'`,
      [moduleCode]
    );
    pulse.proposalsPending = propRows[0]?.cnt ?? 0;
  } catch {}

  try {
    const { rows: recentRows } = await safeQuery(
      `SELECT agent_id, action_type, summary, created_at
       FROM "${schema}".ai_actions_log
       WHERE module_code = $1
       ORDER BY created_at DESC LIMIT 5`,
      [moduleCode]
    );
    pulse.recentActions = recentRows.map((r: any) => ({
      agentId: r.agent_id,
      actionType: r.action_type,
      summary: r.summary || r.action_type,
      createdAt: r.created_at,
    }));
  } catch {}

  return pulse;
}

export async function getAllModuleAiPulses(tenantId: string): Promise<ModuleAiPulse[]> {
  const schema = tenantSchema(tenantId);
  const pulses: ModuleAiPulse[] = [];
  try {
    const { rows: modules } = await safeQuery(
      `SELECT module_code FROM "${schema}".module_runtime_health ORDER BY module_code`
    );
    for (const mod of modules) {
      try {
        const pulse = await getModuleAiPulse(tenantId, mod.module_code);
        pulses.push(pulse);
      } catch (err) {
        logger.debug(`${LOG_TAG} Pulse fetch failed for ${mod.module_code}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    logger.warn(`${LOG_TAG} Failed to fetch all pulses: ${(err as Error).message}`);
  }
  return pulses;
}
