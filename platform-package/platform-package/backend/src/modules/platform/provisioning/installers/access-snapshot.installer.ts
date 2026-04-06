import { query } from '../../../../config/database';
import { SeedInstaller } from '../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../types';
import { catchHandler, EC } from '../../../../utils/resilient-catch';

export class AccessSnapshotInstaller implements SeedInstaller {
  key = 'access-snapshot';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    if (!ctx.tenantId || !ctx.actorUserId) {
      return { valid: false, errors: ['Missing tenantId or actorUserId'] };
    }
    return { valid: true, errors: [] };
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const warnings: string[] = [];
    let created = 0;

    try {
      const { getAccessSnapshot } = await import('../../../../platform/dauth/access/access-snapshot.service');
      const snapshot = await getAccessSnapshot(ctx.tenantId, ctx.actorUserId);

      await query(
        `INSERT INTO "${ctx.schemaName}".actor_audit_log (actor_id, actor_type, action, resource_type, resource_id, decision, metadata)
         VALUES ($1::UUID, 'human', 'access_snapshot_emitted', 'tenant', $2, 'allowed', $3::JSONB)`,
        [ctx.actorUserId, ctx.tenantId, JSON.stringify({
          accessProfiles: snapshot.accessProfiles,
          functionalRoles: snapshot.functionalRoles,
          allowedModules: snapshot.allowedModules,
          effectivePermissions: snapshot.effectivePermissions.length,
          emittedAt: new Date().toISOString(),
          trigger: 'tenant_bootstrap',
        })],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created++;
    } catch (err) {
      warnings.push(`Access snapshot generation failed (non-fatal): ${(err as Error).message}`);
    }

    try {
      const { emitEvent } = await import('../../../../platform/dos/events/event-bus');
      await emitEvent({
        tenantId: ctx.tenantId,
        userId: ctx.actorUserId,
        module: 'platform',
        event: 'bootstrapped',
        entityType: 'tenant',
        entityId: ctx.tenantId,
        data: {
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          provisioningJobId: ctx.provisioningJobId,
          enabledModules: ctx.enabledModules,
          subscriptionTier: ctx.subscriptionTier,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      warnings.push(`tenant.bootstrapped event emission failed (non-fatal): ${(err as Error).message}`);
    }

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: 0, warnings };
  }
}
