import { query } from '../../../../config/database';
import { SeedInstaller } from '../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../types';
import { catchHandler, EC } from '../../../../utils/resilient-catch';

export class ActorRegistrationInstaller implements SeedInstaller {
  key = 'actor-registration';

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

    const userResult = await query(
      `SELECT user_id, name, full_name, email FROM public.users WHERE user_id = $1 LIMIT 1`,
      [ctx.actorUserId],
    ).catch(() => ({ rows: [] as any[] }));

    const user = userResult.rows[0];
    if (!user) {
      warnings.push(`User ${ctx.actorUserId} not found in public.users — skipping actor registration`);
      return { installerKey: this.key, status: 'completed', recordsCreated: 0, recordsUpdated: 0, warnings };
    }

    const displayName = user.name || user.full_name || user.email || 'Tenant Owner';

    const result = await query(
      `INSERT INTO "${schema}".actor_registry (actor_id, actor_type, user_id, display_name, tenant_id, is_active)
       VALUES ($1::UUID, 'human', $2, $3, $4, TRUE)
       ON CONFLICT (actor_id) DO UPDATE SET display_name = EXCLUDED.display_name, user_id = EXCLUDED.user_id, tenant_id = EXCLUDED.tenant_id, is_active = TRUE
       RETURNING (xmax = 0) AS is_insert`,
      [ctx.actorUserId, ctx.actorUserId, displayName, ctx.tenantId],
    ).catch(() => ({ rows: [] as any[] }));

    if (result.rows[0]?.is_insert) created++;

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: created ? 0 : 1, warnings };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".actor_registry WHERE user_id = $1 AND tenant_id = $2`,
      [ctx.actorUserId, ctx.tenantId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
