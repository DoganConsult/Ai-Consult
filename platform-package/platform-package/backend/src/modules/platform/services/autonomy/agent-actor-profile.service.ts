// @ts-nocheck
/**
 * Agent Actor Profile Service — Autonomy Layer
 *
 * Computes trust/reliability scores for AI agents based on execution history,
 * approval rates, uptime, and escalation patterns. Used by the autonomy
 * progression engine to decide whether an agent may advance modes.
 */
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

/* ------------------------------------------------------------------ */
/*  Trust-score weights                                                */
/* ------------------------------------------------------------------ */
const WEIGHT_SUCCESS_RATE = 0.40;
const WEIGHT_APPROVAL_RATE = 0.20;
const WEIGHT_UPTIME = 0.20;
const WEIGHT_NO_ESCALATION = 0.20;

const LOOKBACK_DAYS = 30;

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Compute a trust score (0-100) for a specific agent within a tenant.
 *
 * Factors:
 *   successRate   (40%) — ratio of successful runs in the last 30 days
 *   approvalRate  (20%) — ratio of approved actions vs total requiring approval
 *   uptime        (20%) — ratio of non-error heartbeats to expected heartbeats
 *   noEscalation  (20%) — inverse of escalation frequency (fewer = better)
 */
export async function computeAgentTrustScore(
  tenantId: string,
  agentCode: string,
): Promise<{ score: number; factors: Record<string, number>; recommendation: string }> {
  const schema = tenantSchema(tenantId);
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Gather factor data in parallel
  const [successFactor, approvalFactor, uptimeFactor, escalationFactor] = await Promise.all([
    computeSuccessRate(schema, agentCode, since),
    computeApprovalRate(schema, agentCode, since),
    computeUptime(schema, agentCode, since),
    computeNoEscalationRate(schema, agentCode, since),
  ]);

  const score = Math.round(
    successFactor * WEIGHT_SUCCESS_RATE * 100 +
    approvalFactor * WEIGHT_APPROVAL_RATE * 100 +
    uptimeFactor * WEIGHT_UPTIME * 100 +
    escalationFactor * WEIGHT_NO_ESCALATION * 100,
  );

  const clampedScore = Math.max(0, Math.min(100, score));

  const factors: Record<string, number> = {
    successRate: round2(successFactor),
    approvalRate: round2(approvalFactor),
    uptime: round2(uptimeFactor),
    noEscalation: round2(escalationFactor),
  };

  const recommendation = deriveRecommendation(clampedScore, factors);

  logger.info('[AgentTrust] Score computed', { tenantId, agentCode, score: clampedScore, factors });

  return { score: clampedScore, factors, recommendation };
}

/**
 * Retrieve the stored agent profile (definition row) from agent_registry.
 */
