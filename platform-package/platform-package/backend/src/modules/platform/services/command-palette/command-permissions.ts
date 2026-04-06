/**
 * Command Palette Permission Filtering — DB-driven
 *
 * Law 3: Data-driven security — permissions from DAuth registries, not hardcoded.
 * Uses DAuth role-permission-lookup.service for DB-driven, cached lookups.
 *
 * Requirements: 6.2 - Command palette shows available commands based on user permissions
 */

import { Command } from './command-palette.types';
import { COMMAND_REGISTRY } from './command-registry';
import { getRolePermissionCodes } from '../../../../platform/dauth/access/role-permission-lookup.service';

/**
 * Filter commands by user role permissions (DB-driven via DAuth).
 * Commands without requiredPermission are available to all users.
 */
export async function filterCommandsByPermission(tenantId: string, commands: Command[], userRole: string): Promise<Command[]> {
  const permCodes = await getRolePermissionCodes(tenantId, userRole);
  const permSet = new Set(permCodes);
  return commands.filter(cmd => {
    if (!cmd.requiredPermission) return true;
    return permSet.has(cmd.requiredPermission);
  });
}

/**
 * Get all commands available to a user based on their role (DB-driven).
 */
export async function getCommandsForRole(tenantId: string, userRole: string): Promise<Command[]> {
  return filterCommandsByPermission(tenantId, COMMAND_REGISTRY, userRole);
}
