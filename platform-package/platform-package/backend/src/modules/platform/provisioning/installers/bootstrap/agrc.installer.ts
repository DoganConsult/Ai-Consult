import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult } from '../../types';
import { getDefaultProductKey } from '../../../../../platform/deployment-profile';

export class AgrcSeedInstaller implements SeedInstaller {
  key = 'install_agrc_pack';

  async canInstall(ctx: ProvisioningContext): Promise<boolean> {
    return ctx.enabledModules.includes(getDefaultProductKey()) || ctx.subscriptionTier === 'continuous';
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    let created = 0;

    // SLA tiers
    await query(
      `INSERT INTO "${ctx.schemaName}".sla_tiers (tier_code, response_hours, escalation_role, resolution_hours)
       VALUES
         ('critical', 4, 'executive', 24),
         ('high', 8, 'manager', 48),
         ('medium', 24, 'admin', 90),
         ('low', 48, 'admin', 120),
         ('operational', 12, 'admin', 90),
         ('cyber', 10, 'admin', 60),
         ('data', 10, 'admin', 60)
       ON CONFLICT (tier_code) DO UPDATE SET
         response_hours = EXCLUDED.response_hours, escalation_role = EXCLUDED.escalation_role, resolution_hours = EXCLUDED.resolution_hours
         WHERE (sla_tiers.response_hours, sla_tiers.escalation_role) IS DISTINCT FROM (EXCLUDED.response_hours, EXCLUDED.escalation_role)`
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    created += 7;

    // Default scoring policy
    await query(
      `INSERT INTO "${ctx.schemaName}".scoring_policies (name, weights, is_default)
       VALUES ('Default AGRC Scoring', $1::jsonb, true)`,
      [JSON.stringify({ controls: 0.35, evidence: 0.25, findings: 0.2, obligations: 0.2 })]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    created++;

    // Feature flags from manifest
    const featureFlags = this.collectFeatureFlags(ctx);
    for (const [key, value] of Object.entries(featureFlags)) {
      await query(
        `INSERT INTO "${ctx.schemaName}".feature_flags (feature_key, enabled, created_at, updated_at)
         VALUES ($1::text, $2::boolean, now(), now())
         ON CONFLICT (feature_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
        [key, !!value]
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created++;
    }

    // Widget definitions from manifest
    const widgets = ctx.manifestBundle.flatMap(m => m.widget_definitions ?? []);
    for (const w of widgets) {
      await query(
        `INSERT INTO "${ctx.schemaName}".dashboard_widget_registry
          (widget_key, label_en, label_ar, module_code, component_key, default_width, default_height, default_config, is_system, is_active, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true, true, $9, now(), now())
         ON CONFLICT (widget_key) DO UPDATE SET
           label_en=EXCLUDED.label_en, label_ar=EXCLUDED.label_ar, component_key=EXCLUDED.component_key, updated_at=now()`,
        [w.widget_key, w.label_en, w.label_ar, w.module_code, w.component_key, w.default_width, w.default_height, JSON.stringify(w.default_config ?? {}), w.sort_order]
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created++;
    }

    // Dashboard definitions from manifest
    const dashboards = ctx.manifestBundle.flatMap(m => m.dashboard_definitions ?? []);
    for (const d of dashboards) {
      await query(
        `INSERT INTO "${ctx.schemaName}".dashboard_registry
          (dashboard_code, name_en, name_ar, audience, module_code, route, layout, is_system, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true, true, $8)
         ON CONFLICT (dashboard_code) DO UPDATE SET layout=EXCLUDED.layout, updated_at=now()`,
        [d.dashboard_code, d.name_en, d.name_ar, d.audience, d.module_code, d.route, JSON.stringify(d.layout), d.sort_order]
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created++;

      // Dashboard role bindings
      for (const rb of d.role_bindings ?? []) {
        await query(
          `INSERT INTO "${ctx.schemaName}".dashboard_role_bindings (dashboard_code, role_code, is_allowed, is_default)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (dashboard_code, role_code) DO UPDATE SET
             is_allowed = EXCLUDED.is_allowed, is_default = EXCLUDED.is_default`,
          [d.dashboard_code, rb.role_code, rb.is_allowed, rb.is_default]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
        created++;
      }
    }

    // Content pack installation records from manifest
    const packInstalls = ctx.manifestBundle.flatMap(m => m.content_pack_installations ?? []);
    for (const pi of packInstalls) {
      await query(
        `INSERT INTO "${ctx.schemaName}".content_pack_installations (installation_id, pack_id, version, status, installed_by)
         VALUES (gen_random_uuid(), $1, $2, 'installed', 'system')
         ON CONFLICT DO NOTHING`,
        [pi.pack_id, pi.version]
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      created++;
    }

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: 0 };
  }

  private collectFeatureFlags(ctx: ProvisioningContext): Record<string, boolean | string | number> {
    const flags: Record<string, boolean | string | number> = {};
    for (const m of ctx.manifestBundle) {
      if (m.feature_flags) {
        Object.assign(flags, m.feature_flags);
      }
    }
    return flags;
  }
}