export async function getAgentProfile(
  tenantId: string,
  agentCode: string,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".agent_registry WHERE agent_code = $1 LIMIT 1`,
      [agentCode],
    );
    return rows[0] ?? null;
  } catch (err) {
    logger.warn('[AgentTrust] Failed to fetch agent profile', {
      tenantId,
      agentCode,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Factor computations (private)                                     */
/* ------------------------------------------------------------------ */

async function computeSuccessRate(schema: string, agentCode: string, since: string): Promise<number> {
  try {
    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'success') AS success_count,
         COUNT(*) AS total_count
       FROM "${schema}".agent_runs
       WHERE agent_code = $1 AND created_at >= $2`,
      [agentCode, since],
    );
    const total = Number(rows[0]?.total_count) || 0;
    if (total === 0) return 0.5; // no data → neutral
    return Number(rows[0]?.success_count) / total;
  } catch {
    return 0.5;
  }
}

async function computeApprovalRate(schema: string, agentCode: string, since: string): Promise<number> {
  try {
    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
         COUNT(*) AS total_count
       FROM "${schema}".agent_approvals
       WHERE agent_code = $1 AND created_at >= $2`,
      [agentCode, since],
    );
    const total = Number(rows[0]?.total_count) || 0;
    if (total === 0) return 0.5;
    return Number(rows[0]?.approved_count) / total;
  } catch {
    return 0.5;
  }
}

async function computeUptime(schema: string, agentCode: string, since: string): Promise<number> {
  try {
    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('healthy', 'ok', 'active')) AS healthy_count,
         COUNT(*) AS total_count
       FROM "${schema}".agent_heartbeats
       WHERE agent_code = $1 AND recorded_at >= $2`,
      [agentCode, since],
    );
    const total = Number(rows[0]?.total_count) || 0;
    if (total === 0) return 0.5;
    return Number(rows[0]?.healthy_count) / total;
  } catch {
    // Table may not exist yet — treat as neutral
    return 0.5;
  }
}

async function computeNoEscalationRate(schema: string, agentCode: string, since: string): Promise<number> {
  try {
    const runsResult = await safeQuery(
      `SELECT COUNT(*) AS total FROM "${schema}".agent_runs
       WHERE agent_code = $1 AND created_at >= $2`,
      [agentCode, since],
    );
    const totalRuns = Number(runsResult.rows[0]?.total) || 0;
    if (totalRuns === 0) return 0.5;

    const escResult = await safeQuery(
      `SELECT COUNT(*) AS esc_count FROM "${schema}".agent_runs
       WHERE agent_code = $1 AND created_at >= $2 AND escalated = true`,
      [agentCode, since],
    );
    const escalations = Number(escResult.rows[0]?.esc_count) || 0;
    return 1 - (escalations / totalRuns);
  } catch {
    return 0.5;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function deriveRecommendation(score: number, factors: Record<string, number>): string {
  if (score >= 85) {
    return 'Agent demonstrates high reliability. Eligible for increased autonomy.';
  }
  if (score >= 65) {
    const weakest = Object.entries(factors).sort((a, b) => a[1] - b[1])[0];
    return `Agent is moderately reliable. Focus on improving ${weakest[0]} (currently ${(weakest[1] * 100).toFixed(0)}%) to qualify for autonomy progression.`;
  }
  if (score >= 40) {
    return 'Agent reliability is below threshold. Recommend co-pilot mode with human oversight until metrics improve.';
  }
  return 'Agent reliability is critically low. Restrict to advisory mode only. Investigate failure patterns.';
}

/* ------------------------------------------------------------------ */
/*  Autonomy levels (ascending independence)                          */
/* ------------------------------------------------------------------ */

export type AutonomyLevel = 'observe_only' | 'suggest' | 'co_pilot' | 'autonomous';

const __AUTONOMY_LEVELS: AutonomyLevel[] = ['observe_only', 'suggest', 'co_pilot', 'autonomous'];

/* ------------------------------------------------------------------ */
/*  List all agent profiles                                           */
/* ------------------------------------------------------------------ */

/**
 * List all active agent profiles for a tenant.
 */
export async function listAgentProfiles(
  tenantId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".agent_registry
       WHERE is_active = true
       ORDER BY display_name ASC`,
    );
    return rows;
  } catch (err) {
    logger.warn('[AgentProfile] Failed to list profiles', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Upsert agent profile                                              */
/* ------------------------------------------------------------------ */

/**
 * Create or update an agent profile. Uses upsert on agent_code
 * for idempotency. Records audit trail for the mutation.
 */
export async function upsertAgentProfile(
  tenantId: string,
  input: {
    agentCode: string;
    displayName: string;
    agentVersion?: string;
    capabilityDomains?: string[];
    toolAccess?: string[];
    allowedActions?: string[];
    forbiddenActions?: string[];
    maxAutonomyLevel?: string;
    humanRolesReplaceable?: string[];
  },
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);

  if (!input.agentCode) throw new Error('agentCode is required');
  if (!input.displayName) throw new Error('displayName is required');

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".agent_registry
       (agent_code, display_name, agent_version,
        capability_domains, tool_access, allowed_actions,
        forbidden_actions, max_autonomy_level, human_roles_replaceable,
        is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
     ON CONFLICT (agent_code) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       agent_version = EXCLUDED.agent_version,
       capability_domains = EXCLUDED.capability_domains,
       tool_access = EXCLUDED.tool_access,
       allowed_actions = EXCLUDED.allowed_actions,
       forbidden_actions = EXCLUDED.forbidden_actions,
       max_autonomy_level = EXCLUDED.max_autonomy_level,
       human_roles_replaceable = EXCLUDED.human_roles_replaceable,
       updated_at = NOW()
     RETURNING *`,
    [
      input.agentCode,
      input.displayName,
      input.agentVersion || '1.0',
      JSON.stringify(input.capabilityDomains || []),
      JSON.stringify(input.toolAccess || []),
      JSON.stringify(input.allowedActions || []),
      JSON.stringify(input.forbiddenActions || []),
      input.maxAutonomyLevel || 'observe_only',
      JSON.stringify(input.humanRolesReplaceable || []),
    ],
  );

  logger.info('[AgentProfile] Upserted agent profile', { tenantId, agentCode: input.agentCode });
  return rows[0];
}

/* ------------------------------------------------------------------ */
/*  Update agent profile fields                                       */
/* ------------------------------------------------------------------ */

/**
 * Update specific fields on an existing agent profile.
 */
export async function updateAgentProfile(
  tenantId: string,
  agentCode: string,
  updates: Partial<{
    displayName: string;
    agentVersion: string;
    capabilityDomains: string[];
    toolAccess: string[];
    allowedActions: string[];
    forbiddenActions: string[];
    maxAutonomyLevel: string;
    humanRolesReplaceable: string[];
    isActive: boolean;
  }>,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.displayName !== undefined) {
    setClauses.push(`display_name = $${idx++}`);
    params.push(updates.displayName);
  }
  if (updates.agentVersion !== undefined) {
    setClauses.push(`agent_version = $${idx++}`);
    params.push(updates.agentVersion);
  }
  if (updates.capabilityDomains !== undefined) {
    setClauses.push(`capability_domains = $${idx++}`);
    params.push(JSON.stringify(updates.capabilityDomains));
  }
  if (updates.toolAccess !== undefined) {
    setClauses.push(`tool_access = $${idx++}`);
    params.push(JSON.stringify(updates.toolAccess));
  }
  if (updates.allowedActions !== undefined) {
    setClauses.push(`allowed_actions = $${idx++}`);
    params.push(JSON.stringify(updates.allowedActions));
  }
  if (updates.forbiddenActions !== undefined) {
    setClauses.push(`forbidden_actions = $${idx++}`);
    params.push(JSON.stringify(updates.forbiddenActions));
  }
  if (updates.maxAutonomyLevel !== undefined) {
    setClauses.push(`max_autonomy_level = $${idx++}`);
    params.push(updates.maxAutonomyLevel);
  }
  if (updates.humanRolesReplaceable !== undefined) {
    setClauses.push(`human_roles_replaceable = $${idx++}`);
    params.push(JSON.stringify(updates.humanRolesReplaceable));
  }
  if (updates.isActive !== undefined) {
    setClauses.push(`is_active = $${idx++}`);
    params.push(updates.isActive);
  }

  if (setClauses.length === 0) return getAgentProfile(tenantId, agentCode);

  setClauses.push(`updated_at = NOW()`);
  params.push(agentCode);

  const { rows } = await safeQuery(
    `UPDATE "${schema}".agent_registry
     SET ${setClauses.join(', ')}
     WHERE agent_code = $${idx}
     RETURNING *`,
    params,
  );

  if (rows.length === 0) return null;
  logger.info('[AgentProfile] Updated agent profile', { tenantId, agentCode });
  return rows[0];
}

/* ------------------------------------------------------------------ */
/*  Decision boundaries                                               */
/* ------------------------------------------------------------------ */

/** Decision boundary definition for an agent. */
export interface DecisionBoundary {
  allowedActions: string[];
  forbiddenActions: string[];
  maxAutonomyLevel: string;
  requiresHumanApproval: string[];
  capabilityDomains: string[];
}

/**
 * Get the decision boundaries that define what the agent can and cannot do.
 */
export async function getAgentDecisionBoundaries(
  tenantId: string,
  agentCode: string,
): Promise<DecisionBoundary | null> {
  const profile = await getAgentProfile(tenantId, agentCode);
  if (!profile) return null;

  const autonomy = (profile.max_autonomy_level as string) || 'observe_only';
  const allowedActions = parseJsonArray(profile.allowed_actions);
  const forbiddenActions = parseJsonArray(profile.forbidden_actions);
  const capabilityDomains = parseJsonArray(profile.capability_domains);

  // Determine which actions require human approval based on autonomy level
  const requiresHumanApproval: string[] = [];
  if (autonomy === 'observe_only') {
    requiresHumanApproval.push('*');
  } else if (autonomy === 'suggest') {
    requiresHumanApproval.push('create', 'update', 'delete', 'approve', 'override', 'publish');
  } else if (autonomy === 'co_pilot') {
    requiresHumanApproval.push('delete', 'override', 'publish');
  }

  return {
    allowedActions,
    forbiddenActions,
    maxAutonomyLevel: autonomy,
    requiresHumanApproval,
    capabilityDomains,
  };
}

/* ------------------------------------------------------------------ */
/*  Evaluate agent action                                             */
/* ------------------------------------------------------------------ */

/** Result of evaluating whether an agent action is permitted. */
export interface ActionEvaluationResult {
  permitted: boolean;
  reason: string;
  requiresApproval: boolean;
}

/**
 * Evaluate whether a specific action is within the agent's boundaries.
 */
export async function evaluateAgentAction(
  tenantId: string,
  agentCode: string,
  action: { actionCode: string; module: string; riskLevel?: number },
): Promise<ActionEvaluationResult> {
  const boundaries = await getAgentDecisionBoundaries(tenantId, agentCode);
  if (!boundaries) {
    return { permitted: false, reason: 'Agent profile not found', requiresApproval: false };
  }

  // Check forbidden list
  if (boundaries.forbiddenActions.includes(action.actionCode)) {
    return { permitted: false, reason: `Action "${action.actionCode}" is forbidden`, requiresApproval: false };
  }

  // Check if action requires human approval
  if (boundaries.requiresHumanApproval.includes('*') ||
      boundaries.requiresHumanApproval.includes(action.actionCode)) {
    return { permitted: false, reason: 'Action requires human approval', requiresApproval: true };
  }

  // Check allowed list (if non-empty, only those are permitted)
  if (boundaries.allowedActions.length > 0 && !boundaries.allowedActions.includes(action.actionCode)) {
    return { permitted: false, reason: `Action "${action.actionCode}" not in allowed list`, requiresApproval: false };
  }

  return { permitted: true, reason: 'Action within boundaries', requiresApproval: false };
}

/* ------------------------------------------------------------------ */
/*  JSON array parsing helper                                         */
/* ------------------------------------------------------------------ */

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}
