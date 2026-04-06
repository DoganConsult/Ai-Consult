// @ts-nocheck
/**
 * Lifecycle Transition Registry Service — DOS
 *
 * Manages the registry of allowed lifecycle transitions with guard conditions.
 * Provides transition lookup, validation, and guard management for the
 * lifecycle engine. Complements lifecycle-registry.ts with persistent
 * transition definitions and guard conditions.
 *
 * @owner DOS
 * @since 2026-04-04
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../observability/logger.service';
import { safeQuery } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';
import { getFirstRow } from '../../../utils/db-utils';
import type { GenericRow } from '../../../types/db-rows.types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TransitionDefinition {
  moduleCode: string;
  entityType: string;
  fromState: string;
  toState: string;
  label?: string;
  description?: string;
  requiresApproval?: boolean;
  requiredPermission?: string;
  slaHours?: number;
}

export interface TransitionGuard {
  guardId?: string;
  name: string;
  guardType: 'permission' | 'condition' | 'sod' | 'approval' | 'custom';
  expression: string;
  errorMessage: string;
  isBlocking: boolean;
}

export interface TransitionRecord {
  id: string;
  moduleCode: string;
  entityType: string;
  fromState: string;
  toState: string;
  label: string | null;
  description: string | null;
  requiresApproval: boolean;
  requiredPermission: string | null;
  slaHours: number | null;
  guards: TransitionGuard[];
  createdAt: string;
}

export interface TransitionChainValidation {
  valid: boolean;
  invalidAt: number | null;
  fromState: string | null;
  toState: string | null;
  message: string;
}

// ── In-memory transition store (supplemented by DB) ────────────────────────────

const transitionStore = new Map<string, TransitionRecord>();
const guardStore = new Map<string, TransitionGuard[]>();

/** Build a composite key for transition lookup */
function transitionKey(moduleCode: string, entityType: string, fromState: string, toState: string): string {
  return `${moduleCode}:${entityType}:${fromState}:${toState}`;
}

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Register an allowed transition between two states for a module entity type.
 * Idempotent: re-registering the same transition overwrites it.
 */
export async function registerTransition(definition: TransitionDefinition): Promise<TransitionRecord> {
  const key = transitionKey(definition.moduleCode, definition.entityType, definition.fromState, definition.toState);
  const id = uuid();
  const now = new Date().toISOString();

  const record: TransitionRecord = {
    id,
    moduleCode: definition.moduleCode,
    entityType: definition.entityType,
    fromState: definition.fromState,
    toState: definition.toState,
    label: definition.label ?? null,
    description: definition.description ?? null,
    requiresApproval: definition.requiresApproval ?? false,
    requiredPermission: definition.requiredPermission ?? null,
    slaHours: definition.slaHours ?? null,
    guards: guardStore.get(key) ?? [],
    createdAt: now,
  };

  transitionStore.set(key, record);

  // Persist to DB (best-effort, in-memory is authoritative during runtime)
  try {
    await safeQuery(
      `INSERT INTO public.lifecycle_transition_registry
       (id, module_code, entity_type, from_state, to_state, label, description,
        requires_approval, required_permission, sla_hours, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (module_code, entity_type, from_state, to_state)
       DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description,
         requires_approval = EXCLUDED.requires_approval, required_permission = EXCLUDED.required_permission,
         sla_hours = EXCLUDED.sla_hours`,
      [
        id, definition.moduleCode, definition.entityType,
        definition.fromState, definition.toState,
        definition.label ?? null, definition.description ?? null,
        definition.requiresApproval ?? false,
        definition.requiredPermission ?? null,
        definition.slaHours ?? null,
      ],
    );
  } catch (err) {
    logger.warn('[TransitionRegistry] DB persist failed, in-memory only', {
      key, error: toErrorMessage(err),
    });
  }

  logger.info('[TransitionRegistry] Transition registered', {
    moduleCode: definition.moduleCode, entityType: definition.entityType,
    from: definition.fromState, to: definition.toState,
  });

  return record;
}

/**
 * Get a specific transition definition.
 */
export async function getTransition(
  moduleCode: string,
  entityType: string,
  fromState: string,
  toState: string,
): Promise<TransitionRecord | null> {
  const key = transitionKey(moduleCode, entityType, fromState, toState);

  // Check in-memory first
  const cached = transitionStore.get(key);
  if (cached) return cached;

  // Fall back to DB
  try {
    const result = await safeQuery(
      `SELECT id, module_code, entity_type, from_state, to_state, label, description,
              requires_approval, required_permission, sla_hours, created_at
       FROM public.lifecycle_transition_registry
       WHERE module_code = $1 AND entity_type = $2 AND from_state = $3 AND to_state = $4`,
      [moduleCode, entityType, fromState, toState],
    );

    const row = getFirstRow(result);
    if (!row) return null;

    const record = mapTransitionRow(row);
    record.guards = guardStore.get(key) ?? [];
    transitionStore.set(key, record);
    return record;
  } catch (err) {
    logger.error('[TransitionRegistry] Failed to get transition', {
      moduleCode, entityType, fromState, toState, error: toErrorMessage(err),
    });
    return null;
  }
}

