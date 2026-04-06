import { query } from '../../../config/database';
import { logger } from '../observability/logger.service';

// --- Types ---

export interface ModuleDependency {
  moduleCode: string;
  dependsOn: string;
  type: 'required' | 'optional';
  createdAt: Date | null;
}

export interface DependencyValidationResult {
  isValid: boolean;
  errors: DependencyError[];
}

export interface DependencyError {
  type: 'circular' | 'missing' | 'self_reference';
  modules: string[];
  message: string;
}

// --- Functions ---

/**
 * Register a dependency between two modules.
 * Prevents self-references and duplicate entries.
 */
export async function registerDependency(
  moduleCode: string,
  dependsOn: string,
  type: 'required' | 'optional',
): Promise<ModuleDependency> {
  if (moduleCode === dependsOn) {
    throw new Error(`Module '${moduleCode}' cannot depend on itself`);
  }

  try {
    const result = await query(
      `INSERT INTO module_dependencies (module_code, depends_on, dependency_type, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (module_code, depends_on) DO UPDATE
       SET dependency_type = EXCLUDED.dependency_type
       RETURNING module_code, depends_on, dependency_type, created_at`,
      [moduleCode, dependsOn, type],
    );

    const row = result.rows[0];
    logger.info(`[ModuleDependency] Registered: ${moduleCode} -> ${dependsOn} (${type})`);

    return {
      moduleCode: row.module_code,
      dependsOn: row.depends_on,
      type: row.dependency_type,
      createdAt: row.created_at,
    };
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to register ${moduleCode} -> ${dependsOn}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get direct dependencies of a module.
 */
export async function getDependencies(moduleCode: string): Promise<ModuleDependency[]> {
  try {
    const result = await query(
      `SELECT module_code, depends_on, dependency_type, created_at
       FROM module_dependencies
       WHERE module_code = $1
       ORDER BY depends_on`,
      [moduleCode],
    );
    return result.rows.map((r: any) => ({
      moduleCode: r.module_code,
      dependsOn: r.depends_on,
      type: r.dependency_type || 'required',
      createdAt: r.created_at,
    }));
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to get dependencies for ${moduleCode}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Get the full transitive dependency tree for a module.
 * Uses a recursive CTE to walk the graph and detect cycles.
 */
export async function getTransitiveDependencies(moduleCode: string): Promise<ModuleDependency[]> {
  try {
    const result = await query(
      `WITH RECURSIVE dep_tree AS (
         SELECT module_code, depends_on, dependency_type, created_at, ARRAY[module_code] AS path
         FROM module_dependencies
         WHERE module_code = $1
       UNION ALL
         SELECT md.module_code, md.depends_on, md.dependency_type, md.created_at,
                dt.path || md.module_code
         FROM module_dependencies md
         JOIN dep_tree dt ON md.module_code = dt.depends_on
         WHERE NOT md.module_code = ANY(dt.path)
       )
       SELECT DISTINCT module_code, depends_on, dependency_type, created_at
       FROM dep_tree
       ORDER BY module_code, depends_on`,
      [moduleCode],
    );
    return result.rows.map((r: any) => ({
      moduleCode: r.module_code,
      dependsOn: r.depends_on,
      type: r.dependency_type || 'required',
      createdAt: r.created_at,
    }));
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to get transitive deps for ${moduleCode}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Get modules that depend on a given module (reverse lookup).
 */
export async function getDependents(moduleCode: string): Promise<ModuleDependency[]> {
  try {
    const result = await query(
      `SELECT module_code, depends_on, dependency_type, created_at
       FROM module_dependencies
       WHERE depends_on = $1
       ORDER BY module_code`,
      [moduleCode],
    );
    return result.rows.map((r: any) => ({
      moduleCode: r.module_code,
      dependsOn: r.depends_on,
      type: r.dependency_type || 'required',
      createdAt: r.created_at,
    }));
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to get dependents of ${moduleCode}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Validate the entire dependency graph for circular references and missing modules.
 * Returns errors if the graph is invalid.
 */
export async function validateDependencyGraph(): Promise<DependencyValidationResult> {
  const errors: DependencyError[] = [];

  try {
    // Check for circular dependencies using recursive CTE with cycle detection
    const cycleResult = await query(
      `WITH RECURSIVE dep_tree AS (
         SELECT module_code, depends_on, ARRAY[module_code] AS path, FALSE AS is_cycle
         FROM module_dependencies
       UNION ALL
         SELECT md.module_code, md.depends_on, dt.path || md.module_code,
                md.module_code = ANY(dt.path) AS is_cycle
         FROM module_dependencies md
         JOIN dep_tree dt ON md.module_code = dt.depends_on
         WHERE NOT md.module_code = ANY(dt.path)
       )
       SELECT DISTINCT path || depends_on AS cycle_path
       FROM dep_tree
       WHERE is_cycle = TRUE`,
      [],
    );

    for (const row of cycleResult.rows) {
      const cyclePath: string[] = row.cycle_path || [];
      errors.push({
        type: 'circular',
        modules: cyclePath,
        message: `Circular dependency detected: ${cyclePath.join(' -> ')}`,
      });
    }

    // Check for dependencies on non-existent modules
    const missingResult = await query(
      `SELECT md.module_code, md.depends_on
       FROM module_dependencies md
       LEFT JOIN platform_modules pm ON pm.code = md.depends_on
       WHERE pm.code IS NULL`,
      [],
    );

    for (const row of missingResult.rows) {
      errors.push({
        type: 'missing',
        modules: [row.module_code, row.depends_on],
        message: `Module '${row.module_code}' depends on non-existent module '${row.depends_on}'`,
      });
    }

    // Check for self-references
    const selfRefResult = await query(
      `SELECT module_code FROM module_dependencies WHERE module_code = depends_on`,
      [],
    );

    for (const row of selfRefResult.rows) {
      errors.push({
        type: 'self_reference',
        modules: [row.module_code],
        message: `Module '${row.module_code}' depends on itself`,
      });
    }

    return { isValid: errors.length === 0, errors };
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to validate dependency graph: ${(err as Error).message}`);
    return {
      isValid: false,
      errors: [{ type: 'circular', modules: [], message: `Validation failed: ${(err as Error).message}` }],
    };
  }
}

/**
 * Check whether a module can be safely disabled without breaking active required dependents.
 */
export async function canDisableModule(moduleCode: string): Promise<{ canDisable: boolean; blockers: string[] }> {
  try {
    // Find active modules that have a required dependency on this module
    const result = await query(
      `SELECT DISTINCT md.module_code
       FROM module_dependencies md
       JOIN platform_modules pm ON pm.code = md.module_code AND pm.is_active = TRUE
       WHERE md.depends_on = $1 AND md.dependency_type = 'required'`,
      [moduleCode],
    );

    const blockers = result.rows.map((r: any) => r.module_code as string);
    return {
      canDisable: blockers.length === 0,
      blockers,
    };
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to check disable safety for ${moduleCode}: ${(err as Error).message}`);
    // Deny by default (Law 11)
    return { canDisable: false, blockers: [`Error checking dependents: ${(err as Error).message}`] };
  }
}

/**
 * Compute topological sort of all modules for activation order.
 * Modules with no dependencies come first; dependents come after their dependencies.
 */
export async function getActivationOrder(): Promise<string[]> {
  try {
    const result = await query(
      `WITH RECURSIVE topo AS (
         -- Modules with no dependencies (roots)
         SELECT pm.code, 0 AS depth
         FROM platform_modules pm
         WHERE pm.is_active = TRUE
           AND NOT EXISTS (
             SELECT 1 FROM module_dependencies md
             WHERE md.module_code = pm.code AND md.dependency_type = 'required'
           )
       UNION ALL
         SELECT md.module_code AS code, t.depth + 1 AS depth
         FROM module_dependencies md
         JOIN topo t ON md.depends_on = t.code
         WHERE md.dependency_type = 'required'
           AND t.depth < 50
       )
       SELECT code, MAX(depth) AS max_depth
       FROM topo
       GROUP BY code
       ORDER BY max_depth, code`,
      [],
    );

    return result.rows.map((r: any) => r.code as string);
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to compute activation order: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Remove a dependency between two modules.
 */
export async function removeDependency(moduleCode: string, dependsOn: string): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM module_dependencies WHERE module_code = $1 AND depends_on = $2`,
      [moduleCode, dependsOn],
    );
    const removed = (result.rowCount ?? 0) > 0;
    if (removed) {
      logger.info(`[ModuleDependency] Removed: ${moduleCode} -> ${dependsOn}`);
    }
    return removed;
  } catch (err) {
    logger.error(`[ModuleDependency] Failed to remove ${moduleCode} -> ${dependsOn}: ${(err as Error).message}`);
    return false;
  }
}

export const moduleDependencyService = {
  registerDependency,
  getDependencies,
  getTransitiveDependencies,
  getDependents,
  validateDependencyGraph,
  canDisableModule,
  getActivationOrder,
  removeDependency,
};
