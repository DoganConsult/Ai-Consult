import { emptyResult, query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult } from '../../types';
import { swallowDefault, EC , catchHandler } from '../../../../../platform/dos/resilience/resilient-catch';

export class QiyasSeedInstaller implements SeedInstaller {
  key = 'install_qiyas_pack';

  async canInstall(ctx: ProvisioningContext): Promise<boolean> {
    return ctx.enabledModules.includes('qiyas');
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    let created = 0;

    // Starter Qiyas model
    const modelRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `INSERT INTO "${ctx.schemaName}".qiyas_models (code, name_en, name_ar, description_en, model_type, status)
       VALUES ('starter_maturity', 'Starter Maturity Model', 'نموذج النضج التمهيدي', 'Default maturity model for new tenants', 'maturity', 'active')
       ON CONFLICT (code) DO UPDATE SET
         name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, description_en = EXCLUDED.description_en
       WHERE (qiyas_models.name_en, qiyas_models.description_en) IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.description_en)
       RETURNING model_id`,
    ), { operation: 'fallback query' });
    if (modelRes.rows.length > 0) created++;

    // Scoring method
    await query(
      `INSERT INTO "${ctx.schemaName}".qiyas_scoring_methods (code, name_en, name_ar, method_type)
       VALUES ('weighted_maturity', 'Weighted Maturity', 'النضج الموزون', 'weighted_average')
       ON CONFLICT (code) DO UPDATE SET
         name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, method_type = EXCLUDED.method_type
       WHERE (qiyas_scoring_methods.name_en, qiyas_scoring_methods.method_type) IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.method_type)`
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    created++;

    // Rating scale 0–5
    await query(
      `INSERT INTO "${ctx.schemaName}".qiyas_rating_scales (code, name_en, name_ar, scale_type, levels, min_value, max_value)
       VALUES ('maturity_0_5', 'Maturity 0-5', 'مستويات النضج 0-5', 'numeric', $1::jsonb, 0, 5)
       ON CONFLICT (code) DO UPDATE SET
         name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, levels = EXCLUDED.levels
       WHERE (qiyas_rating_scales.name_en, qiyas_rating_scales.levels) IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.levels)`,
      [JSON.stringify([
        { level: 0, label_en: 'Not Started',  label_ar: 'غير مبدوء' },
        { level: 1, label_en: 'Initial',      label_ar: 'ابتدائي' },
        { level: 2, label_en: 'Managed',      label_ar: 'مُدار' },
        { level: 3, label_en: 'Defined',      label_ar: 'مُعرّف' },
        { level: 4, label_en: 'Measured',     label_ar: 'مقاس' },
        { level: 5, label_en: 'Optimized',    label_ar: 'محسّن' },
      ])]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    created++;

    return { installerKey: this.key, status: 'completed', recordsCreated: created, recordsUpdated: 0 };
  }
}
