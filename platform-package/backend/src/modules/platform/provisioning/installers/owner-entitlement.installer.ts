import { query } from '../../../../config/database';
import { SeedInstaller } from '../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../types';
import { catchHandler, EC } from '../../../../utils/resilient-catch';

export class OwnerEntitlementInstaller implements SeedInstaller {
  key = 'owner-entitlement';

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
    const productCode = ctx.productKey || 'agrc';

    const [profileResult, rolesResult] = await Promise.all([
      query(
        `SELECT profile_code FROM "${schema}".actor_access_assignments
         WHERE actor_id = $1::UUID AND is_active = TRUE
         ORDER BY created_at ASC LIMIT 1`,
        [ctx.actorUserId],
      ).catch(() => ({ rows: [] as any[] })),
      query(
        `SELECT role_code FROM "${schema}".actor_role_assignments
         WHERE actor_id = $1::UUID AND is_active = TRUE
         ORDER BY role_code`,
        [ctx.actorUserId],
      ).catch(() => ({ rows: [] as any[] })),
    ]);

    const accessProfileCode = profileResult.rows[0]?.profile_code;
    const roleCodes: string[] = rolesResult.rows.map((r: any) => r.role_code).filter(Boolean);

    if (!accessProfileCode) {
      warnings.push('No active actor_access_assignments found for owner — entitlement will have NULL profile (upstream installer may have failed)');
    }
    if (roleCodes.length === 0) {
      warnings.push('No active actor_role_assignments found for owner — entitlement will have empty role array (upstream installer may have failed)');
    }

    try {
      const result = await query(
        `INSERT INTO "${schema}".product_user_entitlements
           (user_id, product_code, access_profile_code, functional_role_codes, licensed_modules, is_active)
         VALUES ($1, $2, $3, $4::TEXT[], $5::TEXT[], TRUE)
         ON CONFLICT (user_id, product_code) DO UPDATE SET
           access_profile_code = EXCLUDED.access_profile_code,
           functional_role_codes = EXCLUDED.functional_role_codes,
           licensed_modules = EXCLUDED.licensed_modules,
           is_active = TRUE,
           updated_at = NOW()
         RETURNING (xmax = 0) AS is_insert`,
        [ctx.actorUserId, productCode, accessProfileCode || null, roleCodes, ctx.enabledModules],
      );

      if (result.rows[0]?.is_insert) created++;
    } catch (err) {
      warnings.push(`Failed to create product entitlement: ${(err as Error).message}`);
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: created ? 0 : 1,
      warnings,
      details: { resolvedProfile: accessProfileCode, resolvedRoles: roleCodes, productCode },
    };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".product_user_entitlements WHERE user_id = $1 AND product_code = $2`,
      [ctx.actorUserId, ctx.productKey || 'agrc'],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
