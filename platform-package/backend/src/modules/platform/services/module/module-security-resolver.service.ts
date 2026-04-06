import { logger } from '../../../../platform/dos/observability/services/logger.service';
/**
 * Module Security Resolver Service
 *
 * Runtime resolver for module security config from DB tables
 * (migration 429). Uses in-memory cache with 60s TTL.
 * Falls back to static TypeScript exports from the security
 * registry when DB tables are empty or unprovisioned.
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { MODULE_SECURITY_REGISTRY, getAllModuleCodes } from '../../../../platform/dauth/registry/module-security-seeder.registry';

// ── Row interfaces matching DB columns ──────────────────────────────────────

export interface ModulePermissionRow {
  id: string;
  tenant_id: string;
  module_code: string;
  permission_code: string;
  resource_type: string;
  action_type: string;
  description_en: string | null;
  description_ar: string | null;
  active: boolean;
}

export interface ModuleActionRow {
  id: string;
  tenant_id: string;
  module_code: string;
  action_code: string;
  label_en: string | null;
  label_ar: string | null;
  required_permissions: string[];
  sod_sensitive: boolean;
  ai_enabled: boolean;
  danger_level: string;
  active: boolean;
}

export interface ModuleRoleRow {
  id: string;
  tenant_id: string;
  module_code: string;
  role_code: string;
  role_label_en: string | null;
  role_label_ar: string | null;
  granted_permissions: string[];
  is_default: boolean;
  active: boolean;
}

export interface ApprovalMatrixRow {
  id: string;
  tenant_id: string;
  module_code: string;
  action_code: string;
  required_role: string;
  min_approvers: number;
  escalation_role: string | null;
  sla_hours: number | null;
  active: boolean;
}

export interface SodRuleRow {
  id: string;
  tenant_id: string;
  module_code: string;
  action_a: string;
  action_b: string;
  conflict_type: string;
  description_en: string | null;
  description_ar: string | null;
  active: boolean;
}

export interface OwnershipRuleRow {
  id: string;
  tenant_id: string;
  module_code: string;
  resource_type: string;
  ownership_field: string;
  scope_type: string;
  can_reassign: boolean;
  active: boolean;
}

// ── In-memory cache ─────────────────────────────────────────────────────────

const CACHE_TTL = 60_000; // 60 seconds
const cache = new Map<string, { data: unknown; ts: number }>();

function cacheKey(tenantId: string, table: string, scope: string): string {
  return `${tenantId}:${table}:${scope}`;
}

function toCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

function fromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

// ── Static fallback helpers ─────────────────────────────────────────────────

function getStaticPermissions(tenantId: string, moduleCode: string): ModulePermissionRow[] {
  const entry = MODULE_SECURITY_REGISTRY.get(moduleCode);
  if (!entry?.permissions) return [];
  return entry.permissions.map((p) => ({
    id: '',
    tenant_id: tenantId,
    module_code: moduleCode,
    permission_code: p.permissionCode,
    resource_type: p.resourceType,
    action_type: p.actionType,
    description_en: p.descriptionEn,
    description_ar: p.descriptionAr,
    active: true,
  }));
}

function getStaticActions(tenantId: string, moduleCode: string): ModuleActionRow[] {
  const entry = MODULE_SECURITY_REGISTRY.get(moduleCode);
  if (!entry?.actions) return [];
  return entry.actions.map((a) => ({
    id: '',
    tenant_id: tenantId,
    module_code: moduleCode,
    action_code: a.actionCode,
    label_en: a.labelEn,
    label_ar: a.labelAr,
    required_permissions: a.requiredPermissions,
    sod_sensitive: a.sodSensitive,
    ai_enabled: a.aiEnabled,
    danger_level: a.dangerLevel,
    active: true,
  }));
}

function getStaticRoles(tenantId: string, moduleCode: string): ModuleRoleRow[] {
  const entry = MODULE_SECURITY_REGISTRY.get(moduleCode);
  if (!entry?.roles) return [];
  return entry.roles.map((r) => ({
    id: '',
    tenant_id: tenantId,
    module_code: moduleCode,
    role_code: r.roleCode,
    role_label_en: r.nameEn,
    role_label_ar: r.nameAr,
    granted_permissions: [],
    is_default: r.isDefault,
    active: true,
  }));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get all active permissions for a module (or all modules if moduleCode omitted).
 */
export async function getPermissions(
  tenantId: string,
  moduleCode?: string,
): Promise<ModulePermissionRow[]> {
  const scope = moduleCode || '__all__';
  const key = cacheKey(tenantId, 'module_permissions', scope);
  const cached = fromCache<ModulePermissionRow[]>(key);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const sql = moduleCode
    ? `SELECT * FROM "${schema}".module_permissions WHERE tenant_id = $1 AND module_code = $2 AND active = true ORDER BY permission_code`
    : `SELECT * FROM "${schema}".module_permissions WHERE tenant_id = $1 AND active = true ORDER BY module_code, permission_code`;
  const params = moduleCode ? [tenantId, moduleCode] : [tenantId];
  const result = await safeQuery(sql, params);
  let rows: ModulePermissionRow[] = result.rows;

  if (rows.length === 0 && moduleCode) {
    logger.warn(`[ModuleSecurityResolver] No DB permissions for tenant=${tenantId} module=${moduleCode}; falling back to static`);
    rows = getStaticPermissions(tenantId, moduleCode);
  }

  toCache(key, rows);
  return rows;
}

/**
 * Get all active actions for a module.
 */
