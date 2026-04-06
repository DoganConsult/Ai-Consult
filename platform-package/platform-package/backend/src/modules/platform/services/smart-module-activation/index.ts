/**
 * Smart Module Activation Service — Barrel Re-export
 *
 * Preserves the original public API surface. All consumers that imported
 * from `smart-module-activation.service` continue to work unchanged.
 */

// Types
export type { ModuleActivationRule } from './types';

// Activation rules constant
export { MODULE_ACTIVATION_RULES } from './activation-rules';

// Core activation engine (main orchestrator + condition evaluation helpers)
export {
  activateModulesSmartly,
  evaluateActivationConditions,
  inferOrganizationSize,
} from './activation-engine';

// Module DB operations
export {
  activateModule,
  deactivateModule,
  getModuleActivationStatus,
  getActiveModules,
} from './module-db-operations';

// GRC process enforcement
export {
  ensureWorkflowExists,
  ensureRoleExists,
  ensureDashboardExists,
} from './grc-process-enforcement';

// Validation
export { validateGrcProcessRequirements } from './validation';

// Formatting helpers
export {
  formatModuleName,
  formatModuleNameAr,
  formatWorkflowName,
  formatWorkflowNameAr,
  formatRoleName,
  formatRoleNameAr,
  formatDashboardName,
  formatDashboardNameAr,
} from './format-helpers';
