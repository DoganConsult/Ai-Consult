// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';
import { CANONICAL_AGRC_MODULE_CODES } from '../../../../config/canonical-modules';

export interface ModuleEntitlement {
  moduleCode: string;
  isEntitled: boolean;
  tierRequired: 'starter' | 'professional' | 'enterprise' | 'custom';
  entitledAt: string | null;
  expiresAt: string | null;
  maxUsers: number | null;
  featureFlags: Record<string, unknown>;
}

const entitlementCache = new Map<string, { entries: ModuleEntitlement[]; ts: number }>();
const CACHE_TTL = 120_000;

export async function getModuleEntitlements(tenantId: string): Promise<ModuleEntitlement[]> {
  const cached = entitlementCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.entries;

  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".module_entitlements ORDER BY module_code`,
  );

  const entries = rows.map(mapEntitlement);
  entitlementCache.set(tenantId, { entries, ts: Date.now() });
  return entries;
}

export async function isModuleEntitled(tenantId: string, moduleCode: string): Promise<boolean> {
  const entries = await getModuleEntitlements(tenantId);
  const entry = entries.find(e => e.moduleCode === moduleCode);
  if (!entry) return false;
  if (!entry.isEntitled) return false;
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return false;
  return true;
}

export async function setModuleEntitlement(
  tenantId: string,
  moduleCode: string,
  input: { isEntitled: boolean; tierRequired?: string; maxUsers?: number; expiresAt?: string; entitledBy: string },
): Promise<ModuleEntitlement> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".module_entitlements
     (module_code, is_entitled, tier_required, max_users, expires_at, entitled_by, entitled_at)
     VALUES ($1, $2, COALESCE($3, 'starter'), $4, $5::timestamptz, $6, CASE WHEN $2 THEN NOW() ELSE NULL END)
     ON CONFLICT (module_code) DO UPDATE SET
       is_entitled = EXCLUDED.is_entitled,
       tier_required = COALESCE(EXCLUDED.tier_required, module_entitlements.tier_required),
       max_users = COALESCE(EXCLUDED.max_users, module_entitlements.max_users),
       expires_at = EXCLUDED.expires_at,
       entitled_by = EXCLUDED.entitled_by,
       entitled_at = CASE WHEN EXCLUDED.is_entitled THEN NOW() ELSE module_entitlements.entitled_at END,
       updated_at = NOW()
     RETURNING *`,
    [moduleCode, input.isEntitled, input.tierRequired || null, input.maxUsers || null, input.expiresAt || null, input.entitledBy],
  );

  entitlementCache.delete(tenantId);
  return mapEntitlement(rows[0]);
}

export async function provisionDefaultEntitlements(
  tenantId: string,
  tier: 'starter' | 'professional' | 'enterprise',
  entitledBy: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);
  const tierPriority: Record<string, number> = { starter: 1, professional: 2, enterprise: 3 };
  const tenantPriority = tierPriority[tier] ?? 1;
  let count = 0;

  for (const moduleCode of CANONICAL_AGRC_MODULE_CODES) {
    const { rows: existing } = await safeQuery(
      `SELECT tier_required FROM "${schema}".module_entitlements WHERE module_code = $1`,
      [moduleCode],
    );
    const moduleTier = existing[0]?.tier_required || 'starter';
    const modulePriority = tierPriority[moduleTier] ?? 1;
    const isEntitled = tenantPriority >= modulePriority;

    await safeQuery(
      `INSERT INTO "${schema}".module_entitlements
       (module_code, is_entitled, tier_required, entitled_by, entitled_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $2 THEN NOW() ELSE NULL END)
       ON CONFLICT (module_code) DO UPDATE SET
         is_entitled = EXCLUDED.is_entitled,
         entitled_by = EXCLUDED.entitled_by,
         entitled_at = CASE WHEN EXCLUDED.is_entitled THEN NOW() ELSE module_entitlements.entitled_at END,
         updated_at = NOW()`,
      [moduleCode, isEntitled, moduleTier, entitledBy],
    );
    if (isEntitled) count++;
  }

  entitlementCache.delete(tenantId);
  return count;
}

export async function getEntitlementUsage(tenantId: string, moduleCode: string): Promise<{ current: number; max: number | null }> {
  const schema = tenantSchema(tenantId);
  const { rows: usage } = await safeQuery(
    `SELECT COUNT(DISTINCT ura.user_id) AS cnt
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".roles r ON r.role_id = ura.role_id
     JOIN "${schema}".role_functions rf ON rf.function_code = ANY(
       SELECT function_code FROM "${schema}".role_function_permissions WHERE role_id = r.role_id
     )
     WHERE ura.active = true AND rf.module_code = $1`,
    [moduleCode],
  );
  const { rows: entitlement } = await safeQuery(
    `SELECT max_users FROM "${schema}".module_entitlements WHERE module_code = $1`,
    [moduleCode],
  );
  return { current: parseInt(usage[0]?.cnt || '0', 10), max: entitlement[0]?.max_users || null };
}

function mapEntitlement(r: GenericRow): ModuleEntitlement {
  return {
    moduleCode: r.module_code,
    isEntitled: r.is_entitled,
    tierRequired: r.tier_required,
    entitledAt: r.entitled_at,
    expiresAt: r.expires_at,
    maxUsers: r.max_users,
    featureFlags: r.feature_flags || {},
  };
}