export async function getActions(
  tenantId: string,
  moduleCode: string,
): Promise<ModuleActionRow[]> {
  const key = cacheKey(tenantId, 'module_actions', moduleCode);
  const cached = fromCache<ModuleActionRow[]>(key);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const sql = `SELECT * FROM "${schema}".module_actions WHERE tenant_id = $1 AND module_code = $2 AND active = true ORDER BY action_code`;
  const result = await safeQuery(sql, [tenantId, moduleCode]);
  let rows: ModuleActionRow[] = result.rows;

  if (rows.length === 0) {
    logger.warn(`[ModuleSecurityResolver] No DB actions for tenant=${tenantId} module=${moduleCode}; falling back to static`);
    rows = getStaticActions(tenantId, moduleCode);
  }

  toCache(key, rows);
  return rows;
}

/**
 * Get all active roles for a module.
 */
export async function getRoles(
  tenantId: string,
  moduleCode: string,
): Promise<ModuleRoleRow[]> {
  const key = cacheKey(tenantId, 'module_roles', moduleCode);
  const cached = fromCache<ModuleRoleRow[]>(key);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const sql = `SELECT * FROM "${schema}".module_roles WHERE tenant_id = $1 AND module_code = $2 AND active = true ORDER BY role_code`;
  const result = await safeQuery(sql, [tenantId, moduleCode]);
  let rows: ModuleRoleRow[] = result.rows;

  if (rows.length === 0) {
    logger.warn(`[ModuleSecurityResolver] No DB roles for tenant=${tenantId} module=${moduleCode}; falling back to static`);
    rows = getStaticRoles(tenantId, moduleCode);
  }

  toCache(key, rows);
  return rows;
}

/**
 * Get approval matrix entries for a module and optionally a specific action.
 */
export async function getApprovalMatrix(
  tenantId: string,
  moduleCode: string,
  actionCode?: string,
): Promise<ApprovalMatrixRow[]> {
  const scope = actionCode || moduleCode;
  const key = cacheKey(tenantId, 'module_approval_matrix', scope);
  const cached = fromCache<ApprovalMatrixRow[]>(key);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const sql = actionCode
    ? `SELECT * FROM "${schema}".module_approval_matrix WHERE tenant_id = $1 AND module_code = $2 AND action_code = $3 AND active = true`
    : `SELECT * FROM "${schema}".module_approval_matrix WHERE tenant_id = $1 AND module_code = $2 AND active = true ORDER BY action_code`;
  const params = actionCode ? [tenantId, moduleCode, actionCode] : [tenantId, moduleCode];
  const result = await safeQuery(sql, params);

  toCache(key, result.rows);
  return result.rows;
}

/**
 * Get SoD rules for a module.
 */
export async function getSodRules(
  tenantId: string,
  moduleCode: string,
): Promise<SodRuleRow[]> {
  const key = cacheKey(tenantId, 'module_sod_rules', moduleCode);
  const cached = fromCache<SodRuleRow[]>(key);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const sql = `SELECT * FROM "${schema}".module_sod_rules WHERE tenant_id = $1 AND module_code = $2 AND active = true ORDER BY action_a, action_b`;
  const result = await safeQuery(sql, [tenantId, moduleCode]);

  toCache(key, result.rows);
  return result.rows;
}

/**
 * Get ownership rules for a module and optional resource type.
 */
export async function getOwnershipRules(
  tenantId: string,
  moduleCode: string,
  resourceType?: string,
): Promise<OwnershipRuleRow[]> {
  const scope = resourceType ? `${moduleCode}:${resourceType}` : moduleCode;
  const key = cacheKey(tenantId, 'module_ownership_rules', scope);
  const cached = fromCache<OwnershipRuleRow[]>(key);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const sql = resourceType
    ? `SELECT * FROM "${schema}".module_ownership_rules WHERE tenant_id = $1 AND module_code = $2 AND resource_type = $3 AND active = true`
    : `SELECT * FROM "${schema}".module_ownership_rules WHERE tenant_id = $1 AND module_code = $2 AND active = true`;
  const params = resourceType ? [tenantId, moduleCode, resourceType] : [tenantId, moduleCode];
  const result = await safeQuery(sql, params);

  toCache(key, result.rows);
  return result.rows;
}

/**
 * Check if a specific permission exists and is active for a tenant.
 */
export async function hasPermission(
  tenantId: string,
  permissionCode: string,
): Promise<boolean> {
  const key = cacheKey(tenantId, 'has_perm', permissionCode);
  const cached = fromCache<boolean>(key);
  if (cached !== null) return cached;

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT 1 FROM "${schema}".module_permissions WHERE tenant_id = $1 AND permission_code = $2 AND active = true LIMIT 1`,
    [tenantId, permissionCode],
  );
  const exists = result.rows.length > 0;

  if (!exists) {
    for (const code of getAllModuleCodes()) {
      const entry = MODULE_SECURITY_REGISTRY.get(code);
      if (entry?.permissions?.some((p) => p.permissionCode === permissionCode)) {
        toCache(key, true);
        return true;
      }
    }
  }

  toCache(key, exists);
  return exists;
}

/**
 * Get all permission codes granted to a specific role across all modules.
 */
export async function getPermissionsForRole(
  tenantId: string,
  roleCode: string,
): Promise<string[]> {
  const key = cacheKey(tenantId, 'role_perms', roleCode);
  const cached = fromCache<string[]>(key);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT granted_permissions FROM "${schema}".module_roles WHERE tenant_id = $1 AND role_code = $2 AND active = true`,
    [tenantId, roleCode],
  );

  const perms: string[] = [];
  for (const row of result.rows) {
    if (row.granted_permissions) {
      perms.push(...(row.granted_permissions as string[]));
    }
  }

  const unique = [...new Set(perms)];
  toCache(key, unique);
  return unique;
}

/**
 * Invalidate all cached entries for a tenant.
 * Call after seeding, provisioning, or admin permission changes.
 */
export function invalidateCache(tenantId: string): void {
  const prefix = `${tenantId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
