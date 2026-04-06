import { query } from '../../../../config/database';
import { SeedInstaller } from '../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../types';
import { catchHandler, EC } from '../../../../utils/resilient-catch';

const OWNER_ROLE_CATEGORIES = ['grc_core', 'security', 'audit'] as const;

export class OwnerRoleAssignmentInstaller implements SeedInstaller {
  key = 'owner-role-assignment';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    if (!ctx.tenantId || !ctx.schemaName || !ctx.actorUserId) {
      return { valid: false, errors: ['Missing tenantId, schemaName, or actorUserId'] };
    }
    return { valid: true, errors: [] };
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const schema = ctx.schemaName;
    let created = 0;
    const warnings: string[] = [];

    const rolesResult = await query(
      `SELECT role_code FROM "${schema}".functional_roles
       WHERE category = ANY($1::TEXT[]) AND is_active = TRUE
       ORDER BY category, role_code`,
      [OWNER_ROLE_CATEGORIES as any],
    ).catch(() => ({ rows: [] as any[] }));

    const roleCodes: string[] = rolesResult.rows.map((r: any) => r.role_code).filter(Boolean);

    if (roleCodes.length === 0) {
      warnings.push(`No functional_roles found for categories [${OWNER_ROLE_CATEGORIES.join(', ')}] — owner gets no role assignments (DB seed missing?)`);
      return { installerKey: this.key, status: 'completed', recordsCreated: 0, recordsUpdated: 0, warnings };
    }

    for (const roleCode of roleCodes) {
      try {
        const result = await query(
          `INSERT INTO "${schema}".actor_role_assignments (actor_id, role_code, scope_type, assigned_by, reason, is_active)
           VALUES ($1::UUID, $2, 'tenant', $1::UUID, 'Bootstrap: tenant owner role (DB-driven)', TRUE)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [ctx.actorUserId, roleCode],
        );

        if (result.rows.length > 0) created++;
      } catch (err) {
        warnings.push(`Failed to assign role ${roleCode}: ${(err as Error).message}`);
      }
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: 0,
      warnings,
      details: { resolvedRoles: roleCodes, categories: [...OWNER_ROLE_CATEGORIES] },
    };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".actor_role_assignments WHERE actor_id = $1::UUID AND reason LIKE 'Bootstrap:%'`,
      [ctx.actorUserId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
