/**
 * Autonomy Review Service (top-level facade)
 *
 * Reviews a tenant's autonomy posture: are agents operating within approved
 * boundaries? Flags violations where agents exceed the tenant's approved
 * autonomy level.
 */
import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/services/logger.service';
import { getTenantPlatformMode  } from './autonomy/platform-mode-gate.service';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AutonomyViolation {
  agentCode: string;
  violation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface TenantAutonomyReview {
  approved: boolean;
  currentMode: string;
  violations: AutonomyViolation[];
  recommendation: string;
}

/* ------------------------------------------------------------------ */
/*  Mode hierarchy (lower index = less autonomy)                      */
/* ------------------------------------------------------------------ */

const MODE_HIERARCHY: Record<string, number> = {
  manual: 0,
  advisory: 1,
  hybrid: 2,
  'co-pilot': 2,
  shadow_agent: 3,
  delegated: 3,
  autonomous: 4,
  full_autonomous: 4,
};

function modeLevel(mode: string): number {
  return MODE_HIERARCHY[mode] ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Review all registered agents for a tenant and flag any that operate
 * above the tenant's approved autonomy level.
 */
export async function reviewTenantAutonomy(tenantId: string): Promise<TenantAutonomyReview> {
  const schema = tenantSchema(tenantId);

  // 1. Get tenant's approved platform mode
  const currentMode = await getTenantPlatformMode(tenantId);
  const approvedLevel = modeLevel(currentMode);

  // 2. Fetch all registered agents
  let agents: Record<string, unknown>[] = [];
  try {
    const { rows } = await safeQuery(
      `SELECT agent_code, name, execution_mode, is_active
       FROM "${schema}".agent_registry
       WHERE is_active = true
       ORDER BY agent_code`,
      [],
    );
    agents = rows;
  } catch (err) {
    logger.warn('[AutonomyReview] Cannot query agent_registry', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    // If table doesn't exist, no agents — no violations
    return {
      approved: true,
      currentMode,
      violations: [],
      recommendation: 'No agent registry available. No agents to review.',
    };
  }

  if (agents.length === 0) {
    return {
      approved: true,
      currentMode,
      violations: [],
      recommendation: 'No active agents registered. Tenant posture is compliant.',
    };
  }

  // 3. Check each agent's execution mode against the approved level
  const violations: AutonomyViolation[] = [];

  for (const agent of agents) {
    const agentCode = String(agent.agent_code ?? '');
    const agentMode = String(agent.execution_mode ?? 'manual');
    const agentLevel = modeLevel(agentMode);

    if (agentLevel > approvedLevel) {
      const severity = deriveSeverity(agentLevel, approvedLevel);
      violations.push({
        agentCode,
        violation: `Agent "${agentCode}" is operating in "${agentMode}" mode (level ${agentLevel}) but tenant is approved for "${currentMode}" (level ${approvedLevel}).`,
        severity,
      });
    }
  }

  // 4. Check for agents with recent runs that exceeded mode constraints
  const recentExceedances = await detectRecentModeExceedances(schema, tenantId, currentMode);
  violations.push(...recentExceedances);

  // 5. Build recommendation
  const approved = violations.length === 0;
  const recommendation = buildRecommendation(approved, currentMode, violations);

  if (!approved) {
    logger.warn('[AutonomyReview] Violations detected', {
      tenantId,
      currentMode,
      violationCount: violations.length,
    });
  }

  return { approved, currentMode, violations, recommendation };
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

function deriveSeverity(agentLevel: number, approvedLevel: number): AutonomyViolation['severity'] {
  const gap = agentLevel - approvedLevel;
  if (gap >= 3) return 'critical';
  if (gap >= 2) return 'high';
  if (gap >= 1) return 'medium';
  return 'low';
}

/**
 * Look at the last 24 hours of agent_runs for any runs that performed
 * autonomous actions while the tenant mode would not allow it.
 */
async function detectRecentModeExceedances(
  schema: string,
  _tenantId: string,
  currentMode: string,
): Promise<AutonomyViolation[]> {
  const violations: AutonomyViolation[] = [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const approvedLevel = modeLevel(currentMode);

  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT agent_code, execution_mode
       FROM "${schema}".agent_runs
       WHERE created_at >= $1
         AND execution_mode IS NOT NULL`,
      [since],
    );

    for (const row of rows) {
      const runMode = String(row.execution_mode ?? 'manual');
      const runLevel = modeLevel(runMode);
      if (runLevel > approvedLevel) {
        violations.push({
          agentCode: String(row.agent_code ?? ''),
          violation: `Agent executed in "${runMode}" mode within the last 24 hours, exceeding approved "${currentMode}" mode.`,
          severity: 'high',
        });
      }
    }
  } catch {
    // agent_runs table may not exist — not a violation itself
  }

  return violations;
}

function buildRecommendation(
  approved: boolean,
  currentMode: string,
  violations: AutonomyViolation[],
): string {
  if (approved) {
    return `All agents are operating within the approved "${currentMode}" autonomy level. No action required.`;
  }

  const criticalCount = violations.filter((v) => v.severity === 'critical').length;
  const highCount = violations.filter((v) => v.severity === 'high').length;

  const parts: string[] = [
    `${violations.length} violation(s) detected against approved mode "${currentMode}".`,
  ];

  if (criticalCount > 0) {
    parts.push(`${criticalCount} critical: immediately restrict offending agents.`);
  }
  if (highCount > 0) {
    parts.push(`${highCount} high: review and downgrade agent execution modes.`);
  }

  parts.push('Run autonomy remediation or manually adjust agent modes in the agent registry.');

  return parts.join(' ');
}
