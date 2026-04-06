/**
 * Platform-canonical Module → Workflow Map — barrel re-export + requirement overlay
 *
 * This file serves two purposes:
 *  1. Re-exports the authoritative MODULE_WORKFLOW_MAP and helpers from
 *     `./modules/module-workflow-map` so that existing consumers importing
 *     from `config/module-workflow-map` continue to work.
 *  2. Adds a workflow-requirements overlay (mode, protected transitions,
 *     required approval level) sourced from the product-workflow-defaults.
 *
 * @owner platform/dos
 * @since 2026-04-04
 */

// ── Re-exports from the authoritative modules/ map ───────────────────
export {
  MODULE_WORKFLOW_MAP,
  getOperationalModules,
  getChainParticipants,
  isPlatformOnly,
  getPrimaryTemplateCode,
} from './modules/module-workflow-map';

export type {
  CanonicalModuleCode,
  ModuleTier,
  ModuleCategory,
  ModuleWorkflowEntry,
} from './modules/module-workflow-map';

// ── Workflow-requirements overlay (mode + transitions + level) ────────

import type { WorkflowMode } from '../platform/dos/workflows/modes';
import type { WorkflowLevel } from '../platform/dos/workflows/integration';

export interface ModuleWorkflowRequirement {
  /** Module code as registered in the module manifest. */
  moduleCode: string;
  /** Default workflow operating mode (express | standard | enterprise). */
  defaultMode: WorkflowMode;
  /** Transitions that require approval / elevated authority. */
  protectedTransitions: readonly string[];
  /** Minimum workflow approval level (operational | managerial | executive). */
  requiredLevel: WorkflowLevel;
}

const MODULE_WORKFLOW_REQUIREMENTS: ReadonlyMap<string, ModuleWorkflowRequirement> = new Map<string, ModuleWorkflowRequirement>([
  ['risk',           { moduleCode: 'risk',           defaultMode: 'enterprise', protectedTransitions: ['assessed→active', 'active→accepted', 'accepted→closed'],          requiredLevel: 'executive'   }],
  ['compliance',     { moduleCode: 'compliance',     defaultMode: 'enterprise', protectedTransitions: ['in_review→approved', 'approved→active'],                          requiredLevel: 'executive'   }],
  ['audit',          { moduleCode: 'audit',          defaultMode: 'enterprise', protectedTransitions: ['review→issued', 'issued→closed'],                                 requiredLevel: 'executive'   }],
  ['policy',         { moduleCode: 'policy',         defaultMode: 'standard',   protectedTransitions: ['review→approved', 'approved→published'],                           requiredLevel: 'managerial'  }],
  ['incident',       { moduleCode: 'incident',       defaultMode: 'enterprise', protectedTransitions: ['investigating→resolved', 'resolved→closed'],                      requiredLevel: 'executive'   }],
  ['controls',       { moduleCode: 'controls',       defaultMode: 'standard',   protectedTransitions: ['in_review→approved', 'active→retired'],                            requiredLevel: 'managerial'  }],
  ['evidence',       { moduleCode: 'evidence',       defaultMode: 'standard',   protectedTransitions: ['under_review→approved'],                                           requiredLevel: 'managerial'  }],
  ['vendor',         { moduleCode: 'vendor',         defaultMode: 'enterprise', protectedTransitions: ['in_review→approved', 'active→terminated'],                         requiredLevel: 'executive'   }],
  ['exception',      { moduleCode: 'exception',      defaultMode: 'enterprise', protectedTransitions: ['under_review→approved', 'approved→revoked'],                      requiredLevel: 'executive'   }],
  ['remediation',    { moduleCode: 'remediation',    defaultMode: 'standard',   protectedTransitions: ['pending_verification→closed'],                                     requiredLevel: 'managerial'  }],
  ['governance',     { moduleCode: 'governance',     defaultMode: 'enterprise', protectedTransitions: ['under_review→approved'],                                           requiredLevel: 'executive'   }],
  ['ai-governance',  { moduleCode: 'ai-governance',  defaultMode: 'enterprise', protectedTransitions: ['in_review→approved', 'approved→deployed'],                         requiredLevel: 'executive'   }],
  ['reporting',      { moduleCode: 'reporting',      defaultMode: 'standard',   protectedTransitions: ['in_review→approved'],                                              requiredLevel: 'managerial'  }],
  ['analytics',      { moduleCode: 'analytics',      defaultMode: 'standard',   protectedTransitions: ['in_review→approved'],                                              requiredLevel: 'managerial'  }],
  ['training',       { moduleCode: 'training',       defaultMode: 'express',    protectedTransitions: ['in_review→approved'],                                              requiredLevel: 'operational' }],
  ['privacy',        { moduleCode: 'privacy',        defaultMode: 'enterprise', protectedTransitions: ['in_review→approved', 'active→archived'],                           requiredLevel: 'executive'   }],
  ['bcp',            { moduleCode: 'bcp',            defaultMode: 'enterprise', protectedTransitions: ['in_review→approved', 'active→invoked'],                            requiredLevel: 'executive'   }],
  ['asset',          { moduleCode: 'asset',          defaultMode: 'standard',   protectedTransitions: ['in_review→approved', 'active→decommissioned'],                     requiredLevel: 'managerial'  }],
  ['dora',           { moduleCode: 'dora',           defaultMode: 'enterprise', protectedTransitions: ['in_review→approved'],                                              requiredLevel: 'executive'   }],
  ['issues',         { moduleCode: 'issues',         defaultMode: 'standard',   protectedTransitions: ['investigating→resolved', 'resolved→closed'],                      requiredLevel: 'managerial'  }],
]);

export { MODULE_WORKFLOW_REQUIREMENTS };

// ── Lookup helpers ───────────────────────────────────────────────────

/** Return the full workflow requirement for a module, or null if unknown. */
export function getModuleWorkflowRequirement(moduleCode: string): ModuleWorkflowRequirement | null {
  return MODULE_WORKFLOW_REQUIREMENTS.get(moduleCode) ?? null;
}

/** Return the default workflow mode for a module (falls back to 'standard'). */
export function getModuleWorkflowMode(moduleCode: string): WorkflowMode {
  return MODULE_WORKFLOW_REQUIREMENTS.get(moduleCode)?.defaultMode ?? 'standard';
}

/** Return the minimum required approval level (falls back to 'operational'). */
export function getModuleRequiredLevel(moduleCode: string): WorkflowLevel {
  return MODULE_WORKFLOW_REQUIREMENTS.get(moduleCode)?.requiredLevel ?? 'operational';
}

/** Check whether a specific transition is protected for a module. */
export function isModuleTransitionProtected(moduleCode: string, transition: string): boolean {
  const req = MODULE_WORKFLOW_REQUIREMENTS.get(moduleCode);
  if (!req) return false;
  return req.protectedTransitions.includes(transition);
}

/** Return all registered module codes that have workflow requirements. */
export function getRegisteredWorkflowModules(): readonly string[] {
  return [...MODULE_WORKFLOW_REQUIREMENTS.keys()];
}
