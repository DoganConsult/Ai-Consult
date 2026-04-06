import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

/**
 * Seeds navigation_registry items for enabled modules,
 * using the module_pages table as the source of truth.
 */
export class NavigationSeedInstaller implements SeedInstaller {
  key = 'install_navigation_seed';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const { schemaName, enabledModules, productKey } = ctx;
    let created = 0;

    const ALWAYS_ON = new Set(['admin', 'workflow', 'notification', 'foundation', 'workspace']);
    const enabledSet = new Set([...enabledModules, ...ALWAYS_ON]);

    // Seed nav items from module_pages where nav_item_key is set
    try {
      const pages = await query(
        `SELECT page_code, module_code, route, display_name_en, display_name_ar,
                permission_code, nav_item_key, sort_order, agent_id
         FROM "${schemaName}".module_pages
         WHERE nav_item_key IS NOT NULL AND is_active = true AND product_key = $1
         ORDER BY sort_order`,
        [productKey]
      );

      for (const page of pages.rows) {
        if (!enabledSet.has(page.module_code)) continue;

        await query(
          `INSERT INTO "${schemaName}".navigation_registry
           (nav_key, module_code, route, label_en, label_ar,
            icon, sort_order, is_active, page_code, permission_code, product_key)
           VALUES ($1, $2, $3, $4, $5, 'pi-circle', $6, true, $7, $8, $9)
           ON CONFLICT (nav_key) DO UPDATE SET
             is_active = true,
             route = EXCLUDED.route,
             permission_code = EXCLUDED.permission_code,
             updated_at = NOW()`,
          [page.nav_item_key, page.module_code, page.route,
           page.display_name_en, page.display_name_ar,
           page.sort_order, page.page_code, page.permission_code, productKey]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
        created++;
      }
    } catch (err: unknown) {
      if ((err as Record<string, any>).code !== '42P01') throw err;
      // module_pages or navigation_registry may not exist yet
    }

    // Seed navigation_role_bindings for admin role
    try {
      const navItems = await query(
        `SELECT nav_key FROM "${schemaName}".navigation_registry WHERE is_active = true`
      );
      for (const nav of navItems.rows) {
        await query(
          `INSERT INTO "${schemaName}".navigation_role_bindings (nav_key, role_code, is_visible)
           VALUES ($1, 'admin', true)
           ON CONFLICT DO NOTHING`,
          [nav.nav_key]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    } catch {
      // navigation_role_bindings may not exist
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: 0,
      details: { navItemsSeeded: created },
    };
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    const errors: string[] = [];
    try {
      const result = await query(
        `SELECT COUNT(*) as cnt FROM "${ctx.schemaName}".navigation_registry WHERE is_active = true`
      );
      const count = parseInt(result.rows[0]?.cnt || '0');
      if (count < 5) {
        errors.push(`Expected at least 5 active nav items, found ${count}`);
      }
    } catch {
      errors.push('navigation_registry table not accessible');
    }
    return { valid: errors.length === 0, errors };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".navigation_registry WHERE product_key = $1`,
      [ctx.productKey]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
