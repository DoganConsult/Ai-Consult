// @ts-nocheck
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult } from '../../types';
import { certifyAllModules } from '../../services/module/module-certification.service';
import { wireInboundEventListeners } from '../../services/misc/inbound-event-consumer.service';
import { computePackCertification, computeJourneyCertification, resetDailyErrorCounts } from '../../services/module/module-runtime-health.service';
import { safeQuery, tenantSchema } from '../../../../../config/database/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';

const LOG_TAG = '[CertBootstrap]';

export const certificationBootstrapInstaller: SeedInstaller = {
  key: 'certification-bootstrap',

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  },

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const tenantId = ctx.tenantId;
    const schema = tenantSchema(tenantId);
    let recordsCreated = 0;
    let recordsUpdated = 0;
    const warnings: string[] = [];

    try {
      await resetDailyErrorCounts(tenantId);
      recordsUpdated++;
    } catch (err) {
      warnings.push(`Health reset failed: ${(err as Error).message}`);
    }

    try {
      const reports = await certifyAllModules(tenantId);
      const certified = reports.filter(r => r.certificationState === 'CERTIFIED_A_PLUS_PLUS').length;
      recordsCreated += reports.length;
      logger.info(`${LOG_TAG} Certified ${certified}/${reports.length} modules for tenant ${tenantId}`);
    } catch (err) {
      warnings.push(`Module certification failed: ${(err as Error).message}`);
    }

    try {
      const { rows: packs } = await safeQuery(`SELECT pack_code FROM "${schema}".platform_products WHERE is_active = TRUE`);
      for (const p of packs) {
        await computePackCertification(tenantId, p.pack_code);
      }
      recordsUpdated += packs.length;
    } catch (err) {
      warnings.push(`Pack certification failed: ${(err as Error).message}`);
    }

    try {
      await computeJourneyCertification(tenantId);
      recordsUpdated++;
    } catch (err) {
      warnings.push(`Journey certification failed: ${(err as Error).message}`);
    }

    try {
      wireInboundEventListeners(tenantId);
      recordsCreated++;
    } catch (err) {
      warnings.push(`Event wiring failed: ${(err as Error).message}`);
    }

    return {
      installerKey: 'certification-bootstrap',
      status: warnings.length > 0 ? 'failed' : 'completed',
      recordsCreated,
      recordsUpdated,
      warnings,
    };
  },
};
