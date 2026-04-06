import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { PackManifest, ProvisioningContext, SeedInstallResult } from '../../types';

export class DashboardPackInstaller implements SeedInstaller {
  key = 'seed_dashboard_pack';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    let created = 0;

    const layouts = this.getLayouts(ctx.manifestBundle);

    for (const dashboardCode of layouts) {
      await query(
        `INSERT INTO "${ctx.schemaName}".dashboard_layouts (dashboard_code, name_en, name_ar, layout, audience, sort_order)
         VALUES ($1::text, $1::text, $1::text, $2::jsonb, 'default', 0)
         ON CONFLICT (dashboard_code) DO UPDATE SET
           name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, layout = EXCLUDED.layout
         WHERE (dashboard_layouts.name_en, dashboard_layouts.layout) IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.layout)`,
        [dashboardCode, JSON.stringify({ widgets: [] })]
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created++;
    }

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: 0 };
  }

  private getLayouts(manifests: PackManifest[]): string[] {
    const layouts = manifests.flatMap((m) => m.dashboard_pack?.layouts ?? []);
    return [...new Set(layouts)];
  }
}
