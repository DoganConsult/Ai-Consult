/**
 * Platform Mode Agent Gate — Translates platform mode into concrete agent permissions.
 *
 * This is the DOS-owned bridge between platform autonomy modes and agent capabilities.
 * Every agent action passes through this gate before execution.
 *
 * Modes:
 *   manual     → agents observe only, no actions, no visible suggestions
 *   hybrid     → agents suggest + execute with human approval
 *   autonomous → full execution within boundaries, human oversight for high-risk
 *
 * @owner DOS (Law 2)
 * @patch Patch 8 (AI Agent Stack)
 */

import { emitEvent } from '../events/event-bus';

// ── Types ──────────────────────────────────────────────────────────

export type PlatformMode = 'manual' | 'hybrid' | 'autonomous';

export interface AgentModeCapabilities {
  canObserve: boolean;
  canSuggest: boolean;
  canExecuteWithApproval: boolean;
  canExecuteAutonomously: boolean;
  suggestionsVisible: boolean;
  requiresHumanApproval: boolean;
  maxRiskLevelWithoutApproval: 'none' | 'low' | 'medium' | 'high';
}

export interface ModeTransitionImpact {
  fromMode: PlatformMode;
  toMode: PlatformMode;
  agentsAffected: number;
  capabilityChanges: string[];
  requiresGracePeriod: boolean;
}

export interface ModeEnforcementDecision {
  agentId: string;
  action: string;
  allowed: boolean;
  mode: PlatformMode;
  reason: string;
  timestamp: string;
}

// ── Mode Capability Definitions ────────────────────────────────────

const MODE_CAPABILITIES: Record<PlatformMode, AgentModeCapabilities> = {
  manual: {
    canObserve: true,
    canSuggest: false,
    canExecuteWithApproval: false,
    canExecuteAutonomously: false,
    suggestionsVisible: false,
    requiresHumanApproval: true,
    maxRiskLevelWithoutApproval: 'none',
  },
  hybrid: {
    canObserve: true,
    canSuggest: true,
    canExecuteWithApproval: true,
    canExecuteAutonomously: false,
    suggestionsVisible: true,
    requiresHumanApproval: true,
    maxRiskLevelWithoutApproval: 'low',
  },
  autonomous: {
    canObserve: true,
    canSuggest: true,
    canExecuteWithApproval: true,
    canExecuteAutonomously: true,
    suggestionsVisible: true,
    requiresHumanApproval: false,
    maxRiskLevelWithoutApproval: 'medium',
  },
};

// ── High-risk actions (always require human regardless of mode) ────

const ALWAYS_REQUIRE_HUMAN = [
  'delete_production_data', 'revoke_all_access', 'disable_tenant',
  'modify_security_policy', 'grant_admin_privileges', 'delete_audit_records',
  'override_sod_rules', 'bypass_lifecycle_auth', 'modify_encryption',
];

// ── Core Gate Functions ────────────────────────────────────────────

/**
 * Master check: can this agent perform this action in the current mode?
 */
