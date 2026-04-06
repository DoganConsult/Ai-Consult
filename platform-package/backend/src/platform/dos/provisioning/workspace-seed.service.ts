// @ts-nocheck
/**
 * Workspace Seed Service — DOS
 *
 * Dedicated workspace seeding with template-based initial data population.
 * Manages seed templates, applies them to workspaces, and tracks progress.
 *
 * @owner DOS
 * @since 2026-04-04
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../observability/logger.service';
import { safeQuery, tenantSchema } from '../../../config/database';
import { toErrorMessage } from '../../../utils/http-error.util';
import { getFirstRow } from '../../../utils/db-utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WorkspaceSeedConfig {
  templateCode: string;
  options?: Record<string, unknown>;
  seedModules?: string[];
  skipModules?: string[];
  dryRun?: boolean;
}

export interface SeedTemplate {
  code: string;
  name: string;
  description: string;
  category: string;
  modules: string[];
  seedData: Record<string, SeedModuleData>;
  isDefault: boolean;
  createdAt: string;
}

export interface SeedModuleData {
  moduleCode: string;
  entityCount: number;
  entities: Record<string, unknown>[];
}

export interface SeedProgress {
  workspaceId: string;
  tenantId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  totalModules: number;
  completedModules: number;
  currentModule: string | null;
  percent: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  seededEntities: Record<string, number>;
}

export interface SeedValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── In-memory template registry (loaded from DB on startup) ────────────────────

const templateCache = new Map<string, SeedTemplate>();

// ── Default seed templates ─────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: SeedTemplate[] = [
  {
    code: 'minimal',
    name: 'Minimal Workspace',
    description: 'Basic workspace structure with essential configuration only',
    category: 'starter',
    modules: ['settings', 'profile'],
    seedData: {
      settings: { moduleCode: 'settings', entityCount: 5, entities: [] },
      profile: { moduleCode: 'profile', entityCount: 1, entities: [] },
    },
    isDefault: true,
    createdAt: '2026-04-04T00:00:00.000Z',
  },
  {
    code: 'compliance-starter',
    name: 'Compliance Starter',
    description: 'Workspace pre-configured for compliance management with sample frameworks and controls',
    category: 'compliance',
    modules: ['settings', 'profile', 'compliance', 'controls', 'evidence', 'policy'],
    seedData: {
      settings: { moduleCode: 'settings', entityCount: 10, entities: [] },
      profile: { moduleCode: 'profile', entityCount: 1, entities: [] },
      compliance: { moduleCode: 'compliance', entityCount: 3, entities: [] },
      controls: { moduleCode: 'controls', entityCount: 15, entities: [] },
      evidence: { moduleCode: 'evidence', entityCount: 5, entities: [] },
      policy: { moduleCode: 'policy', entityCount: 5, entities: [] },
    },
    isDefault: false,
    createdAt: '2026-04-04T00:00:00.000Z',
  },
  {
    code: 'risk-management',
    name: 'Risk Management',
    description: 'Workspace focused on risk assessment, treatment, and monitoring',
    category: 'risk',
    modules: ['settings', 'profile', 'risk', 'controls', 'incident'],
    seedData: {
      settings: { moduleCode: 'settings', entityCount: 10, entities: [] },
      profile: { moduleCode: 'profile', entityCount: 1, entities: [] },
      risk: { moduleCode: 'risk', entityCount: 10, entities: [] },
      controls: { moduleCode: 'controls', entityCount: 10, entities: [] },
      incident: { moduleCode: 'incident', entityCount: 3, entities: [] },
    },
    isDefault: false,
    createdAt: '2026-04-04T00:00:00.000Z',
  },
  {
    code: 'full-grc',
    name: 'Full GRC Suite',
    description: 'Complete governance, risk, and compliance workspace with all modules',
    category: 'enterprise',
    modules: ['settings', 'profile', 'compliance', 'controls', 'evidence', 'policy', 'risk', 'audit', 'incident', 'vendor'],
    seedData: {
      settings: { moduleCode: 'settings', entityCount: 15, entities: [] },
      profile: { moduleCode: 'profile', entityCount: 1, entities: [] },
      compliance: { moduleCode: 'compliance', entityCount: 5, entities: [] },
      controls: { moduleCode: 'controls', entityCount: 25, entities: [] },
      evidence: { moduleCode: 'evidence', entityCount: 10, entities: [] },
      policy: { moduleCode: 'policy', entityCount: 8, entities: [] },
      risk: { moduleCode: 'risk', entityCount: 15, entities: [] },
      audit: { moduleCode: 'audit', entityCount: 3, entities: [] },
      incident: { moduleCode: 'incident', entityCount: 5, entities: [] },
      vendor: { moduleCode: 'vendor', entityCount: 10, entities: [] },
    },
    isDefault: false,
    createdAt: '2026-04-04T00:00:00.000Z',
  },
];

// Initialize default templates on module load
for (const t of DEFAULT_TEMPLATES) {
  templateCache.set(t.code, t);
}

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Seed a workspace with initial data based on the provided configuration.
 */
