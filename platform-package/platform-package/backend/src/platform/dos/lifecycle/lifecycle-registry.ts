/**
 * Lifecycle Registry — Centralized registration point for all module lifecycle definitions.
 *
 * Sprint S4 / Z2.13: Consolidates the 43 per-module lifecycle services by providing
 * a single registration pattern. Each module declares its entity types, valid states,
 * and allowed transitions via `registerLifecycleDefinition()`. The registry stores
 * definitions in memory for runtime lookup by `lifecycle-auth.service.ts` and the
 * generic `EntityStateMachine`.
 *
 * This file does NOT replace per-module services — they remain for domain-specific
 * logic (evidence completeness, SLA computation, etc.). It only consolidates the
 * state/transition declarations so that:
 *   1. lifecycle-auth.service.ts can validate transitions without hitting DB
 *   2. EntityStateMachine instances can be created on demand from registry data
 *   3. A single place lists all lifecycle definitions across the platform
 *
 * Per-module migration to use this registry happens in S5+.
 */

import { logger } from '../observability/logger.service';
import { EntityStateMachine, type StateMachineConfig } from './entity-state-machine';
import {
  registerLifecycleDefinition as engineRegister,
  getLifecycleDefinition as engineGet,
  getAllDefinitions as engineGetAll,
  type LifecycleDefinition,
} from './lifecycle-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Full lifecycle definition for a module entity type.
 * Extends the engine's LifecycleDefinition with optional metadata
 * needed for registry-level features (initial state, terminal states,
 * per-transition permissions, labels).
 */
export interface LifecycleRegistryEntry {
  /** Module code (e.g. 'evidence', 'compliance', 'risk') */
  moduleCode: string;
  /** Entity type within the module (e.g. 'evidence', 'control', 'risk_register') */
  entityType: string;
  /** All valid states for this entity */
  states: readonly string[];
  /** Map of state -> allowed next states */
  transitions: Record<string, string[]>;
  /** States with no outbound transitions (auto-detected if omitted) */
  terminalStates?: readonly string[];
  /** The state assigned on entity creation */
  initialState?: string;
  /** Optional permission required per transition (e.g. 'draft->active': 'control.write') */
  transitionPermissions?: Record<string, string>;
}

// ── In-memory registry ─────────────────────────────────────────────────────────

const registry = new Map<string, LifecycleRegistryEntry>();