/**
 * List transitions with optional filters by module code and entity type.
 */
export async function listTransitions(
  moduleCode?: string,
  entityType?: string,
): Promise<TransitionRecord[]> {
  // If filters match in-memory data, return from memory
  const memResults: TransitionRecord[] = [];
  for (const record of transitionStore.values()) {
    if (moduleCode && record.moduleCode !== moduleCode) continue;
    if (entityType && record.entityType !== entityType) continue;
    memResults.push(record);
  }
  if (memResults.length > 0) return memResults;

  // Fall back to DB
  try {
    const params: string[] = [];
    const conditions: string[] = [];
    if (moduleCode) {
      params.push(moduleCode);
      conditions.push(`module_code = $${params.length}`);
    }
    if (entityType) {
      params.push(entityType);
      conditions.push(`entity_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await safeQuery(
      `SELECT id, module_code, entity_type, from_state, to_state, label, description,
              requires_approval, required_permission, sla_hours, created_at
       FROM public.lifecycle_transition_registry
       ${whereClause}
       ORDER BY module_code, entity_type, from_state`,
      params,
    );

    return result.rows.map((row: GenericRow) => {
      const record = mapTransitionRow(row);
      const key = transitionKey(record.moduleCode, record.entityType, record.fromState, record.toState);
      record.guards = guardStore.get(key) ?? [];
      transitionStore.set(key, record);
      return record;
    });
  } catch (err) {
    logger.error('[TransitionRegistry] Failed to list transitions', {
      moduleCode, entityType, error: toErrorMessage(err),
    });
    return memResults;
  }
}

/**
 * Remove a transition from the registry.
 */
export async function removeTransition(
  moduleCode: string,
  entityType: string,
  fromState: string,
  toState: string,
): Promise<boolean> {
  const key = transitionKey(moduleCode, entityType, fromState, toState);
  transitionStore.delete(key);
  guardStore.delete(key);

  try {
    await safeQuery(
      `DELETE FROM public.lifecycle_transition_registry
       WHERE module_code = $1 AND entity_type = $2 AND from_state = $3 AND to_state = $4`,
      [moduleCode, entityType, fromState, toState],
    );
    logger.info('[TransitionRegistry] Transition removed', { moduleCode, entityType, fromState, toState });
    return true;
  } catch (err) {
    logger.error('[TransitionRegistry] Failed to remove transition', {
      moduleCode, entityType, fromState, toState, error: toErrorMessage(err),
    });
    return false;
  }
}

/**
 * Get all transitions that originate from a given state.
 */
export async function getTransitionsFrom(
  moduleCode: string,
  entityType: string,
  fromState: string,
): Promise<TransitionRecord[]> {
  const results: TransitionRecord[] = [];

  // Check in-memory
  for (const record of transitionStore.values()) {
    if (record.moduleCode === moduleCode && record.entityType === entityType && record.fromState === fromState) {
      results.push(record);
    }
  }
  if (results.length > 0) return results;

  // Fall back to DB
  try {
    const dbResult = await safeQuery(
      `SELECT id, module_code, entity_type, from_state, to_state, label, description,
              requires_approval, required_permission, sla_hours, created_at
       FROM public.lifecycle_transition_registry
       WHERE module_code = $1 AND entity_type = $2 AND from_state = $3
       ORDER BY to_state`,
      [moduleCode, entityType, fromState],
    );

    return dbResult.rows.map((row: GenericRow) => {
      const record = mapTransitionRow(row);
      const key = transitionKey(record.moduleCode, record.entityType, record.fromState, record.toState);
      record.guards = guardStore.get(key) ?? [];
      transitionStore.set(key, record);
      return record;
    });
  } catch (err) {
    logger.error('[TransitionRegistry] Failed to get transitions from state', {
      moduleCode, entityType, fromState, error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Validate that a sequence of state transitions forms a valid chain.
 * Each consecutive pair must be a registered transition.
 */
export async function validateTransitionChain(
  moduleCode: string,
  entityType: string,
  transitions: string[],
): Promise<TransitionChainValidation> {
  if (transitions.length < 2) {
    return { valid: true, invalidAt: null, fromState: null, toState: null, message: 'Chain has fewer than 2 states, trivially valid' };
  }

  for (let i = 0; i < transitions.length - 1; i++) {
    const from = transitions[i];
    const to = transitions[i + 1];
    const transition = await getTransition(moduleCode, entityType, from, to);
    if (!transition) {
      return {
        valid: false,
        invalidAt: i,
        fromState: from,
        toState: to,
        message: `No registered transition from '${from}' to '${to}' at position ${i}`,
      };
    }
  }

  return {
    valid: true,
    invalidAt: null,
    fromState: transitions[0],
    toState: transitions[transitions.length - 1],
    message: `Valid chain of ${transitions.length - 1} transitions`,
  };
}

/**
 * Get all guard conditions for a specific transition.
 */
export async function getTransitionGuards(
  moduleCode: string,
  entityType: string,
  fromState: string,
  toState: string,
): Promise<TransitionGuard[]> {
  const key = transitionKey(moduleCode, entityType, fromState, toState);
  const guards = guardStore.get(key);
  if (guards) return guards;

  // Try loading from DB
  try {
    const result = await safeQuery(
      `SELECT id, name, guard_type, expression, error_message, is_blocking
       FROM public.lifecycle_transition_guards
       WHERE module_code = $1 AND entity_type = $2 AND from_state = $3 AND to_state = $4
       ORDER BY name`,
      [moduleCode, entityType, fromState, toState],
    );

    const loadedGuards: TransitionGuard[] = result.rows.map((row: GenericRow) => ({
      guardId: String(row.id),
      name: String(row.name),
      guardType: String(row.guard_type) as TransitionGuard['guardType'],
      expression: String(row.expression),
      errorMessage: String(row.error_message),
      isBlocking: Boolean(row.is_blocking),
    }));

    if (loadedGuards.length > 0) {
      guardStore.set(key, loadedGuards);
    }
    return loadedGuards;
  } catch (err) {
    logger.error('[TransitionRegistry] Failed to get guards', {
      moduleCode, entityType, fromState, toState, error: toErrorMessage(err),
    });
    return [];
  }
}

/**
 * Register a guard condition for a specific transition.
 */
export async function registerTransitionGuard(
  moduleCode: string,
  entityType: string,
  fromState: string,
  toState: string,
  guard: TransitionGuard,
): Promise<TransitionGuard> {
  const key = transitionKey(moduleCode, entityType, fromState, toState);
  const guardId = guard.guardId ?? uuid();

  const fullGuard: TransitionGuard = { ...guard, guardId };

  // Add to in-memory store
  const existing = guardStore.get(key) ?? [];
  // Replace if same name exists, otherwise append
  const existingIndex = existing.findIndex(g => g.name === guard.name);
  if (existingIndex >= 0) {
    existing[existingIndex] = fullGuard;
  } else {
    existing.push(fullGuard);
  }
  guardStore.set(key, existing);

  // Update the transition record's guards reference
  const transition = transitionStore.get(key);
  if (transition) {
    transition.guards = existing;
  }

  // Persist to DB (best-effort)
  try {
    await safeQuery(
      `INSERT INTO public.lifecycle_transition_guards
       (id, module_code, entity_type, from_state, to_state, name, guard_type,
        expression, error_message, is_blocking, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (module_code, entity_type, from_state, to_state, name)
       DO UPDATE SET guard_type = EXCLUDED.guard_type, expression = EXCLUDED.expression,
         error_message = EXCLUDED.error_message, is_blocking = EXCLUDED.is_blocking`,
      [
        guardId, moduleCode, entityType, fromState, toState,
        guard.name, guard.guardType, guard.expression,
        guard.errorMessage, guard.isBlocking,
      ],
    );
  } catch (err) {
    logger.warn('[TransitionRegistry] Guard DB persist failed, in-memory only', {
      key, guardName: guard.name, error: toErrorMessage(err),
    });
  }

  logger.info('[TransitionRegistry] Guard registered', {
    moduleCode, entityType, from: fromState, to: toState, guard: guard.name,
  });

  return fullGuard;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function mapTransitionRow(row: GenericRow): TransitionRecord {
  return {
    id: String(row.id),
    moduleCode: String(row.module_code),
    entityType: String(row.entity_type),
    fromState: String(row.from_state),
    toState: String(row.to_state),
    label: row.label ? String(row.label) : null,
    description: row.description ? String(row.description) : null,
    requiresApproval: Boolean(row.requires_approval),
    requiredPermission: row.required_permission ? String(row.required_permission) : null,
    slaHours: row.sla_hours != null ? Number(row.sla_hours) : null,
    guards: [],
    createdAt: String(row.created_at),
  };
}
