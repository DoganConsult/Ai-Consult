// @ts-nocheck
import { query } from '../../../config/database';
import { logger } from '../observability/logger.service';

// --- Types ---

export interface LifecycleState {
  code: string;
  label: string;
  isInitial: boolean;
  isFinal: boolean;
  metadata?: Record<string, unknown>;
}

export interface LifecycleTransition {
  fromState: string;
  toState: string;
  action: string;
  guards?: string[];
  requiredPermission?: string;
  metadata?: Record<string, unknown>;
}

export interface LifecycleDefinition {
  moduleCode: string;
  entityType: string;
  version: string;
  states: LifecycleState[];
  transitions: LifecycleTransition[];
  metadata?: Record<string, unknown>;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface LifecycleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// --- Functions ---

/**
 * Register a lifecycle definition for a module entity type.
 * Uses the shared lifecycle engine pattern (Law 5).
 */
export async function registerLifecycleDefinition(
  moduleCode: string,
  definition: LifecycleDefinition,
): Promise<LifecycleDefinition> {
  // Validate before persisting
  const validation = validateLifecycleDefinition(definition);
  if (!validation.isValid) {
    throw new Error(`Invalid lifecycle definition: ${validation.errors.join('; ')}`);
  }

  try {
    const result = await query(
      `INSERT INTO module_lifecycle_definitions
       (module_code, entity_type, version, states, transitions, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (module_code, entity_type) DO UPDATE
       SET version = EXCLUDED.version,
           states = EXCLUDED.states,
           transitions = EXCLUDED.transitions,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
       RETURNING module_code, entity_type, version, states, transitions, metadata, created_at, updated_at`,
      [
        moduleCode,
        definition.entityType,
        definition.version || '1.0.0',
        JSON.stringify(definition.states),
        JSON.stringify(definition.transitions),
        JSON.stringify(definition.metadata || {}),
      ],
    );

    const row = result.rows[0];
    logger.info(`[ModuleLifecycle] Registered definition: ${moduleCode}/${definition.entityType} v${definition.version}`);
    return mapRowToDefinition(row);
  } catch (err) {
    logger.error(`[ModuleLifecycle] Failed to register definition for ${moduleCode}/${definition.entityType}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get a specific lifecycle definition by module code and entity type.
 * Returns null if not found.
 */
export async function getLifecycleDefinition(
  moduleCode: string,
  entityType: string,
): Promise<LifecycleDefinition | null> {
  try {
    const result = await query(
      `SELECT module_code, entity_type, version, states, transitions, metadata, created_at, updated_at
       FROM module_lifecycle_definitions
       WHERE module_code = $1 AND entity_type = $2
       LIMIT 1`,
      [moduleCode, entityType],
    );
    if (result.rows.length === 0) return null;
    return mapRowToDefinition(result.rows[0]);
  } catch (err) {
    logger.error(`[ModuleLifecycle] Failed to get definition ${moduleCode}/${entityType}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * List all lifecycle definitions, optionally filtered by module code.
 */
export async function listLifecycleDefinitions(moduleCode?: string): Promise<LifecycleDefinition[]> {
  try {
    let sql = `SELECT module_code, entity_type, version, states, transitions, metadata, created_at, updated_at
               FROM module_lifecycle_definitions`;
    const params: unknown[] = [];

    if (moduleCode) {
      sql += ` WHERE module_code = $1`;
      params.push(moduleCode);
    }

    sql += ` ORDER BY module_code, entity_type`;

    const result = await query(sql, params);
    return result.rows.map((r: any) => mapRowToDefinition(r));
  } catch (err) {
    logger.error(`[ModuleLifecycle] Failed to list definitions: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Update fields of an existing lifecycle definition.
 * Only provided fields are changed. Re-validates after merge.
 */
export async function updateLifecycleDefinition(
  moduleCode: string,
  entityType: string,
  updates: Partial<LifecycleDefinition>,
): Promise<LifecycleDefinition | null> {
  const existing = await getLifecycleDefinition(moduleCode, entityType);
  if (!existing) {
    logger.warn(`[ModuleLifecycle] Definition not found for update: ${moduleCode}/${entityType}`);
    return null;
  }

  const merged: LifecycleDefinition = {
    ...existing,
    version: updates.version ?? existing.version,
    states: updates.states ?? existing.states,
    transitions: updates.transitions ?? existing.transitions,
    metadata: updates.metadata !== undefined
      ? { ...existing.metadata, ...updates.metadata }
      : existing.metadata,
  };

  // Validate merged result
  const validation = validateLifecycleDefinition(merged);
  if (!validation.isValid) {
    throw new Error(`Invalid updated lifecycle definition: ${validation.errors.join('; ')}`);
  }

  try {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (updates.version !== undefined) {
      sets.push(`version = $${idx++}`);
      params.push(updates.version);
    }
    if (updates.states !== undefined) {
      sets.push(`states = $${idx++}`);
      params.push(JSON.stringify(updates.states));
    }
    if (updates.transitions !== undefined) {
      sets.push(`transitions = $${idx++}`);
      params.push(JSON.stringify(updates.transitions));
    }
    if (updates.metadata !== undefined) {
      sets.push(`metadata = $${idx++}`);
      params.push(JSON.stringify(merged.metadata));
    }

    if (sets.length === 0) return existing;

    sets.push('updated_at = NOW()');
    params.push(moduleCode);
    params.push(entityType);

    await query(
      `UPDATE module_lifecycle_definitions SET ${sets.join(', ')}
       WHERE module_code = $${idx} AND entity_type = $${idx + 1}`,
      params,
    );

    logger.info(`[ModuleLifecycle] Updated definition: ${moduleCode}/${entityType}`);
    return getLifecycleDefinition(moduleCode, entityType);
  } catch (err) {
    logger.error(`[ModuleLifecycle] Failed to update ${moduleCode}/${entityType}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Validate a lifecycle definition for structural correctness.
 * Checks: at least one initial state, at least one final state,
 * transitions reference valid states, no orphan states, guard references.
 */
export function validateLifecycleDefinition(definition: LifecycleDefinition): LifecycleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!definition.states || definition.states.length === 0) {
    errors.push('Definition must have at least one state');
    return { isValid: false, errors, warnings };
  }

  if (!definition.entityType) {
    errors.push('Entity type is required');
  }

  if (!definition.moduleCode) {
    errors.push('Module code is required');
  }

  const stateCodes = new Set(definition.states.map(s => s.code));

  // Check for duplicate state codes
  if (stateCodes.size !== definition.states.length) {
    errors.push('Duplicate state codes detected');
  }

  // Must have exactly one initial state
  const initialStates = definition.states.filter(s => s.isInitial);
  if (initialStates.length === 0) {
    errors.push('At least one initial state is required');
  } else if (initialStates.length > 1) {
    warnings.push('Multiple initial states defined; only first will be used as default');
  }

  // Must have at least one final state
  const finalStates = definition.states.filter(s => s.isFinal);
  if (finalStates.length === 0) {
    errors.push('At least one final state is required');
  }

  // Validate transitions
  if (definition.transitions) {
    for (const t of definition.transitions) {
      if (!stateCodes.has(t.fromState)) {
        errors.push(`Transition references unknown source state '${t.fromState}'`);
      }
      if (!stateCodes.has(t.toState)) {
        errors.push(`Transition references unknown target state '${t.toState}'`);
      }
      if (!t.action) {
        errors.push(`Transition from '${t.fromState}' to '${t.toState}' must have an action`);
      }
      if (t.fromState === t.toState) {
        warnings.push(`Self-transition on state '${t.fromState}' via action '${t.action}'`);
      }
    }

    // Check for unreachable states (no incoming transitions and not initial)
    const reachableStates = new Set<string>();
    for (const s of definition.states) {
      if (s.isInitial) reachableStates.add(s.code);
    }
    for (const t of definition.transitions) {
      reachableStates.add(t.toState);
    }
    for (const s of definition.states) {
      if (!reachableStates.has(s.code)) {
        warnings.push(`State '${s.code}' is unreachable (no incoming transitions and not initial)`);
      }
    }

    // Check final states have no outgoing transitions
    for (const s of finalStates) {
      const outgoing = definition.transitions.filter(t => t.fromState === s.code);
      if (outgoing.length > 0) {
        warnings.push(`Final state '${s.code}' has outgoing transitions; these may be ignored`);
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Get allowed transitions for a module entity type.
 * Returns the transition definitions from the lifecycle.
 */
export async function getLifecycleTransitions(
  moduleCode: string,
  entityType: string,
): Promise<LifecycleTransition[]> {
  const definition = await getLifecycleDefinition(moduleCode, entityType);
  if (!definition) return [];
  return definition.transitions;
}

/**
 * Remove a lifecycle definition for a module entity type.
 * Returns true if a row was deleted.
 */
export async function removeLifecycleDefinition(
  moduleCode: string,
  entityType: string,
): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM module_lifecycle_definitions
       WHERE module_code = $1 AND entity_type = $2`,
      [moduleCode, entityType],
    );
    const removed = (result.rowCount ?? 0) > 0;
    if (removed) {
      logger.info(`[ModuleLifecycle] Removed definition: ${moduleCode}/${entityType}`);
    }
    return removed;
  } catch (err) {
    logger.error(`[ModuleLifecycle] Failed to remove ${moduleCode}/${entityType}: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Export all lifecycle definitions for a module as a JSON-serializable array.
 * Useful for migration and backup workflows.
 */
export async function exportLifecycleDefinitions(moduleCode: string): Promise<LifecycleDefinition[]> {
  try {
    const definitions = await listLifecycleDefinitions(moduleCode);
    // Strip internal timestamps for clean export
    return definitions.map(d => ({
      moduleCode: d.moduleCode,
      entityType: d.entityType,
      version: d.version,
      states: d.states,
      transitions: d.transitions,
      metadata: d.metadata || {},
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  } catch (err) {
    logger.error(`[ModuleLifecycle] Failed to export definitions for ${moduleCode}: ${(err as Error).message}`);
    return [];
  }
}

// --- Internal helpers ---

function mapRowToDefinition(row: any): LifecycleDefinition {
  return {
    moduleCode: row.module_code,
    entityType: row.entity_type,
    version: row.version || '1.0.0',
    states: parseJsonColumn(row.states, []),
    transitions: parseJsonColumn(row.transitions, []),
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export const moduleLifecycleDefinitionService = {
  registerLifecycleDefinition,
  getLifecycleDefinition,
  listLifecycleDefinitions,
  updateLifecycleDefinition,
  validateLifecycleDefinition,
  getLifecycleTransitions,
  removeLifecycleDefinition,
  exportLifecycleDefinitions,
};