/** Build composite key for registry lookup */
function registryKey(moduleCode: string, entityType: string): string {
  return `${moduleCode}:${entityType}`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Register a lifecycle definition for a module entity type.
 *
 * This is the canonical entry point for modules to declare their lifecycle.
 * It stores the definition in the local registry AND forwards it to the
 * lifecycle-engine so that `performTransition()` and `canTransition()` work.
 *
 * Idempotent — re-registering the same moduleCode+entityType overwrites
 * the previous definition with a warning.
 *
 * @param moduleCode  Module identifier (e.g. 'evidence', 'compliance')
 * @param entityType  Entity type within the module (e.g. 'control', 'risk')
 * @param states      All valid states for this entity
 * @param transitions Map of state -> allowed next states
 * @param options     Optional: terminalStates, initialState, transitionPermissions
 */
export function registerLifecycleDefinition(
  moduleCode: string,
  entityType: string,
  states: readonly string[],
  transitions: Record<string, string[]>,
  options?: {
    terminalStates?: readonly string[];
    initialState?: string;
    transitionPermissions?: Record<string, string>;
  },
): void {
  const key = registryKey(moduleCode, entityType);

  if (registry.has(key)) {
    logger.warn(`[LifecycleRegistry] Overwriting existing definition for ${key}`);
  }

  // Auto-detect terminal states: states whose transitions array is empty
  const terminalStates = options?.terminalStates ??
    states.filter((s) => {
      const targets = transitions[s];
      return !targets || targets.length === 0;
    });

  const entry: LifecycleRegistryEntry = {
    moduleCode,
    entityType,
    states,
    transitions,
    terminalStates,
    initialState: options?.initialState,
    transitionPermissions: options?.transitionPermissions,
  };

  registry.set(key, entry);

  // Forward to lifecycle-engine for performTransition()/canTransition() compat
  engineRegister({
    entityType,
    moduleCode,
    transitions,
    terminalStates: terminalStates as string[],
  });

  logger.info(`[LifecycleRegistry] Registered ${key} (${states.length} states, ${Object.keys(transitions).length} source states)`);
}

/**
 * Look up a registered lifecycle definition.
 * Returns the full registry entry (with metadata) or null if not found.
 */
export function getRegistryEntry(moduleCode: string, entityType: string): LifecycleRegistryEntry | null {
  return registry.get(registryKey(moduleCode, entityType)) ?? null;
}

/**
 * Look up from the engine (which includes DB-loaded definitions).
 * Falls back to lifecycle-engine when a definition was loaded from DB
 * rather than registered in-code.
 */
export function getDefinition(moduleCode: string, entityType: string): LifecycleDefinition | null {
  return engineGet(moduleCode, entityType);
}

/**
 * Get all registered lifecycle definitions (both in-code and engine).
 */
export function getAllRegisteredDefinitions(): LifecycleRegistryEntry[] {
  return Array.from(registry.values());
}

/**
 * Get all definitions from the engine (includes DB-loaded ones).
 */
export function getAllDefinitions(): LifecycleDefinition[] {
  return engineGetAll();
}

/**
 * Check if a transition is valid for a given module+entity type.
 * Checks local registry first, then falls back to lifecycle-engine.
 */
export function isTransitionValid(moduleCode: string, entityType: string, from: string, to: string): boolean {
  const entry = registry.get(registryKey(moduleCode, entityType));
  if (entry) {
    const allowed = entry.transitions[from];
    return Array.isArray(allowed) && allowed.includes(to);
  }
  // Fallback to engine (which may have DB-loaded definitions)
  const def = engineGet(moduleCode, entityType);
  if (!def) return false;
  const allowed = def.transitions[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Get the permission required for a specific transition.
 * Returns null if no specific permission is defined (caller should use module default).
 */
export function getTransitionPermission(moduleCode: string, entityType: string, from: string, to: string): string | null {
  const entry = registry.get(registryKey(moduleCode, entityType));
  if (!entry?.transitionPermissions) return null;
  return entry.transitionPermissions[`${from}->${to}`] ?? null;
}

/**
 * Check if a state is terminal (no outbound transitions).
 */
export function isTerminalState(moduleCode: string, entityType: string, state: string): boolean {
  const entry = registry.get(registryKey(moduleCode, entityType));
  if (entry) {
    return entry.terminalStates?.includes(state) ?? false;
  }
  const def = engineGet(moduleCode, entityType);
  if (!def) return false;
  if (def.terminalStates) return def.terminalStates.includes(state);
  const allowed = def.transitions[state];
  return Array.isArray(allowed) && allowed.length === 0;
}

/**
 * Get allowed next states from a given state.
 */
export function getAllowedTransitions(moduleCode: string, entityType: string, from: string): string[] {
  const entry = registry.get(registryKey(moduleCode, entityType));
  if (entry) {
    return entry.transitions[from] ?? [];
  }
  const def = engineGet(moduleCode, entityType);
  if (!def) return [];
  return (def.transitions[from] as string[]) ?? [];
}

/**
 * Create an EntityStateMachine instance from a registered definition.
 * Useful when a service wants a typed FSM that emits events on transition.
 * Returns null if no definition is registered.
 */
export function createStateMachineFromRegistry(moduleCode: string, entityType: string): EntityStateMachine<string> | null {
  const entry = registry.get(registryKey(moduleCode, entityType));
  if (!entry) return null;

  const config: StateMachineConfig<string> = {
    entityType: entry.entityType,
    transitions: entry.transitions,
  };
  return new EntityStateMachine<string>(config);
}

/**
 * Return a summary of all registered definitions for diagnostics / admin API.
 */
export function getRegistrySummary(): Array<{
  moduleCode: string;
  entityType: string;
  stateCount: number;
  transitionCount: number;
  terminalStates: readonly string[];
  initialState: string | undefined;
}> {
  return Array.from(registry.values()).map((entry) => {
    let transitionCount = 0;
    for (const targets of Object.values(entry.transitions)) {
      transitionCount += targets.length;
    }
    return {
      moduleCode: entry.moduleCode,
      entityType: entry.entityType,
      stateCount: entry.states.length,
      transitionCount,
      terminalStates: entry.terminalStates ?? [],
      initialState: entry.initialState,
    };
  });
}

/**
 * Clear all in-memory definitions. Used in tests only.
 */
export function clearRegistry(): void {
  registry.clear();
}

// ── Convenience re-export ──────────────────────────────────────────────────────

export { LifecycleDefinition } from './lifecycle-engine';
export { EntityStateMachine } from './entity-state-machine';
