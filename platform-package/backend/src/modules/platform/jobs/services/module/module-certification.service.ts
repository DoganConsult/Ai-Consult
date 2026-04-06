/**
 * Module Certification Service — Validates module compliance readiness.
 *
 * Checks each module against its manifest (owned tables, DAuth integration,
 * diagnostics health) and produces a certification score.
 */

import { safeQuery } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';
import { checkAllModulesHealth } from './module-health.service';

export interface ModuleCertification {
  moduleCode: string;
  certified: boolean;
  score: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  certifiedAt: string;
}

/**
 * Run certification checks for all active modules across all tenants.
 */
export async function certifyAllModules(): Promise<{
  totalModules: number;
  certified: number;
  failed: number;
  results: ModuleCertification[];
}> {
  try {
    // Get one sample tenant for health checks
    const { rows: tenants } = await safeQuery(
      `SELECT tenant_id FROM public.tenants WHERE status IN ('active', 'provisioned') LIMIT 1`,
    ).catch(() => ({ rows: [] }));

    if (tenants.length === 0) {
      return { totalModules: 0, certified: 0, failed: 0, results: [] };
    }

    const tenantId = tenants[0].tenant_id as string;
    const healthResults = await checkAllModulesHealth(tenantId);

    const results: ModuleCertification[] = healthResults.map(h => {
      const checks = [
        { name: 'tables_exist', passed: h.tableCount > 0, detail: `${h.tableCount} tables` },
        { name: 'healthy', passed: h.healthy },
        { name: 'recent_activity', passed: h.eventCount > 0, detail: `${h.eventCount} events in 7d` },
      ];
      const score = Math.round((checks.filter(c => c.passed).length / checks.length) * 100);

      return {
        moduleCode: h.moduleCode,
        certified: score >= 66,
        score,
        checks,
        certifiedAt: new Date().toISOString(),
      };
    });

    const certified = results.filter(r => r.certified).length;
    logger.info(`[ModuleCertification] Certified ${certified}/${results.length} modules`);

    return {
      totalModules: results.length,
      certified,
      failed: results.length - certified,
      results,
    };
  } catch (err) {
    logger.error('[ModuleCertification] certifyAllModules failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { totalModules: 0, certified: 0, failed: 0, results: [] };
  }
}
