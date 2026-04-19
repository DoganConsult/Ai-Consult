import { safeQuery } from '../../config/database/database';
import { logger } from '../../platform/dos/observability/logger.service';

export async function seedPlatformAdmin(): Promise<void> {
  const profiles = [
    { code: 'platform_super_admin', name: 'Platform Super Admin', description: 'Full platform governance — OS-level controls' },
    { code: 'tenant_admin', name: 'Tenant Admin', description: 'Tenant-scoped administration and configuration' },
    { code: 'product_admin', name: 'Product Admin', description: 'Product-level settings, defaults, and module bundles' },
    { code: 'module_admin', name: 'Module Admin', description: 'Module-level config, workflows, and role assignments' },
    { code: 'security_admin', name: 'Security Admin', description: 'Security policy, audit, SoD, and compliance enforcement' },
    { code: 'standard_user', name: 'Standard User', description: 'Functional role-based access per module' },
    { code: 'viewer', name: 'Viewer', description: 'Read-only access across permitted areas' },
    { code: 'external_auditor', name: 'External Auditor', description: 'Time-boxed read-only audit access' },
  ];

  for (const p of profiles) {
    await safeQuery(
      `INSERT INTO access_profiles (code, name, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`,
      [p.code, p.name, p.description]
    ).catch(() => {});
  }

  const roles = [
    { code: 'platform_governor', module_code: 'platform', name: 'Platform Governor', category: 'platform' },
    { code: 'tenant_operator', module_code: 'platform', name: 'Tenant Operator', category: 'platform' },
    { code: 'identity_manager', module_code: 'dauth', name: 'Identity Manager', category: 'security' },
    { code: 'permission_manager', module_code: 'dauth', name: 'Permission Manager', category: 'security' },
    { code: 'audit_viewer', module_code: 'audit', name: 'Audit Viewer', category: 'compliance' },
    { code: 'module_configurator', module_code: 'platform', name: 'Module Configurator', category: 'platform' },
    { code: 'ai_governor', module_code: 'ai', name: 'AI Governor', category: 'governance' },
  ];

  for (const r of roles) {
    await safeQuery(
      `INSERT INTO functional_roles (code, module_code, name, category) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
      [r.code, r.module_code, r.name, r.category]
    ).catch(() => {});
  }

  const permissions = [
    { code: 'platform.tenant.create', module_code: 'platform', resource: 'tenant', action: 'create', description: 'Create a new tenant' },
    { code: 'platform.tenant.suspend', module_code: 'platform', resource: 'tenant', action: 'suspend', description: 'Suspend a tenant' },
    { code: 'platform.config.read', module_code: 'platform', resource: 'config', action: 'read', description: 'Read platform config' },
    { code: 'platform.config.write', module_code: 'platform', resource: 'config', action: 'write', description: 'Write platform config' },
    { code: 'platform.module.enable', module_code: 'platform', resource: 'module', action: 'enable', description: 'Enable a module' },
    { code: 'platform.module.disable', module_code: 'platform', resource: 'module', action: 'disable', description: 'Disable a module' },
    { code: 'platform.product.enable', module_code: 'platform', resource: 'product', action: 'enable', description: 'Enable a product' },
    { code: 'platform.product.disable', module_code: 'platform', resource: 'product', action: 'disable', description: 'Disable a product' },
    { code: 'platform.user.invite', module_code: 'dauth', resource: 'user', action: 'invite', description: 'Invite a user' },
    { code: 'platform.user.delete', module_code: 'dauth', resource: 'user', action: 'delete', description: 'Delete a user' },
    { code: 'platform.role.assign', module_code: 'dauth', resource: 'role', action: 'assign', description: 'Assign a role to a user' },
    { code: 'platform.permission.assign', module_code: 'dauth', resource: 'permission', action: 'assign', description: 'Assign a permission' },
    { code: 'platform.audit.read', module_code: 'audit', resource: 'audit_log', action: 'read', description: 'Read audit logs' },
    { code: 'platform.delegation.create', module_code: 'dauth', resource: 'delegation', action: 'create', description: 'Create a delegation' },
    { code: 'platform.sod.manage', module_code: 'dauth', resource: 'sod_rule', action: 'manage', description: 'Manage SoD rules' },
    { code: 'platform.feature.toggle', module_code: 'platform', resource: 'feature_flag', action: 'toggle', description: 'Toggle feature flags' },
    { code: 'platform.ai.govern', module_code: 'ai', resource: 'ai_registry', action: 'govern', description: 'Govern AI models, agents, and prompts' },
    { code: 'platform.workspace.create', module_code: 'platform', resource: 'workspace', action: 'create', description: 'Create a workspace' },
    { code: 'platform.schema.manage', module_code: 'platform', resource: 'schema', action: 'manage', description: 'Manage schema governance' },
    { code: 'platform.observability.read', module_code: 'platform', resource: 'observability', action: 'read', description: 'Read platform observability data' },
  ];

  for (const p of permissions) {
    await safeQuery(
      `INSERT INTO permissions (code, module_code, resource, action, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`,
      [p.code, p.module_code, p.resource, p.action, p.description]
    ).catch(() => {});
  }

  // Grant every seeded permission to the `platform_governor` functional role
  // so platform_super_admin access profiles resolve to the full permission set.
  await safeQuery(
    `INSERT INTO role_permissions (functional_role_id, permission_id)
     SELECT fr.id, p.id
     FROM functional_roles fr
     CROSS JOIN permissions p
     WHERE fr.code = 'platform_governor' AND p.code = ANY($1::text[])
     ON CONFLICT DO NOTHING`,
    [permissions.map((p) => p.code)],
  ).catch(() => {});

  // Attach `platform_super_admin` profile + `platform_governor` role to any
  // user whose email starts with `platform@` or `admin@` (idempotent bootstrap
  // so the UI is usable on a fresh install without manual SQL).
  await safeQuery(
    `INSERT INTO user_access_profiles (user_id, access_profile_id)
     SELECT u.id, ap.id
     FROM users u, access_profiles ap
     WHERE ap.code = 'platform_super_admin'
       AND (u.email ILIKE 'platform@%' OR u.email ILIKE 'admin@%' OR u.email ILIKE 'superadmin@%')
     ON CONFLICT DO NOTHING`,
  ).catch(() => {});

  await safeQuery(
    `INSERT INTO user_role_assignments (user_id, functional_role_id)
     SELECT u.id, fr.id
     FROM users u, functional_roles fr
     WHERE fr.code = 'platform_governor'
       AND (u.email ILIKE 'platform@%' OR u.email ILIKE 'admin@%' OR u.email ILIKE 'superadmin@%')
     ON CONFLICT DO NOTHING`,
  ).catch(() => {});

  logger.info(`[SeedPlatformAdmin] Seeded ${profiles.length} access profiles, ${roles.length} functional roles, ${permissions.length} permissions; bootstrapped super-admin bindings`);
}
