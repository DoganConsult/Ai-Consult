import { safeQuery, tenantSchema, query } from '../../../config/database/database';

export interface ModuleEntitlement {
  moduleCode: string;
  moduleName: string;
  isEnabled: boolean;
  tier: string;
  enabledAt: Date | null;
  expiresAt: Date | null;
}

export interface ModuleRegistration {
  code: string;
  name: string;
  tier: string;
  version: string;
  routeBase: string;
  eventNamespace: string;
  isActive: boolean;
}

export async function isModuleEnabled(tenantId: string, moduleCode: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT 1 FROM "${schema}".tenant_module_entitlements
     WHERE module_code = $1 AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [moduleCode],
  );
  return result.rows.length > 0;
}

export async function getEnabledModules(tenantId: string): Promise<ModuleEntitlement[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT tme.module_code, m.name AS module_name, tme.is_active AS is_enabled,
            COALESCE(m.tier, 'standard') AS tier, tme.activated_at, tme.expires_at
     FROM "${schema}".tenant_module_entitlements tme
     LEFT JOIN "${schema}".modules m ON m.code = tme.module_code
     WHERE tme.is_active = TRUE
       AND (tme.expires_at IS NULL OR tme.expires_at > NOW())
     ORDER BY tme.module_code`,
    [],
  );
  return result.rows.map((r: any) => ({
    moduleCode: r.module_code,
    moduleName: r.module_name || r.module_code,
    isEnabled: r.is_enabled,
    tier: r.tier,
    enabledAt: r.activated_at,
    expiresAt: r.expires_at,
  }));
}

export async function enableModule(
  tenantId: string,
  moduleCode: string,
  opts?: { tier?: string; enabledBy?: string; expiresAt?: Date },
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const source = opts?.enabledBy ? 'manual' : 'pack';
  await safeQuery(
    `INSERT INTO "${schema}".tenant_module_entitlements
     (module_code, is_active, entitlement_source, activated_at, expires_at, updated_at)
     VALUES ($1, TRUE, $2, NOW(), $3, NOW())
     ON CONFLICT (module_code) DO UPDATE
     SET is_active = TRUE, entitlement_source = EXCLUDED.entitlement_source,
         expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
    [moduleCode, source, opts?.expiresAt || null],
  );
  try {
    const { invalidatePermissionCache } = await import('../../../platform/dauth/access/decision-engine');
    invalidatePermissionCache(tenantId);
  } catch { /* non-blocking */ }
  try {
    const { invalidateModuleCache } = await import('../http/guards/module-guard');
    invalidateModuleCache(tenantId);
  } catch { /* non-blocking */ }
}

export async function disableModule(tenantId: string, moduleCode: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".tenant_module_entitlements
     SET is_active = FALSE, updated_at = NOW()
     WHERE module_code = $1`,
    [moduleCode],
  );
  try {
    const { invalidatePermissionCache } = await import('../../../platform/dauth/access/decision-engine');
    invalidatePermissionCache(tenantId);
  } catch { /* non-blocking */ }
  try {
    const { invalidateModuleCache } = await import('../http/guards/module-guard');
    invalidateModuleCache(tenantId);
  } catch { /* non-blocking */ }
}

export async function getModuleRegistry(): Promise<ModuleRegistration[]> {
  const result = await query(
    `SELECT code, name, tier, version, route_base, event_namespace, is_active
     FROM product_modules
     WHERE is_active = TRUE
     ORDER BY code`,
    [],
  );
  return result.rows.map((r: any) => ({
    code: r.code,
    name: r.name,
    tier: r.tier || 'standard',
    version: r.version || '1.0.0',
    routeBase: r.route_base || `/${r.code}`,
    eventNamespace: r.event_namespace || r.code,
    isActive: r.is_active,
  }));
}

export async function enableDefaultModulesForTenant(
  tenantId: string,
  tier: string,
  enabledBy: string,
): Promise<string[]> {
  const modules = await getModuleRegistry();
  const enabled: string[] = [];
  for (const mod of modules) {
    const tierRank = { free: 0, starter: 1, standard: 2, professional: 3, enterprise: 4 };
    const modRank = tierRank[mod.tier as keyof typeof tierRank] ?? 2;
    const tenantRank = tierRank[tier as keyof typeof tierRank] ?? 2;
    if (tenantRank >= modRank) {
      await enableModule(tenantId, mod.code, { tier, enabledBy });
      enabled.push(mod.code);
    }
  }
  return enabled;
}

export const moduleEntitlementService = {
  isModuleEnabled,
  getEnabledModules,
  enableModule,
  disableModule,
  getModuleRegistry,
  enableDefaultModulesForTenant,
};
