// @ts-nocheck
// @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
// ============================================
// Shahin — Tenant Configuration Service
// Configuration CRUD (org structure, sectors,
// RACI, routing, frequencies, evidence config,
// risk model, exception policy), schema
// validation, versioning with rollback, sector
// change recalculation, round-trip serialization,
// and required field enforcement
// ============================================

import { safeQuery, tenantSchema } from '../../../config/database/database';
import { resolvePacksForSectors } from '../../../modules/platform/services/tenant/content-pack.service';
// Types — GPOC §9.2 Tenant Config Schema
// Typed interface with index signature for backward compatibility
// with existing stored JSON configs.

export interface OrgEntity {
  entityId: string;
  nameEn: string;
  nameAr?: string;
  parentId?: string | null;
  [key: string]: unknown;
}

export interface RACIEntry {
  controlId: string;
  responsible: string;
  accountable: string;
  consulted?: string[];
  informed?: string[];
  [key: string]: unknown;
}

export interface ApprovalRoute {
  routeId: string;
  entityType: string;
  approverChain: string[];
  [key: string]: unknown;
}

export interface CadenceOverride {
  controlId: string;
  frequency: 'monthly' | 'quarterly' | 'annually' | 'continuous';
  [key: string]: unknown;
}

export interface EvidenceConfig {
  storageLocation: string;
  maxFileSizeMb: number;
  allowedFormats: string[];
  [key: string]: unknown;
}

export interface RiskScoringModel {
  modelId: string;
  dimensions: Array<{ name: string; weight: number; scale: { min: number; max: number } }>;
  thresholds: Record<string, number>;
  formula?: string;
  [key: string]: unknown;
}

export interface ExceptionPolicy {
  maxDurationDays: number;
  renewalLimit: number;
  expiryWarningDays: number;
  [key: string]: unknown;
}

/**
 * Typed tenant configuration — GPOC §9.2.
 * Core GPOC fields are typed; domain-specific fields from existing configs
 * are preserved via index signature for backward compatibility.
 */
export interface TenantConfig {
  // --- GPOC §9.2 required fields ---
  tenantId?: string;
  tenantCode?: string;
  workspaceCode?: string;
  enabledProducts?: string[];
  enabledModules?: string[];
  locale?: 'en' | 'ar';
  timezone?: string;
  theme?: string;
  allowedProviders?: string[];
  allowedModels?: string[];
  onboardingMode?: 'manual' | 'guided' | 'assisted' | 'automated';
  workflowProfiles?: string[];
  featureFlags?: Record<string, boolean>;
  retentionProfile?: string;
  supportTier?: string;

  // --- Existing domain config sections ---
  orgStructure?: OrgEntity[];
  sectors?: string[];
  raciMatrix?: RACIEntry[];
  approvalRouting?: ApprovalRoute[];
  cadenceOverrides?: CadenceOverride[];
  evidenceConfig?: EvidenceConfig;
  riskScoringModel?: RiskScoringModel;
  exceptionPolicy?: ExceptionPolicy;

  // --- Versioning (set at runtime) ---
  version?: number;

  // --- Backward compatibility for existing stored JSON ---
  [key: string]: unknown;
}

type ValidationResult = { valid: boolean; errors?: string[] };
import { getFirstRow } from '../../../shared/data/db-utils';
import type { GenericRow } from '../../../types/db-rows.types';

// === Constants ===

/**
 * Required top-level fields that must be present for a tenant config to be valid.
 * Maps to Requirement 14.6: orgName → orgStructure with at least one entity,
 * sectors → at least one sector, raciMatrix → at least one entry.
 */
export const REQUIRED_CONFIG_FIELDS: string[] = [
  "orgStructure",
  "sectors",
  "raciMatrix",
];

/**
 * All recognised config section keys.
 */
const __CONFIG_SECTIONS = [
  "orgStructure",
  "sectors",
  "raciMatrix",
  "approvalRouting",
  "cadenceOverrides",
  "evidenceConfig",
  "riskScoringModel",
  "exceptionPolicy",
] as const;

// === Pure Functions ===

/**
 * Validate a tenant configuration object against the schema definition.
 * Returns { valid, errors } — pure function for property-based testing.
 *
 * Validates: Requirements 14.2, 14.6
 */
