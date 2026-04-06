// @ts-nocheck
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';
import { repairNonCanonicalModuleCodes } from '../../../../platform/dos/nav-seeding.service';

export class NavigationSeedInstaller implements SeedInstaller {
  key = 'seed_navigation';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    if (!ctx.schemaName) {
      return { valid: false, errors: ['Missing schemaName'] };
    }
    try {
      await query(`SELECT 1 FROM "${ctx.schemaName}".navigation_registry LIMIT 1`);
    } catch {
      return { valid: false, errors: [`navigation_registry does not exist in ${ctx.schemaName}`] };
    }
    return { valid: true, errors: [] };
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    let repaired = 0;

    try {
      repaired = await repairNonCanonicalModuleCodes(ctx.schemaName);
    } catch {
      repaired = 0;
    }

    let navCount = 0;
    try {
      const result = await query(
        `SELECT COUNT(*) AS cnt FROM "${ctx.schemaName}".navigation_registry WHERE is_active = TRUE`
      );
      navCount = parseInt(result.rows[0]?.cnt ?? '0', 10);
    } catch {
      navCount = 0;
    }

    const warnings: string[] = [];
    if (navCount < 20) {
      warnings.push(`Only ${navCount} active nav items found — expected >= 20 for a full product`);
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: 0,
      recordsUpdated: repaired,
      warnings,
      details: { navCount, repaired },
    };
  }
}
