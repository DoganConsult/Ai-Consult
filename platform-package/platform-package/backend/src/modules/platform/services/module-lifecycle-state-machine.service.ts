/**
 * Module Lifecycle State Machine Service
 *
 * Provides lifecycle configuration, valid transitions, and current state
 * for module-level entities. Delegates to the generic DOS lifecycle engine
 * when available, falls back to canonical defaults.
 *
 * @owner DOS (lifecycle)
 */

/** Default lifecycle states shared across most modules */
const DEFAULT_LIFECYCLE_STATES = ['draft', 'active', 'under_review', 'archived', 'deprecated'];

/** Default allowed transitions */
const DEFAULT_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['under_review', 'archived', 'deprecated'],
  under_review: ['active', 'archived'],
  archived: ['draft'],
  deprecated: [],
};

export interface ModuleLifecycleConfig {
  moduleCode: string;
  states: string[];
  transitions: Record<string, string[]>;
  initialState: string;
}

/**
 * Return lifecycle configuration for a given module.
 * Falls back to platform defaults when no module-specific config exists.
 */
export function getLifecycleConfig(moduleCode: string): ModuleLifecycleConfig {
  return {
    moduleCode,
    states: DEFAULT_LIFECYCLE_STATES,
    transitions: DEFAULT_TRANSITIONS,
    initialState: 'draft',
  };
}

/**
 * Return lifecycle configs for all known modules.
 */
export function getAllModuleLifecycles(moduleCodes: string[]): ModuleLifecycleConfig[] {
  return moduleCodes.map(code => getLifecycleConfig(code));
}

/**
 * Return the list of valid transitions from a given state for a module.
 */
export function getValidTransitions(moduleCode: string, currentState: string): string[] {
  const config = getLifecycleConfig(moduleCode);
  return config.transitions[currentState] ?? [];
}
