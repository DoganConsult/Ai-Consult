import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

export class SharedBaseInstaller implements SeedInstaller {
  key = 'install_shared_base_pack';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    return {
      valid: !!ctx.tenantId && !!ctx.schemaName,
      errors: !ctx.tenantId || !ctx.schemaName ? ['Missing tenant identity or schema'] : [],
    };
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    let created = 0;
    let updated = 0;

    const defaultDashboard = ctx.manifestBundle
      .map(m => m.dashboard_pack?.default_dashboard)
      .find(Boolean) ?? 'dashboard';

    // tenant_config_versions
    await query(
      `INSERT INTO "${ctx.schemaName}".tenant_config_versions (version_number, config, changed_by, changed_at)
       VALUES (1, $1::jsonb, $2::text, now())`,
      [JSON.stringify({ bootstrap: true, locale: ctx.locale, subscriptionTier: ctx.subscriptionTier }), ctx.actorUserId]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    created++;

    // workspace_profile (tenant_id is VARCHAR(64))
    await query(
      `INSERT INTO "${ctx.schemaName}".workspace_profile (tenant_id, industry, org_size, sectors, default_dashboard, risk_appetite, enforcement_mode, evidence_freshness_days)
       VALUES ($1, 'Government', 'Enterprise', '[]'::jsonb, $2::text, 'moderate', 'advisory', 30)
       ON CONFLICT (tenant_id) DO UPDATE
         SET default_dashboard = EXCLUDED.default_dashboard,
             enforcement_mode = EXCLUDED.enforcement_mode,
             updated_at = now()`,
      [ctx.tenantId, defaultDashboard]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    updated++;

    // tenant security config defaults
    await query(
      `INSERT INTO "${ctx.schemaName}".tenant_security_config (config_key, config_value, data_type, category)
       VALUES ('session_timeout_minutes', '480', 'number', 'session')
       ON CONFLICT (config_key) DO UPDATE SET
         config_value = EXCLUDED.config_value, data_type = EXCLUDED.data_type, category = EXCLUDED.category
       WHERE (tenant_security_config.config_value, tenant_security_config.data_type) IS DISTINCT FROM (EXCLUDED.config_value, EXCLUDED.data_type)`
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    created++;

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: updated };
  }
}
