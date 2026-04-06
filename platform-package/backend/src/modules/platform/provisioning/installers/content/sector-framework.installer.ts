import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

/**
 * For multi-sector tenants, resolves applicable frameworks from sector_framework
 * and sets module_workflow_registry.applicable_sectors.
 */
export class SectorFrameworkBindingInstaller implements SeedInstaller {
  key = 'install_sector_framework_binding';

  async canInstall(ctx: ProvisioningContext): Promise<boolean> {
    // Only run if tenant has sector_ids
    try {
      const result = await query(
        `SELECT sector_ids FROM public.tenants WHERE tenant_id = $1`,
        [ctx.tenantId]
      );
      const sectorIds = result.rows[0]?.sector_ids;
      return Array.isArray(sectorIds) && sectorIds.length > 0;
    } catch {
      return false;
    }
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const { schemaName, tenantId } = ctx;
    let created = 0;

    // Get tenant sectors
    const tenantResult = await query(
      `SELECT sector_ids FROM public.tenants WHERE tenant_id = $1`,
      [tenantId]
    );
    const sectorIds: string[] = tenantResult.rows[0]?.sector_ids || [];

    if (sectorIds.length === 0) {
      return { installerKey: this.key, status: 'skipped', recordsCreated: 0, recordsUpdated: 0 };
    }

    // Resolve frameworks for each sector
    for (const sectorId of sectorIds) {
      try {
        const frameworks = await query(
          `SELECT framework_id, framework_name, is_mandatory
           FROM public.sector_framework
           WHERE sector_id = $1`,
          [sectorId]
        );

        for (const fw of frameworks.rows) {
          // Ensure framework exists in tenant schema
          await query(
            `INSERT INTO "${schemaName}".frameworks
             (framework_id, name, status, source, created_at)
             VALUES ($1, $2, 'active', 'sector_auto', NOW())
             ON CONFLICT (framework_id) DO NOTHING`,
            [fw.framework_id, fw.framework_name]
          ).catch(catchHandler(EC.EVENT_BUS, {}));
          created++;
        }
      } catch {
        // sector_framework or frameworks table may not exist
      }
    }

    // Set applicable_sectors on module_workflow_registry
    try {
      await query(
        `UPDATE "${schemaName}".module_workflow_registry
         SET applicable_sectors = $1
         WHERE applicable_sectors = '{}' OR applicable_sectors IS NULL`,
        [sectorIds]
      );
    } catch {
      // applicable_sectors column may not exist
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: 0,
      details: { sectors: sectorIds, frameworksResolved: created },
    };
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    const warnings: string[] = [];
    try {
      const result = await query(
        `SELECT COUNT(*) as cnt FROM "${ctx.schemaName}".frameworks WHERE status = 'active'`
      );
      if (parseInt(result.rows[0]?.cnt || '0') < 1) {
        warnings.push('No active frameworks found — sector binding may need manual setup');
      }
    } catch {
      // Not critical
    }
    return { valid: true, errors: [], warnings };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".frameworks WHERE source = 'sector_auto'`
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    await query(
      `UPDATE "${ctx.schemaName}".module_workflow_registry SET applicable_sectors = '{}'`
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