export function validateTenantConfig(
  config: Partial<TenantConfig>,
): ValidationResult {
  const errors: string[] = [];

  // --- Required field enforcement (Req 14.6) ---
  // orgStructure must be a non-empty array
  if (
    !config.orgStructure ||
    !Array.isArray(config.orgStructure) ||
    config.orgStructure.length === 0
  ) {
    errors.push("orgStructure is required and must contain at least one entity");
  } else {
    // Validate each OrgEntity has required fields
    for (let i = 0; i < config.orgStructure.length; i++) {
      const entity = config.orgStructure[i];
      if (!entity.entityId || typeof entity.entityId !== "string") {
        errors.push(`orgStructure[${i}].entityId is required`);
      }
      if (!entity.nameEn || typeof entity.nameEn !== "string") {
        errors.push(`orgStructure[${i}].nameEn is required`);
      }
    }
  }

  // sectors must be a non-empty array of strings
  if (
    !config.sectors ||
    !Array.isArray(config.sectors) ||
    config.sectors.length === 0
  ) {
    errors.push("sectors is required and must contain at least one sector");
  } else {
    for (let i = 0; i < config.sectors.length; i++) {
      if (typeof config.sectors[i] !== "string" || config.sectors[i].trim() === "") {
        errors.push(`sectors[${i}] must be a non-empty string`);
      }
    }
  }

  // raciMatrix must be a non-empty array
  if (
    !config.raciMatrix ||
    !Array.isArray(config.raciMatrix) ||
    config.raciMatrix.length === 0
  ) {
    errors.push("raciMatrix is required and must contain at least one entry");
  } else {
    for (let i = 0; i < config.raciMatrix.length; i++) {
      const entry = config.raciMatrix[i];
      if (!entry.controlId || typeof entry.controlId !== "string") {
        errors.push(`raciMatrix[${i}].controlId is required`);
      }
      if (!entry.responsible || typeof entry.responsible !== "string") {
        errors.push(`raciMatrix[${i}].responsible is required`);
      }
      if (!entry.accountable || typeof entry.accountable !== "string") {
        errors.push(`raciMatrix[${i}].accountable is required`);
      }
    }
  }

  // --- Optional section validation ---

  // approvalRouting — if present, validate structure
  if (config.approvalRouting) {
    if (!Array.isArray(config.approvalRouting)) {
      errors.push("approvalRouting must be an array");
    } else {
      for (let i = 0; i < config.approvalRouting.length; i++) {
        const route = config.approvalRouting[i];
        if (!route.routeId) {
          errors.push(`approvalRouting[${i}].routeId is required`);
        }
        if (!route.entityType) {
          errors.push(`approvalRouting[${i}].entityType is required`);
        }
        if (!Array.isArray(route.approverChain) || route.approverChain.length === 0) {
          errors.push(`approvalRouting[${i}].approverChain must be a non-empty array`);
        }
      }
    }
  }

  // cadenceOverrides — if present, validate structure
  if (config.cadenceOverrides) {
    if (!Array.isArray(config.cadenceOverrides)) {
      errors.push("cadenceOverrides must be an array");
    } else {
      const validFrequencies = ["monthly", "quarterly", "annually", "continuous"];
      for (let i = 0; i < config.cadenceOverrides.length; i++) {
        const override = config.cadenceOverrides[i];
        if (!override.controlId) {
          errors.push(`cadenceOverrides[${i}].controlId is required`);
        }
        if (!validFrequencies.includes(override.frequency)) {
          errors.push(
            `cadenceOverrides[${i}].frequency must be one of: ${validFrequencies.join(", ")}`,
          );
        }
      }
    }
  }

  // evidenceConfig — if present, validate structure
  if (config.evidenceConfig) {
    const ec = config.evidenceConfig as any;
    if (!ec.storageLocation || typeof ec.storageLocation !== "string") {
      errors.push("evidenceConfig.storageLocation is required");
    }
    if (typeof ec.maxFileSizeMb !== "number" || ec.maxFileSizeMb <= 0) {
      errors.push("evidenceConfig.maxFileSizeMb must be a positive number");
    }
    if (!Array.isArray(ec.allowedFormats) || ec.allowedFormats.length === 0) {
      errors.push("evidenceConfig.allowedFormats must be a non-empty array");
    }
  }

  // riskScoringModel — if present, validate structure
  if (config.riskScoringModel) {
    const rm = config.riskScoringModel as any;
    if (!rm.modelId || typeof rm.modelId !== "string") {
      errors.push("riskScoringModel.modelId is required");
    }
    if (!Array.isArray(rm.dimensions) || rm.dimensions.length === 0) {
      errors.push("riskScoringModel.dimensions must be a non-empty array");
    }
    if (!rm.thresholds) {
      errors.push("riskScoringModel.thresholds is required");
    }
  }

  // exceptionPolicy — if present, validate structure
  if (config.exceptionPolicy) {
    const ep = config.exceptionPolicy as any;
    if (typeof ep.maxDurationDays !== "number" || ep.maxDurationDays <= 0) {
      errors.push("exceptionPolicy.maxDurationDays must be a positive number");
    }
    if (typeof ep.renewalLimit !== "number" || ep.renewalLimit < 0) {
      errors.push("exceptionPolicy.renewalLimit must be a non-negative number");
    }
    if (typeof ep.expiryWarningDays !== "number" || ep.expiryWarningDays <= 0) {
      errors.push("exceptionPolicy.expiryWarningDays must be a positive number");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Serialize a TenantConfig to a JSON string.
 * Pure function for property-based testing (round-trip).
 *
 * Validates: Requirements 14.5
 */
export function serializeConfig(config: TenantConfig): string {
  return JSON.stringify(config);
}

/**
 * Deserialize a JSON string back to a TenantConfig object.
 * Pure function for property-based testing (round-trip).
 *
 * Validates: Requirements 14.5
 */
export function deserializeConfig(json: string): TenantConfig {
  return JSON.parse(json) as TenantConfig;
}

// === Database Functions ===

/**
 * Get the current tenant configuration.
 * Reads the latest version from tenant_config_versions.
 *
 * Validates: Requirements 14.1
 */
export async function getConfig(tenantId: string): Promise<TenantConfig | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config, version_number
     FROM ${schema}.tenant_config_versions
     ORDER BY version_number DESC
     LIMIT 1`,
  );
  if (result.rows.length === 0) return null;
  const row = getFirstRow(result);
  const config = row.config as TenantConfig;
  config.tenantId = tenantId;
  config.version = row.version_number;
  return config;
}

/**
 * Update tenant configuration with a partial patch.
 * Creates a new version entry, merging the patch into the current config.
 * If sectors change, triggers content pack recalculation.
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4
 */
export async function updateConfig(
  tenantId: string,
  patch: Partial<TenantConfig>,
  updatedBy: string,
): Promise<{
  config: TenantConfig;
  sectorChanges?: { added: string[]; removed: string[]; packs: unknown[] };
}> {
  const schema = tenantSchema(tenantId);

  // Get current config (or build a default)
  const current = await getConfig(tenantId);
  const currentVersion = (current?.version as number) ?? 0;

  // Merge patch into current config
  const merged: TenantConfig = {
    tenantId,
    version: currentVersion + 1,
    orgStructure: patch.orgStructure ?? current?.orgStructure ?? [],
    sectors: patch.sectors ?? current?.sectors ?? [],
    raciMatrix: patch.raciMatrix ?? current?.raciMatrix ?? [],
    approvalRouting: patch.approvalRouting ?? current?.approvalRouting ?? [],
    cadenceOverrides: patch.cadenceOverrides ?? current?.cadenceOverrides ?? [],
    evidenceConfig: patch.evidenceConfig ?? current?.evidenceConfig ?? {
      storageLocation: "local",
      maxFileSizeMb: 50,
      allowedFormats: ["pdf", "xlsx", "docx", "png", "jpg"],
    },
    riskScoringModel: patch.riskScoringModel ?? current?.riskScoringModel ?? {
      modelId: "default",
      dimensions: [],
      thresholds: { critical: 20, high: 15, medium: 10, low: 5 },
      formula: "multiplicative" as any,
    },
    exceptionPolicy: patch.exceptionPolicy ?? current?.exceptionPolicy ?? {
      maxDurationDays: 90,
      renewalLimit: 3,
      expiryWarningDays: 30,
    },
  };

  // Validate the merged config
  const validation = validateTenantConfig(merged);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join!("; ")}`);
  }

  // Detect sector changes for recalculation (Req 14.4)
  const previousSectors = (current?.sectors ?? []) as string[];
  const newSectors = (merged.sectors ?? []) as string[];
  const sectorsChanged =
    JSON.stringify([...previousSectors].sort()) !==
    JSON.stringify([...newSectors].sort());

  // Store the new version
  await safeQuery(
    `INSERT INTO ${schema}.tenant_config_versions
       (version_number, config, changed_by, changed_at)
     VALUES ($1, $2, $3, NOW())`,
    [merged.version, JSON.stringify(merged), updatedBy],
  );

  // If sectors changed, recalculate applicable content packs
  let sectorChanges: { added: string[]; removed: string[]; packs: unknown[] } | undefined;
  if (sectorsChanged) {
    const added = newSectors.filter((s) => !previousSectors.includes(s));
    const removed = previousSectors.filter((s) => !newSectors.includes(s));
    const packs = await resolvePacksForSectors(newSectors);
    sectorChanges = { added, removed, packs };
  }

  return { config: merged, sectorChanges };
}