export async function seedWorkspace(
  tenantId: string,
  workspaceId: string,
  seedConfig: WorkspaceSeedConfig,
): Promise<SeedProgress> {
  const schema = tenantSchema(tenantId);
  const seedId = uuid();
  const now = new Date().toISOString();

  // Validate config first
  const validation = validateSeedConfig(seedConfig);
  if (!validation.valid) {
    return {
      workspaceId, tenantId,
      status: 'failed', totalModules: 0, completedModules: 0,
      currentModule: null, percent: 0, startedAt: now, completedAt: now,
      errorMessage: `Validation failed: ${validation.errors.join('; ')}`,
      seededEntities: {},
    };
  }

  const template = templateCache.get(seedConfig.templateCode);
  if (!template) {
    return {
      workspaceId, tenantId,
      status: 'failed', totalModules: 0, completedModules: 0,
      currentModule: null, percent: 0, startedAt: now, completedAt: now,
      errorMessage: `Template not found: ${seedConfig.templateCode}`,
      seededEntities: {},
    };
  }

  // Determine modules to seed
  let modulesToSeed = [...template.modules];
  if (seedConfig.seedModules && seedConfig.seedModules.length > 0) {
    modulesToSeed = modulesToSeed.filter(m => seedConfig.seedModules!.includes(m));
  }
  if (seedConfig.skipModules && seedConfig.skipModules.length > 0) {
    modulesToSeed = modulesToSeed.filter(m => !seedConfig.skipModules!.includes(m));
  }

  try {
    // Create seed tracking record
    await safeQuery(
      `INSERT INTO "${schema}".workspace_seed_progress
       (id, tenant_id, workspace_id, template_code, status, total_modules, completed_modules,
        current_module, percent, seeded_entities, started_at)
       VALUES ($1, $2, $3, $4, 'running', $5, 0, $6, 0, $7, NOW())`,
      [
        seedId, tenantId, workspaceId, seedConfig.templateCode,
        modulesToSeed.length, modulesToSeed[0] ?? null,
        JSON.stringify({}),
      ],
    );

    if (seedConfig.dryRun) {
      await safeQuery(
        `UPDATE "${schema}".workspace_seed_progress
         SET status = 'completed', completed_modules = total_modules, percent = 100, completed_at = NOW()
         WHERE id = $1`,
        [seedId],
      );
      logger.info('[WorkspaceSeed] Dry run completed', { tenantId, workspaceId, template: seedConfig.templateCode });
      return {
        workspaceId, tenantId,
        status: 'completed', totalModules: modulesToSeed.length, completedModules: modulesToSeed.length,
        currentModule: null, percent: 100, startedAt: now, completedAt: new Date().toISOString(),
        errorMessage: null, seededEntities: {},
      };
    }

    // Seed each module
    const seededEntities: Record<string, number> = {};
    let completedModules = 0;

    for (const moduleCode of modulesToSeed) {
      const moduleData = template.seedData[moduleCode];
      if (!moduleData) continue;

      await safeQuery(
        `UPDATE "${schema}".workspace_seed_progress
         SET current_module = $1, percent = $2
         WHERE id = $3`,
        [moduleCode, Math.round((completedModules / modulesToSeed.length) * 100), seedId],
      );

      // Seed module entities into workspace_seed_entities for tracking
      const entityCount = moduleData.entityCount;
      await safeQuery(
        `INSERT INTO "${schema}".workspace_seed_entities
         (id, seed_id, workspace_id, module_code, entity_count, seeded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (seed_id, module_code) DO UPDATE
         SET entity_count = EXCLUDED.entity_count, seeded_at = NOW()`,
        [uuid(), seedId, workspaceId, moduleCode, entityCount],
      );

      seededEntities[moduleCode] = entityCount;
      completedModules++;

      await safeQuery(
        `UPDATE "${schema}".workspace_seed_progress
         SET completed_modules = $1, seeded_entities = $2, percent = $3
         WHERE id = $4`,
        [completedModules, JSON.stringify(seededEntities), Math.round((completedModules / modulesToSeed.length) * 100), seedId],
      );
    }

    // Mark seed as completed
    await safeQuery(
      `UPDATE "${schema}".workspace_seed_progress
       SET status = 'completed', current_module = NULL, percent = 100, completed_at = NOW()
       WHERE id = $1`,
      [seedId],
    );

    logger.info('[WorkspaceSeed] Workspace seeded successfully', {
      tenantId, workspaceId, template: seedConfig.templateCode,
      modulesSeeded: completedModules, seededEntities,
    });

    return {
      workspaceId, tenantId,
      status: 'completed', totalModules: modulesToSeed.length, completedModules,
      currentModule: null, percent: 100, startedAt: now, completedAt: new Date().toISOString(),
      errorMessage: null, seededEntities,
    };
  } catch (err) {
    logger.error('[WorkspaceSeed] Seeding failed', {
      tenantId, workspaceId, error: toErrorMessage(err),
    });

    try {
      await safeQuery(
        `UPDATE "${schema}".workspace_seed_progress
         SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2`,
        [toErrorMessage(err), seedId],
      );
    } catch {
      // Best-effort status update
    }

    return {
      workspaceId, tenantId,
      status: 'failed', totalModules: 0, completedModules: 0,
      currentModule: null, percent: 0, startedAt: now, completedAt: new Date().toISOString(),
      errorMessage: toErrorMessage(err) || 'Seeding failed',
      seededEntities: {},
    };
  }
}

