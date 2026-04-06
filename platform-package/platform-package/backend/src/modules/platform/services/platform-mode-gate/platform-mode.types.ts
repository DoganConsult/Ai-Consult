/**
 * Core types and constants for the Platform Mode Gate system.
 * Defines platform operating modes, agent RBAC shape, and valid mode transitions.
 */

export type PlatformMode = 'human' | 'hybrid' | 'shadow_agent' | 'full_autonomous';

export interface AgentRbacEntry {
  agentId: string;
  name: string;
  nameAr: string;
  grcRole: string;
  grcRoleAr: string;
  permissions: string[];
  domain: string;
  domainAr: string;
  icon: string;
  color: string;
  description: string;
  descriptionAr: string;
}

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ModeGateDecision {
  shouldExecute: boolean;
  shouldQueue: boolean;
  shouldLog: boolean;
  reason: string;
}

// -- Valid mode transitions (prevents jumping human -> full_autonomous) --
export const VALID_MODE_TRANSITIONS: Record<PlatformMode, PlatformMode[]> = {
  human: ['hybrid'],
  hybrid: ['human', 'shadow_agent'],
  shadow_agent: ['hybrid', 'full_autonomous'],
  full_autonomous: ['shadow_agent'],
};

/**
 * Check whether a string is a valid PlatformMode value.
 */
export function isValidMode(mode: string): mode is PlatformMode {
  return ['human', 'hybrid', 'shadow_agent', 'full_autonomous'].includes(mode);
}
