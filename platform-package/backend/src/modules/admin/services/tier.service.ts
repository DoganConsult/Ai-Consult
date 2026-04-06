// @ts-nocheck
// Shahin - Tier Service & Go-To-Market Packaging
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { getFirstRow } from '../../../shared/data/db-utils';

export type TierLevel = 'starter' | 'scale' | 'continuous';

export interface TierDefinition {
  tier: TierLevel;
  nameEn: string;
  nameAr: string;
  features: string[];
  maxUsers: number;
  maxFrameworks: number;
}

export interface TierCheckResult {
  allowed: boolean;
  currentTier: TierLevel;
  requiredTier: TierLevel | null;
  feature: string;
}

export interface TierUsage {
  tier: TierLevel;
  users: number;
  maxUsers: number;
  frameworks: number;
  maxFrameworks: number;
  featuresUsed: string[];
}

// Feature sets per tier (cumulative: scale includes starter, continuous includes all)
const STARTER_FEATURES = [
  'governance', 'risk', 'compliance', 'audit', 'incidents', 'vendors',
  'bcp', 'evidence', 'workflows', 'registry', 'dashboard', 'reports_basic',
  'ai_basic', 'ucf_basic', 'lifecycle_basic', 'teams', 'qiyas',
];

const SCALE_FEATURES = [
  ...STARTER_FEATURES,
  'connectors', 'cadence', 'teams', 'assessment_templates',
  'risk_scoring_advanced', 'evidence_catalog', 'exception_governance',
  'workflow_templates', 'reports_advanced', 'ai_copilot',
];

const CONTINUOUS_FEATURES = [
  ...SCALE_FEATURES,
  'reports_scheduled', 'exception_analytics', 'vendor_automation',
  'multi_entity', 'digital_twin', 'red_team', 'privacy_ops',
  'board_view', 'evidence_pack_export', 'maturity_scorecard',
  'content_packs_custom', 'api_integrations',
];

export const TIER_DEFINITIONS: Record<TierLevel, TierDefinition> = {
  starter: {
    tier: 'starter',
    nameEn: 'Starter',
    nameAr: 'Asasi',
    features: STARTER_FEATURES,
    maxUsers: 10,
    maxFrameworks: 5,
  },
  scale: {
    tier: 'scale',
    nameEn: 'Scale',
    nameAr: 'Mutaqaddim',
    features: SCALE_FEATURES,
    maxUsers: 50,
    maxFrameworks: 20,
  },
  continuous: {
    tier: 'continuous',
    nameEn: 'Continuous',
    nameAr: 'Mustamirr',
    features: CONTINUOUS_FEATURES,
    maxUsers: -1, // unlimited
    maxFrameworks: -1,
  },
};

const TIER_ORDER: TierLevel[] = ['starter', 'scale', 'continuous'];

/** Get the minimum tier required for a feature */
export function getRequiredTier(feature: string): TierLevel | null {
  for (const tier of TIER_ORDER) {
    if (TIER_DEFINITIONS[tier].features.includes(feature)) return tier;
  }
  return null;
}

/** Check if a tier has access to a feature */
export function checkFeatureAccess(currentTier: TierLevel, feature: string): TierCheckResult {
  const def = TIER_DEFINITIONS[currentTier];
  const allowed = def.features.includes(feature);
  return {
    allowed,
    currentTier,
    requiredTier: allowed ? null : getRequiredTier(feature),
    feature,
  };
}

/** Compare tier levels: returns -1, 0, or 1 */
export function compareTiers(a: TierLevel, b: TierLevel): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}

/** Check if upgrade is valid (can only go up) */
export function isValidUpgrade(from: TierLevel, to: TierLevel): boolean {
  return compareTiers(from, to) < 0;
}

/** Get tenant tier from DB */
export async function getTenantTier(tenantId: string): Promise<TierLevel> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT tier FROM ${schema}.tenant_config_versions ORDER BY version DESC LIMIT 1`
    );
    if (res.rows.length > 0 && getFirstRow(res)?.tier) return getFirstRow(res)?.tier;
  } catch { /* table may not exist yet */ }
  return 'continuous'; // default — all features enabled until explicit tier assignment
}

/** Upgrade tenant tier (no data migration needed) */
export async function upgradeTier(tenantId: string, newTier: TierLevel): Promise<{ success: boolean; tier: TierLevel }> {
  const current = await getTenantTier(tenantId);
  if (!isValidUpgrade(current, newTier)) {
    return { success: false, tier: current };
  }
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO ${schema}.tenant_config_versions (config, tier, version)
     VALUES ($1::jsonb, $2, (SELECT COALESCE(MAX(version),0)+1 FROM ${schema}.tenant_config_versions))`,
    [JSON.stringify({ upgradedFrom: current }), newTier]
  );
  return { success: true, tier: newTier };
}

/** Get tier usage stats */
export async function getTierUsage(tenantId: string): Promise<TierUsage> {
  const tier = await getTenantTier(tenantId);
  const def = TIER_DEFINITIONS[tier];
  const schema = tenantSchema(tenantId);
  let users = 0, frameworks = 0;
  try {
    const uRes = await safeQuery(`SELECT COUNT(*) FROM ${schema}.users`);
    users = parseInt(getFirstRow(uRes)?.count, 10);
    const fRes = await safeQuery(`SELECT COUNT(*) FROM ${schema}.active_frameworks`);
    frameworks = parseInt(getFirstRow(fRes)?.count, 10);
  } catch { /* tables may not exist */ }
  return {
    tier,
    users,
    maxUsers: def.maxUsers,
    frameworks,
    maxFrameworks: def.maxFrameworks,
    featuresUsed: def.features,
  };
}

/** Check if downgrade is valid (can only go down) */
export function isValidDowngrade(from: TierLevel, to: TierLevel): boolean {
  return compareTiers(from, to) > 0;
}

export interface DowngradeViolation {
  resource: string;
  current: number;
  targetLimit: number;
}

/** Check if current usage fits within target tier limits */
export async function getDowngradeViolations(tenantId: string, targetTier: TierLevel): Promise<DowngradeViolation[]> {
  const targetDef = TIER_DEFINITIONS[targetTier];
  const violations: DowngradeViolation[] = [];
  const schema = tenantSchema(tenantId);

  try {
    const uRes = await safeQuery(`SELECT COUNT(*)::int AS count FROM public.users WHERE tenant_id = $1`, [tenantId]);
    const userCount = getFirstRow(uRes)?.count || 0;
    if (targetDef.maxUsers !== -1 && userCount > targetDef.maxUsers) {
      violations.push({ resource: 'users', current: userCount, targetLimit: targetDef.maxUsers });
    }
  } catch { /* skip */ }

  try {
    const fRes = await safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".frameworks`);
    const fwCount = getFirstRow(fRes)?.count || 0;
    if (targetDef.maxFrameworks !== -1 && fwCount > targetDef.maxFrameworks) {
      violations.push({ resource: 'frameworks', current: fwCount, targetLimit: targetDef.maxFrameworks });
    }
  } catch { /* skip */ }

  return violations;
}

/** Get normalized tier limits for a given tier */
export function getTierLimits(tier: TierLevel): { maxUsers: number; maxFrameworks: number; features: string[] } {
  const def = TIER_DEFINITIONS[tier];
  return { maxUsers: def.maxUsers, maxFrameworks: def.maxFrameworks, features: def.features };
}

/** Get all tier definitions */
export function getAllTierDefinitions(): TierDefinition[] {
  return TIER_ORDER.map(t => TIER_DEFINITIONS[t]);
}