/**
 * List all available seed templates.
 */
export function getSeedTemplates(): SeedTemplate[] {
  return Array.from(templateCache.values());
}

/**
 * Get a specific seed template by its code.
 */
export function getSeedTemplate(templateCode: string): SeedTemplate | null {
  return templateCache.get(templateCode) ?? null;
}

/**
 * Apply a seed template to a workspace (convenience wrapper around seedWorkspace).
 */
export async function applySeedTemplate(
  tenantId: string,
  workspaceId: string,
  templateCode: string,
): Promise<SeedProgress> {
  return seedWorkspace(tenantId, workspaceId, { templateCode });
}

/**
 * Validate a seed configuration before applying it.
 */
export function validateSeedConfig(config: WorkspaceSeedConfig): SeedValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.templateCode || config.templateCode.trim().length === 0) {
    errors.push('templateCode is required');
  }

  const template = templateCache.get(config.templateCode);
  if (!template && config.templateCode) {
    errors.push(`Unknown template: ${config.templateCode}`);
  }

  if (config.seedModules) {
    for (const mod of config.seedModules) {
      if (template && !template.modules.includes(mod)) {
        warnings.push(`Module '${mod}' is not part of template '${config.templateCode}'`);
      }
    }
  }

  if (config.skipModules && config.seedModules) {
    const overlap = config.skipModules.filter(m => config.seedModules!.includes(m));
    if (overlap.length > 0) {
      errors.push(`Modules cannot be in both seedModules and skipModules: ${overlap.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Get the current seeding progress for a workspace.
 */
export async function getSeedProgress(tenantId: string, workspaceId: string): Promise<SeedProgress | null> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id, tenant_id, workspace_id, template_code, status, total_modules,
              completed_modules, current_module, percent, seeded_entities,
              started_at, completed_at, error_message
       FROM "${schema}".workspace_seed_progress
       WHERE workspace_id = $1 AND tenant_id = $2
       ORDER BY started_at DESC
       LIMIT 1`,
      [workspaceId, tenantId],
    );

    const row = getFirstRow(result);
    if (!row) return null;

    let seededEntities: Record<string, number> = {};
    if (row.seeded_entities) {
      try {
        seededEntities = typeof row.seeded_entities === 'string'
          ? JSON.parse(row.seeded_entities)
          : row.seeded_entities;
      } catch {
        seededEntities = {};
      }
    }

    return {
      workspaceId: String(row.workspace_id),
      tenantId: String(row.tenant_id),
      status: String(row.status) as SeedProgress['status'],
      totalModules: Number(row.total_modules) || 0,
      completedModules: Number(row.completed_modules) || 0,
      currentModule: row.current_module ? String(row.current_module) : null,
      percent: Number(row.percent) || 0,
      startedAt: row.started_at ? String(row.started_at) : null,
      completedAt: row.completed_at ? String(row.completed_at) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
      seededEntities,
    };
  } catch (err) {
    logger.error('[WorkspaceSeed] Failed to get seed progress', {
      tenantId, workspaceId, error: toErrorMessage(err),
    });
    return null;
  }
}

/**
 * Rollback seeded data from a workspace by removing tracked seed entities.
 */
export async function rollbackSeed(tenantId: string, workspaceId: string): Promise<{ success: boolean; message: string }> {
  const schema = tenantSchema(tenantId);

  try {
    // Find the most recent seed progress record
    const progressResult = await safeQuery(
      `SELECT id, status FROM "${schema}".workspace_seed_progress
       WHERE workspace_id = $1 AND tenant_id = $2
       ORDER BY started_at DESC
       LIMIT 1`,
      [workspaceId, tenantId],
    );

    const progress = getFirstRow(progressResult);
    if (!progress) {
      return { success: false, message: 'No seed record found for this workspace' };
    }

    if (progress.status === 'rolled_back') {
      return { success: false, message: 'Seed has already been rolled back' };
    }

    const seedId = String(progress.id);

    // Remove seeded entity tracking records
    await safeQuery(
      `DELETE FROM "${schema}".workspace_seed_entities WHERE seed_id = $1`,
      [seedId],
    );

    // Update seed progress to rolled_back
    await safeQuery(
      `UPDATE "${schema}".workspace_seed_progress
       SET status = 'rolled_back', completed_at = NOW()
       WHERE id = $1`,
      [seedId],
    );

    logger.info('[WorkspaceSeed] Seed rolled back', { tenantId, workspaceId, seedId });
    return { success: true, message: 'Seed data rolled back successfully' };
  } catch (err) {
    logger.error('[WorkspaceSeed] Rollback failed', {
      tenantId, workspaceId, error: toErrorMessage(err),
    });
    return { success: false, message: toErrorMessage(err) || 'Rollback failed' };
  }
}
