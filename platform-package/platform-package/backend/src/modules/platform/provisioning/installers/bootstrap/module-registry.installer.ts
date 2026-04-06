import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { enrichMwrRowFromCanonicalMaps } from '../../../../../platform/dos/config/registry/mwr-enrichment';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

/**
 * Seeds module_workflow_registry and module_pages for the tenant
 * from the master product_modules table, filtered by ctx.enabledModules.
 */
export class ModuleRegistrySeedInstaller implements SeedInstaller {
  key = 'install_module_registry_seed';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const { schemaName, enabledModules, productKey } = ctx;
    let created = 0;

    // Seed module_workflow_registry from master product_modules
    try {
      const masterModules = await query(
        `SELECT module_code, module_type, display_name_en, display_name_ar,
                is_required, tier_gate, feature_flag, default_landing_route,
                nav_icon, nav_sort_order, permission_prefix
         FROM public.product_modules
         WHERE product_key = $1 AND enabled = true`,
        [productKey]
      );

      for (const mod of masterModules.rows) {
        const isEnabled = enabledModules.includes(mod.module_code) || mod.is_required;
        if (!isEnabled) continue;

        await query(
          `INSERT INTO "${schemaName}".module_workflow_registry
           (module_code, module_category, product_key, module_type,
            default_landing_route, nav_icon, nav_sort_order,
            permission_prefix, licensed, description_en, description_ar)
           VALUES ($1, 'core_grc', $2, $3, $4, $5, $6, $7, true, $8, $9)
           ON CONFLICT (module_code) DO UPDATE SET
             licensed = true,
             product_key = EXCLUDED.product_key,
             module_type = EXCLUDED.module_type,
             default_landing_route = EXCLUDED.default_landing_route,
             updated_at = NOW()`,
          [mod.module_code, productKey, mod.module_type,
           mod.default_landing_route, mod.nav_icon, mod.nav_sort_order,
           mod.permission_prefix, mod.display_name_en, mod.display_name_ar]
        );
        await enrichMwrRowFromCanonicalMaps(schemaName, mod.module_code);
        created++;
      }
    } catch (err: unknown) {
      // product_modules may not exist yet if master migrations haven't run
      if ((err as Record<string, any>).code !== '42P01') throw err;
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: 0,
      details: { modulesSeeded: created },
    };
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    const errors: string[] = [];
    try {
      const result = await query(
        `SELECT COUNT(*) as cnt FROM "${ctx.schemaName}".module_workflow_registry WHERE licensed = true`
      );
      const count = parseInt(result.rows[0]?.cnt || '0');
      if (count < Math.min(ctx.enabledModules.length, 5)) {
        errors.push(`Expected at least ${Math.min(ctx.enabledModules.length, 5)} modules, found ${count}`);
      }
    } catch {
      errors.push('module_workflow_registry table not accessible');
    }
    return { valid: errors.length === 0, errors };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".module_workflow_registry WHERE product_key = $1`,
      [ctx.productKey]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
