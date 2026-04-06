/**
 * Playbook Permissions — DB-driven role → permission checking.
 *
 * Law 3: Data-driven security — permissions from DAuth registries, not hardcoded.
 * Uses DAuth role-permission-lookup.service for DB-driven, cached lookups.
 *
 * Requirements: 1.1, 2.1
 */
import { getRolePermissionCodes, hasRolePermission } from '../../../../platform/dauth/access/role-permission-lookup.service';

// ─── Nav item shape (mirrors frontend sidebar NavItem) ───

export interface NavItemDef {
  icon: string;
  labelKey: string;
  route: string;
  requiredPermission: string;
  section: string;
  lifecyclePhase: string;
}

/**
 * Check if a role has a specific permission (DB-driven via DAuth).
 * @deprecated for sync callers — use hasRolePermission() directly with tenantId.
 */
export function hasPermission(_role: string, _permission: string): boolean {
  // Sync fallback: callers should migrate to async hasRolePermission(tenantId, role, permission)
  // This exists only for backward compatibility during migration.
  throw new Error(
    'hasPermission() is deprecated. Use async hasRolePermission(tenantId, role, permission) from DAuth instead.',
  );
}

/**
 * DB-driven permission check. Call this instead of the sync hasPermission.
 */
export async function hasPermissionAsync(tenantId: string, role: string, permission: string): Promise<boolean> {
  return hasRolePermission(tenantId, role, permission);
}

/**
 * Get all permission codes for a role (DB-driven via DAuth).
 */
export async function getPermissionsForRole(tenantId: string, role: string): Promise<string[]> {
  return getRolePermissionCodes(tenantId, role);
}
