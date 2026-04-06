import { query } from '../../../../config/database';
import { SeedInstaller } from '../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../types';
import { catchHandler, EC } from '../../../../utils/resilient-catch';

export class OwnerAccessProfileInstaller implements SeedInstaller {
  key = 'owner-access-profile';

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

    const profileResult = await query(
      `SELECT profile_code FROM "${schema}".access_profiles WHERE tier = 'tenant_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
    ).catch(() => ({ rows: [] as any[] }));

    const profileCode = profileResult.rows[0]?.profile_code;
    if (!profileCode) {
      warnings.push('No access_profiles row with tier=tenant_admin found — cannot assign owner profile (DB seed missing?)');
      return { installerKey: this.key, status: 'completed', recordsCreated: 0, recordsUpdated: 0, warnings };
    }

    const result = await query(
      `INSERT INTO "${schema}".actor_access_assignments (actor_id, profile_code, assigned_by, reason, is_active)
       VALUES ($1::UUID, $2, $1::UUID, 'Bootstrap: tenant owner access profile (DB-driven)', TRUE)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [ctx.actorUserId, profileCode],
    ).catch(() => ({ rows: [] as any[] }));

    if (result.rows.length > 0) created++;

    if (created === 0) {
      const existing = await query(
        `SELECT id FROM "${schema}".actor_access_assignments WHERE actor_id = $1::UUID AND profile_code = $2 LIMIT 1`,
        [ctx.actorUserId, profileCode],
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length === 0) {
        warnings.push(`Failed to assign access profile ${profileCode} to owner`);
      }
    }

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: 0, warnings };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".actor_access_assignments WHERE actor_id = $1::UUID AND reason LIKE 'Bootstrap:%'`,
      [ctx.actorUserId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