export async function canAgentAct(
  tenantId: string,
  agentId: string,
  action: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low',
): Promise<{ allowed: boolean; reason: string; mode: PlatformMode }> {
  let mode: PlatformMode = 'manual';
  try {
    const { getTenantPlatformMode } = await import('../../../modules/platform/services/autonomy/platform-mode-gate.service');
    mode = await getTenantPlatformMode(tenantId);
  } catch { /* default manual */ }

  // Always-require-human actions
  if (ALWAYS_REQUIRE_HUMAN.includes(action)) {
    await auditModeEnforcementDecision(tenantId, agentId, action, false, mode, 'Action always requires human approval');
    return { allowed: false, reason: 'Action always requires human approval regardless of mode', mode };
  }

  const caps = MODE_CAPABILITIES[mode];

  // Manual: observe only
  if (mode === 'manual' && action !== 'observe') {
    await auditModeEnforcementDecision(tenantId, agentId, action, false, mode, 'Manual mode: agents observe only');
    return { allowed: false, reason: 'Platform is in manual mode — agents can only observe', mode };
  }

  // Hybrid: check risk level
  if (mode === 'hybrid') {
    const riskOrder = ['none', 'low', 'medium', 'high', 'critical'];
    const maxAllowed = riskOrder.indexOf(caps.maxRiskLevelWithoutApproval);
    const actionRisk = riskOrder.indexOf(riskLevel);

    if (actionRisk > maxAllowed) {
      await auditModeEnforcementDecision(tenantId, agentId, action, false, mode, `Risk level ${riskLevel} exceeds hybrid mode threshold`);
      return { allowed: false, reason: `Action risk level '${riskLevel}' exceeds hybrid mode threshold — requires human approval`, mode };
    }
  }

  // Autonomous: check critical risk
  if (mode === 'autonomous' && riskLevel === 'critical') {
    await auditModeEnforcementDecision(tenantId, agentId, action, false, mode, 'Critical risk requires human even in autonomous');
    return { allowed: false, reason: 'Critical risk actions require human oversight even in autonomous mode', mode };
  }

  await auditModeEnforcementDecision(tenantId, agentId, action, true, mode, `Allowed in ${mode} mode`);
  return { allowed: true, reason: `Allowed in ${mode} mode`, mode };
}

/**
 * Get capabilities for an agent in the current platform mode.
 */
export async function getAgentModeCapabilities(
  tenantId: string,
  _agentId: string,
): Promise<AgentModeCapabilities & { currentMode: PlatformMode }> {
  let mode: PlatformMode = 'manual';
  try {
    const { getTenantPlatformMode } = await import('../../../modules/platform/services/autonomy/platform-mode-gate.service');
    mode = await getTenantPlatformMode(tenantId);
  } catch { /* default */ }

  return { ...MODE_CAPABILITIES[mode], currentMode: mode };
}

/**
 * Analyze impact of mode transition on active agents.
 */
export async function getModeTransitionImpactOnAgents(
  _tenantId: string,
  fromMode: PlatformMode,
  toMode: PlatformMode,
): Promise<ModeTransitionImpact> {
  const fromCaps = MODE_CAPABILITIES[fromMode];
  const toCaps = MODE_CAPABILITIES[toMode];

  const changes: string[] = [];
  if (fromCaps.canSuggest !== toCaps.canSuggest) changes.push(`Suggestions: ${fromCaps.canSuggest} → ${toCaps.canSuggest}`);
  if (fromCaps.canExecuteWithApproval !== toCaps.canExecuteWithApproval) changes.push(`Execute with approval: ${fromCaps.canExecuteWithApproval} → ${toCaps.canExecuteWithApproval}`);
  if (fromCaps.canExecuteAutonomously !== toCaps.canExecuteAutonomously) changes.push(`Autonomous execution: ${fromCaps.canExecuteAutonomously} → ${toCaps.canExecuteAutonomously}`);
  if (fromCaps.suggestionsVisible !== toCaps.suggestionsVisible) changes.push(`Suggestions visible: ${fromCaps.suggestionsVisible} → ${toCaps.suggestionsVisible}`);

  return {
    fromMode, toMode,
    agentsAffected: 0, // Would query active agents in production
    capabilityChanges: changes,
    requiresGracePeriod: fromMode === 'autonomous' && toMode === 'manual', // Downgrade needs grace
  };
}

/**
 * Audit every mode enforcement decision (Law 12).
 */
export async function auditModeEnforcementDecision(
  tenantId: string,
  agentId: string,
  action: string,
  allowed: boolean,
  mode: PlatformMode,
  reason: string,
): Promise<void> {
  await emitEvent({
    tenantId,
    userId: `agent:${agentId}`,
    module: 'platform',
    event: 'platform.agent.mode_enforcement',
    entityType: 'agent',
    entityId: agentId,
    data: { action, allowed, mode, reason, timestamp: new Date().toISOString() },
  }).catch(() => {});
}