/**
 * Rollback tenant configuration to a specific version number.
 * Creates a new version entry with the snapshot from the target version.
 *
 * Validates: Requirements 14.3
 */
export async function rollbackConfig(
  tenantId: string,
  targetVersion: number,
): Promise<TenantConfig> {
  const schema = tenantSchema(tenantId);

  // Fetch the target version snapshot
  const result = await safeQuery(
    `SELECT config, version_number
     FROM ${schema}.tenant_config_versions
     WHERE version_number = $1`,
    [targetVersion],
  );
  if (result.rows.length === 0) {
    throw new Error(`Version ${targetVersion} not found`);
  }

  // Get current latest version number
  const latestResult = await safeQuery(
    `SELECT COALESCE(MAX(version_number), 0) AS max_version
     FROM ${schema}.tenant_config_versions`,
  );
  const latestVersion = getFirstRow(latestResult)?.max_version;
  const newVersion = latestVersion + 1;

  // Re-insert the old config as a new version (rollback creates a new entry)
  const oldConfig = getFirstRow(result)?.config as TenantConfig;
  oldConfig.version = newVersion;
  oldConfig.tenantId = tenantId;

  await safeQuery(
    `INSERT INTO ${schema}.tenant_config_versions
       (version_number, config, changed_by, changed_at)
     VALUES ($1, $2, $3, NOW())`,
    [newVersion, JSON.stringify(oldConfig), "system:rollback"],
  );

  return oldConfig;
}

