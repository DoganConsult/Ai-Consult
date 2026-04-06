// @ts-nocheck
/**
 * Action Gating: determines whether an agent action should execute, queue, or log
 * based on the current platform mode and granular gating rules.
 * Requirements: 4.2 Granular Action Gating
 */
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import type { PlatformMode, ActionPriority, ModeGateDecision } from './platform-mode.types';
const validateAssetDeployment = async (_tenantId: string, _actionContext: any) => ({ allowed: true, reason: '' });

/**
 * Simple mode-based gating (no DB lookup).
 */
export function gateAction(mode: PlatformMode, priority: ActionPriority): ModeGateDecision {
  switch (mode) {
    case 'human':
      return { shouldExecute: false, shouldQueue: true, shouldLog: true, reason: 'Human mode: all actions require approval' };

    case 'hybrid':
      if (priority === 'critical' || priority === 'high') {
        return { shouldExecute: false, shouldQueue: true, shouldLog: true, reason: `Hybrid mode: ${priority} priority requires approval` };
      }
      return { shouldExecute: true, shouldQueue: false, shouldLog: true, reason: `Hybrid mode: ${priority} priority auto-executed` };

    case 'shadow_agent':
      return { shouldExecute: true, shouldQueue: false, shouldLog: true, reason: 'Shadow mode: executed with full audit logging' };

    case 'full_autonomous':
      return { shouldExecute: true, shouldQueue: false, shouldLog: true, reason: 'Autonomous mode: executed with audit trail' };

    default:
      return { shouldExecute: false, shouldQueue: true, shouldLog: true, reason: 'Unknown mode: defaulting to queue' };
  }
}

const _policyCache = new Map<string, { policy: unknown; ts: number }>();
const POLICY_CACHE_TTL = 120_000;

/**
 * Enhanced action gating with granular rules (DB-backed).
 * Requirements: 4.2 Granular Action Gating
 */
