/**
 * Tenant RBAC Provisioner
 *
 * Seeds the canonical module permission/role/action tables for a newly
 * provisioned tenant schema. Called during onboarding workspace bootstrap.
 *
 * @owner DOS (provisioning)
 */

import { safeQuery, tenantSchema } from '../../../config/database';

export async function provisionRbacForTenant(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Seed module_permissions from canonical defaults if empty
  await safeQuery(
    `INSERT INTO "${schema}".module_permissions (module_code, permission_code, permission_name, description_en, is_active)
     SELECT module_code, permission_code, permission_name, description_en, TRUE
     FROM public.canonical_module_permissions
     WHERE NOT EXISTS (
       SELECT 1 FROM "${schema}".module_permissions mp
       WHERE mp.module_code = canonical_module_permissions.module_code
         AND mp.permission_code = canonical_module_permissions.permission_code
     )
     ON CONFLICT DO NOTHING`,
  ).catch(() => {
    // Table may not exist yet — non-fatal during early provisioning
  });

  // Seed module_role_definitions from canonical defaults if empty
  await safeQuery(
    `INSERT INTO "${schema}".module_role_definitions (module_code, role_code, role_name, description_en, is_active)
     SELECT module_code, role_code, role_name, description_en, TRUE
     FROM public.canonical_module_roles
     WHERE NOT EXISTS (
       SELECT 1 FROM "${schema}".module_role_definitions mr
       WHERE mr.module_code = canonical_module_roles.module_code
         AND mr.role_code = canonical_module_roles.role_code
     )
     ON CONFLICT DO NOTHING`,
  ).catch(() => {
    // Non-fatal — canonical tables may not be seeded yet
  });
}