/**
 * Get the full configuration version history for a tenant.
 *
 * Validates: Requirements 14.3
 */
export async function getConfigHistory(
  tenantId: string,
): Promise<
  Array<{
    versionNumber: number;
    config: TenantConfig;
    changedBy: string;
    changedAt: string;
  }>
> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT version_number, config, changed_by, changed_at
     FROM ${schema}.tenant_config_versions
     ORDER BY version_number ASC`,
  );
  return result.rows.map((row: GenericRow) => ({
    versionNumber: row.version_number,
    config: row.config as TenantConfig,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
  }));
}
/**
 * Build tenant configuration from an intelligence report generated during onboarding.
 * Maps report fields → TenantConfig fields per the seeding specification.
 *
 * Validates: Requirements 14.1, 14.2
 */
export async function buildConfigFromReport(
  report: {
    overallScore: number;
    categoryScores: { category: string; label_en: string; score: number }[];
    frameworkRecommendations: {
      instrument_id?: string; framework_id?: string; name: string;
      regulator?: string; priority: 'mandatory' | 'recommended' | 'optional';
      mandatory?: boolean;
    }[];
    workspaceConfig: {
      enabledModules: string[];
      suggestedPhase: string;
      riskProfile: 'low' | 'medium' | 'high' | 'critical';
      scopeDimensions: { type: string; values: string[] }[];
      priorityAreas: string[];
    };
  },
  tenantId: string,
  userId: string,
): Promise<{ config: TenantConfig; sectorChanges?: unknown }> {
  const wc = report.workspaceConfig;

  // 1. orgStructure from scopeDimensions
  const orgStructure: OrgEntity[] = wc.scopeDimensions.flatMap((dim) =>
    dim.values.map((v, i) => ({
      entityId: `${dim.type}-${i + 1}`,
      nameEn: v,
      nameAr: v,
      parentId: i === 0 ? null : `${dim.type}-1`,
    })),
  );
  // Ensure at least one entity
  if (orgStructure.length === 0) {
    orgStructure.push({ entityId: 'hq-1', nameEn: 'Headquarters', nameAr: 'المقر الرئيسي', parentId: null });
  }

  // 2. sectors from mandatory framework regulators
  const sectorSet = new Set<string>();
  for (const fw of report.frameworkRecommendations) {
    if (fw.priority === 'mandatory' || fw.mandatory) {
      if (fw.regulator) sectorSet.add(fw.regulator);
    }
  }
  const sectors = sectorSet.size > 0 ? Array.from(sectorSet) : ['general'];

  // 3. raciMatrix — one entry per domain category
  const domainCategories = report.categoryScores
    .filter((c) => c.category !== 'org_profile')
    .map((c) => c.category);
  const raciMatrix: RACIEntry[] = domainCategories.map((cat) => ({
    controlId: `domain-${cat}`,
    responsible: userId,
    accountable: userId,
    consulted: [],
    informed: [],
  }));
  // Ensure at least one entry
  if (raciMatrix.length === 0) {
    raciMatrix.push({ controlId: 'domain-general', responsible: userId, accountable: userId, consulted: [], informed: [] });
  }

  // 4. cadenceOverrides from framework priority
  const cadenceOverrides: CadenceOverride[] = report.frameworkRecommendations
    .filter((fw) => fw.priority === 'mandatory' || fw.priority === 'recommended')
    .map((fw) => ({
      controlId: fw.instrument_id || fw.framework_id || fw.name,
      frequency: (fw.priority === 'mandatory' ? 'monthly' : 'quarterly') as 'monthly' | 'quarterly',
    }));

  // 5. riskScoringModel thresholds from risk profile
  const thresholdMap: Record<string, { critical: number; high: number; medium: number; low: number }> = {
    critical: { critical: 15, high: 10, medium: 6, low: 2 },
    high:     { critical: 18, high: 12, medium: 8, low: 3 },
    medium:   { critical: 20, high: 15, medium: 10, low: 5 },
    low:      { critical: 22, high: 18, medium: 12, low: 6 },
  };
  const riskScoringModel: RiskScoringModel = {
    modelId: 'onboarding-derived',
    dimensions: [
      { name: 'likelihood', weight: 1, scale: { min: 1, max: 5 } },
      { name: 'impact', weight: 1, scale: { min: 1, max: 5 } },
    ],
    thresholds: thresholdMap[wc.riskProfile] || thresholdMap.medium,
    formula: 'multiplicative',
  };

  // 6. exceptionPolicy from overall score
  const score = report.overallScore;
  const exceptionPolicy: ExceptionPolicy = {
    maxDurationDays: score >= 70 ? 90 : score >= 50 ? 60 : 30,
    renewalLimit: score >= 70 ? 3 : score >= 50 ? 2 : 1,
    expiryWarningDays: 14,
  };

  // 7. approvalRouting — add privacy route if privacy score is low
  const approvalRouting: ApprovalRoute[] = [];
  const privacyScore = report.categoryScores.find((c) => c.category === 'privacy');
  if (privacyScore && privacyScore.score < 50) {
    approvalRouting.push({
      routeId: 'privacy-data-change',
      entityType: 'policy',
      approverChain: [userId],
    });
  }

  // 8. Persist via updateConfig (creates version 1)
  return updateConfig(tenantId, {
    orgStructure,
    sectors,
    raciMatrix,
    approvalRouting,
    cadenceOverrides,
    evidenceConfig: {
      storageLocation: 'local',
      maxFileSizeMb: 50,
      allowedFormats: ['pdf', 'xlsx', 'docx', 'png', 'jpg'],
    },
    riskScoringModel,
    exceptionPolicy,
  }, userId);
}


