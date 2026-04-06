/**
 * Agent Actor Profile Service — CRUD Operations
 *
 * Manages agent profile records in the tenant agent_registry table.
 * Trust-score computation delegates to the autonomy layer.
 */
import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/services/logger.service';
import { computeAgentTrustScore as computeTrust } from './autonomy/agent-actor-profile.service';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AgentProfileInput {
  name?: string;
  displayName?: string;
  executionMode?: string;
  allowedTools?: string[];
  capabilities?: string[];
  agentVersion?: string;
  capabilityDomains?: string[];
  toolAccess?: string[];
  allowedActions?: string[];
  forbiddenActions?: string[];
  maxAutonomyLevel?: string;
  humanRolesReplaceable?: string[];
}

export interface AgentProfileRow {
  id: string;
  agent_code: string;
  name: string;
  execution_mode: string;
  allowed_tools: string[];
  capabilities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create or update an agent profile in the tenant's agent_registry.
 */
export async function upsertAgentProfile(
  tenantId: string,
  agentCode: string,
  profile: AgentProfileInput,
): Promise<{ agentCode: string }> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_registry
         (id, agent_code, name, execution_mode, allowed_tools, capabilities, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)
       ON CONFLICT (agent_code) DO UPDATE SET
         name           = EXCLUDED.name,
         execution_mode = EXCLUDED.execution_mode,
         allowed_tools  = EXCLUDED.allowed_tools,
         capabilities   = EXCLUDED.capabilities,
         updated_at     = EXCLUDED.updated_at`,
      [
        uuid(),
        agentCode,
        profile.name || profile.displayName || agentCode,
        profile.executionMode || 'supervised',
        JSON.stringify(profile.allowedTools || profile.toolAccess || []),
        JSON.stringify(profile.capabilities || profile.capabilityDomains || []),
        now,
      ],
    );

    logger.info('[AgentProfile] Upserted agent profile', { tenantId, agentCode });
    return { agentCode };
  } catch (err) {
    logger.error('[AgentProfile] Failed to upsert agent profile', {
      tenantId,
      agentCode,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Retrieve a single agent profile by code.
 */
export async function getAgentProfile(
  tenantId: string,
  agentCode: string,
): Promise<AgentProfileRow | null> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".agent_registry WHERE agent_code = $1 LIMIT 1`,
      [agentCode],
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return normalizeRow(row);
  } catch (err) {
    logger.warn('[AgentProfile] Failed to get agent profile', {
      tenantId,
      agentCode,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * List agent profiles with optional filters.
 */
export async function listAgentProfiles(
  tenantId: string,
  opts?: { executionMode?: string; active?: boolean },
): Promise<AgentProfileRow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 0;

  if (opts?.executionMode) {
    paramIdx++;
    conditions.push(`execution_mode = $${paramIdx}`);
    params.push(opts.executionMode);
  }

  if (opts?.active !== undefined) {
    paramIdx++;
    conditions.push(`is_active = $${paramIdx}`);
    params.push(opts.active);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".agent_registry ${where} ORDER BY name ASC`,
      params,
    );
    return rows.map(normalizeRow);
  } catch (err) {
    logger.warn('[AgentProfile] Failed to list agent profiles', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Compute the trust score for an agent. Delegates to the autonomy layer.
 */
export async function computeAgentTrustScore(
  tenantId: string,
  agentCode: string,
): Promise<{ score: number; factors: Record<string, number> }> {
  const result = await computeTrust(tenantId, agentCode);
  return { score: result.score, factors: result.factors };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function normalizeRow(row: Record<string, unknown>): AgentProfileRow {
  return {
    id: String(row.id ?? ''),
    agent_code: String(row.agent_code ?? ''),
    name: String(row.name ?? ''),
    execution_mode: String(row.execution_mode ?? 'advisory'),
    allowed_tools: parseJsonArray(row.allowed_tools),
    capabilities: parseJsonArray(row.capabilities),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
