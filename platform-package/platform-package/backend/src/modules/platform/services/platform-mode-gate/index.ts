/**
 * Platform Mode Gate - Barrel re-export.
 *
 * This directory was split from the original platform-mode-gate.service.ts (1,054 LOC)
 * into focused sub-modules. All public exports are preserved here for backward
 * compatibility so that existing `import ... from './index'`
 * statements continue to work after the original file is replaced with a re-export.
 *
 * Sub-modules:
 *   platform-mode.types.ts       - Core types, constants, isValidMode
 *   mode-transition.service.ts   - Transition validation, request/approve/reject/execute, tenant/agent mode
 *   agent-rbac-map.service.ts    - AGENT_RBAC_MAP proxy, getAgentRbacEntries/Entry
 *   mode-directives.service.ts   - getModeDirective, WorkflowModeDeclaration, DEFAULT_MODE_DECLARATIONS
 *   mode-gating.service.ts       - gateAction, gateActionWithPolicy
 *   pending-actions.service.ts   - queuePendingAction, logModeOperation, getPendingActions, reviewPendingAction
 *   platform-activation.service.ts - getFeatureFlags, setFeatureFlag, activatePlatform, getAutonomyProgressionRecommendation
 */

// -- Types & constants --
export {
  type PlatformMode,
  type AgentRbacEntry,
  type ActionPriority,
  type ModeGateDecision,
  VALID_MODE_TRANSITIONS,
  isValidMode,
} from './platform-mode.types';

// -- Mode transition & tenant/agent mode --
export {
  validateModeTransition,
  validateModeTransitionSync,
  getTenantPlatformMode,
  getAgentPlatformMode,
  setAgentModeOverride,
  requestModeTransition,
  approveModeTransition,
  rejectModeTransition,
  setTenantPlatformMode,
} from './mode-transition.service';

// -- Agent RBAC map --
export {
  AGENT_RBAC_MAP,
  getAgentRbacEntries,
  getAgentRbacEntry,
} from './agent-rbac-map.service';

// -- Mode directives & workflow declarations --
export {
  getModeDirective,
  type WorkflowModeDeclaration,
  DEFAULT_MODE_DECLARATIONS,
  getModeDeclaration,
} from './mode-directives.service';

// -- Action gating --
export {
  gateAction,
  gateActionWithPolicy,
} from './mode-gating.service';

// -- Pending actions & logging --
export {
  queuePendingAction,
  logModeOperation,
  getPendingActions,
  reviewPendingAction,
  expireStaleActions,
} from './pending-actions.service';

// -- Platform activation & feature flags --
export {
  getFeatureFlags,
  setFeatureFlag,
  activatePlatform,
  getAutonomyProgressionRecommendation,
} from './platform-activation.service';