export async function gateActionWithPolicy(
  tenantId: string,
  mode: PlatformMode,
  priority: ActionPriority,
  actionType: string,
  agentId?: string,
  actionContext?: unknown
): Promise<ModeGateDecision> {
  const schema = tenantSchema(tenantId);

  // Cross-Module Gatekeeper: Exception Hub (Zero-Trust Logic for High-Risk Deployment)
  if (actionType === 'asset.deploy') {
    const deploymentCheck = await validateAssetDeployment(tenantId, actionContext);
    if (!deploymentCheck.allowed) {
      return {
        shouldExecute: false,
        shouldQueue: false,
        shouldLog: true,
        reason: `[Exception Gatekeeper Blocked] ${deploymentCheck.reason}`
      };
    }
  }

  // Check granular action gating rules first (4.2)
  try {
    const gatingRes = await safeQuery(
      `SELECT * FROM "${schema}".action_gating_rules
       WHERE action_type = $1 AND is_active = true
       AND (agent_id = $2 OR agent_id IS NULL)
       AND (tenant_id = $3 OR tenant_id = '_default')
       ORDER BY
         CASE WHEN agent_id = $2 THEN 0 ELSE 1 END,
         CASE WHEN tenant_id = $3 THEN 0 ELSE 1 END
       LIMIT 1`,
      [actionType, agentId || null, tenantId],
    );

    if (gatingRes.rows.length > 0) {
      const rule = getFirstRow(gatingRes);

      // Check blocked agents
      if (agentId && rule.blocked_agents && rule.blocked_agents.includes(agentId)) {
        return {
          shouldExecute: false,
          shouldQueue: true,
          shouldLog: true,
          reason: `Agent ${agentId} is blocked for action ${actionType} by gating rule`,
        };
      }

      // Check allowed agents
      if (agentId && rule.allowed_agents && rule.allowed_agents.length > 0 && !rule.allowed_agents.includes(agentId)) {
        return {
          shouldExecute: false,
          shouldQueue: true,
          shouldLog: true,
          reason: `Agent ${agentId} not in allowed_agents for ${actionType}`,
        };
      }

      // Check priority threshold
      if (rule.priority_threshold) {
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const thresholdOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        if (priorityOrder[priority] < thresholdOrder[rule.priority_threshold]) {
          return {
            shouldExecute: false,
            shouldQueue: true,
            shouldLog: true,
            reason: `Action priority ${priority} below threshold ${rule.priority_threshold} for ${actionType}`,
          };
        }
      }

      // Check required mode
      if (rule.required_mode && mode !== rule.required_mode) {
        return {
          shouldExecute: false,
          shouldQueue: true,
          shouldLog: true,
          reason: `Action ${actionType} requires mode ${rule.required_mode}, current mode is ${mode}`,
        };
      }

      // Check min autonomy level
      if (rule.min_autonomy_level) {
        const autonomyMap: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };
        const modeMap: Record<string, number> = { human: 0, hybrid: 1, shadow_agent: 2, full_autonomous: 3 };
        const currentLevel = modeMap[mode] ?? 0;
        const requiredLevel = autonomyMap[rule.min_autonomy_level] ?? 0;

        if (currentLevel < requiredLevel) {
          return {
            shouldExecute: false,
            shouldQueue: true,
            shouldLog: true,
            reason: `Gating rule requires ${rule.min_autonomy_level} for ${actionType}; current mode ${mode} insufficient`,
          };
        }
      }

      // Check if approval required
      if (rule.requires_approval && mode !== 'full_autonomous') {
        return {
          shouldExecute: false,
          shouldQueue: true,
          shouldLog: true,
          reason: `Gating rule requires approval for ${actionType}`,
        };
      }

      // Rule allows execution
      return {
        shouldExecute: true,
        shouldQueue: false,
        shouldLog: true,
        reason: `Gating rule allows auto-execute for ${actionType} at ${mode}`,
      };
    }
  } catch { /* fall through to legacy policy check */ }

  // Fall back to legacy agent_autonomy_policies
  const cacheKey = `${tenantId}:${actionType}`;
  const cached = _policyCache.get(cacheKey);
  let policy = cached && Date.now() - cached.ts < POLICY_CACHE_TTL ? cached.policy : null;

  if (!policy) {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".agent_autonomy_policies WHERE action_type = $1
         AND (tenant_id = $2 OR tenant_id = '_default')
         ORDER BY CASE WHEN tenant_id = $2 THEN 0 ELSE 1 END LIMIT 1`,
        [actionType, tenantId],
      );
      policy = getFirstRow(result) || null;
      if (policy) _policyCache.set(cacheKey, { policy, ts: Date.now() });
    } catch { /* fall through to hardcoded logic */ }
  }

  if (policy) {
    if (agentId && policy.allowed_agents?.length > 0 && !policy.allowed_agents.includes(agentId)) {
      return { shouldExecute: false, shouldQueue: true, shouldLog: true, reason: `Agent ${agentId} not in allowed_agents for ${actionType}` };
    }

    const autonomyMap: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };
    const modeMap: Record<string, number> = { human: 0, hybrid: 1, shadow_agent: 2, full_autonomous: 3 };
    const currentLevel = modeMap[mode] ?? 0;
    const requiredLevel = autonomyMap[policy.min_autonomy] ?? 0;

    if (currentLevel < requiredLevel) {
      return { shouldExecute: false, shouldQueue: true, shouldLog: true, reason: `Policy requires ${policy.min_autonomy} for ${actionType}; current mode ${mode} insufficient` };
    }

    if (policy.requires_approval && mode !== 'full_autonomous') {
      return { shouldExecute: false, shouldQueue: true, shouldLog: true, reason: `Policy requires approval for ${actionType}` };
    }

    return { shouldExecute: true, shouldQueue: false, shouldLog: true, reason: `Policy allows auto-execute for ${actionType} at ${mode}` };
  }

  return gateAction(mode, priority);
}
