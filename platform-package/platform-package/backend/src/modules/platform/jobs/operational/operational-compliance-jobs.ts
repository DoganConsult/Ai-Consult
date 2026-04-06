import { logger } from '../../../../platform/dos/observability/logger';
import { emptyResult } from '../../../../config/database/database';
/**
 * Compliance domain operational job definitions.
 * Covers CCM worker, regulatory delta scanner, regulatory change propagation,
 * qiyas GRC automation, evidence quality scoring, and regulatory deadline monitoring.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../platform/dos/resilience/resilient-catch';
import { lazyImport } from '../../../../platform/dos/core/lazy-import';

export async function getComplianceOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await lazyImport('../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // CCM worker — cadence-aware, every 10 min
    {
      name: 'ccm-worker',
      cron: '*/10 * * * *',
      handler: async () => {
        logger.info("[Job] ccm-worker executed");
        try {
          const { runCCMCycle } = await lazyImport("../../../compliance/services/ccm/ccm-worker.service");
          const tenants = await getProvisionedTenants();
          const now = new Date();
          const currentMinute = now.getUTCMinutes();

          for (const t of tenants) {
            try {
              const cadence = t.settings?.profileResolution?.reportingCadence;
              if (cadence === 'annual' && currentMinute !== 0) continue;
              if (cadence === 'semi_annual' && currentMinute !== 0 && currentMinute !== 30) continue;

              const result = await runCCMCycle(t.tenant_id);
              if (result.staleControls > 0 || result.escalationsTriggered > 0) {
                logger.info(`[Job] ccm-worker: tenant ${t.tenant_id} — ${result.staleControls} stale, ${result.escalationsTriggered} escalations`);
              }
            } catch { /* tenant may not have ucf_controls */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] ccm-worker error:", toErrorMessage(err));
        }
      },
    },

    // Regulatory Delta Scanner — every 12 hours
    {
      name: 'regulatory-delta-scanner',
      cron: '0 */12 * * *',
      handler: async () => {
        logger.info("[Job] regulatory-delta-scanner executed");
        try {
          const { scanAllInstruments } = await lazyImport("../../../compliance/services/regulatory/regulatory-delta.service");
          const { pushToTenant, buildWSEvent, getActiveTenantIds } = await lazyImport("../../../../platform/dos/events/websocket.service");
          const result = await scanAllInstruments();
          if (result.deltasFound > 0) {
            logger.info(`[Job] regulatory-delta-scanner: scanned ${result.scanned} instruments, found ${result.deltasFound} deltas`);
            const event = buildWSEvent('regulatory_feed_updated', { scanned: result.scanned, deltasFound: result.deltasFound, detectedAt: new Date().toISOString() });
            for (const tenantId of getActiveTenantIds()) {
              pushToTenant(tenantId, event);
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] regulatory-delta-scanner error:", toErrorMessage(err));
        }
      },
    },

    // Regulatory Change Propagation — daily at 6 AM
    {
      name: 'regulatory-change-propagation',
      cron: '0 6 * * *',
      handler: async () => {
        logger.info("[Job] regulatory-change-propagation executed");
        try {
          const { propagateRegulatoryChanges } = await lazyImport("../../../compliance/services/regulatory/regulatory-change-propagation.service");
          const result = await propagateRegulatoryChanges();
          if (result.changesProcessed > 0) {
            logger.info(`[Job] regulatory-change-propagation: ${result.changesProcessed} changes → ${result.tenantsNotified} tenant notifications`);
          }
        } catch (err: unknown) {
          logger.error("[Job] regulatory-change-propagation error:", toErrorMessage(err));
        }
      },
    },

    // Qiyas GRC Automation — every 2 minutes
    {
      name: 'qiyas-grc-automation',
      cron: '*/2 * * * *',
      handler: async () => {
        try {
          const { processAllTenantTriggers } = await lazyImport("../qiyas-grc-automation.processor");
          await processAllTenantTriggers();
        } catch (err: unknown) {
          logger.error("[Job] qiyas-grc-automation error:", toErrorMessage(err));
        }
      },
    },

    // Evidence quality scoring — daily at 3 AM
    // Re-scores evidence that may have become stale or needs re-evaluation
    {
      name: 'evidence-quality-scoring',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info("[Job] evidence-quality-scoring executed");
        try {
          const { batchScoreEvidenceQuality } = await lazyImport("../../../evidence/services/analysis/evidence-quality-scoring.service");
          const { safeQuery, tenantSchema } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          let totalScored = 0;
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);

              // Find evidence that needs re-scoring:
              // 1. Evidence that was last scored more than 30 days ago (or never scored)
              // 2. Evidence approaching expiry (within 7 days)
              // 3. Evidence with quality_tier = 'C' (low quality, may have improved)
              const evidenceResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
                `SELECT e.evidence_id
                 FROM "${schema}".evidence e
                 LEFT JOIN "${schema}".evidence_scores es ON es.evidence_id = e.evidence_id
                 WHERE e.status NOT IN ('expired', 'rejected', 'archived')
                   AND (
                     es.computed_at IS NULL
                     OR es.computed_at < NOW() - INTERVAL '30 days'
                     OR e.expiry_date IS NOT NULL AND e.expiry_date <= NOW() + INTERVAL '7 days'
                     OR e.quality_tier = 'C'
                   )
                 LIMIT 100`
              ), {  operation: 'fallback query' });

              const evidenceIds = evidenceResult.rows.map((r: GenericRow) => r.evidence_id).filter(Boolean);
              if (evidenceIds.length > 0) {
                const scores = await batchScoreEvidenceQuality(t.tenant_id, evidenceIds);
                totalScored += scores.length;
                logger.info(`[Job] evidence-quality-scoring: tenant ${t.tenant_id} — scored ${scores.length} evidence items`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] evidence-quality-scoring error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }
          if (totalScored > 0) {
            logger.info(`[Job] evidence-quality-scoring: ${totalScored} total evidence items scored across ${tenants.length} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] evidence-quality-scoring error:", toErrorMessage(err));
        }
      },
    },

    // Regulatory deadline monitoring — daily at 6 AM
    {
      name: 'regulatory-deadline-monitor',
      cron: '0 6 * * *',
      handler: async () => {
        logger.info("[Job] regulatory-deadline-monitor executed");
        try {
          const { monitorRegulatoryDeadlines } = await lazyImport("../../../compliance/services/regulatory/regulatory-calendar.service");
          const tenants = await getProvisionedTenants();
          let totalTasksCreated = 0;
          const allErrors: string[] = [];

          for (const t of tenants) {
            try {
              const { tasksCreated, errors } = await monitorRegulatoryDeadlines(t.tenant_id);
              totalTasksCreated += tasksCreated;
              if (errors.length > 0) {
                allErrors.push(...errors.map((e: any) => `[${t.tenant_id}] ${e}`));
              }
              if (tasksCreated > 0) {
                logger.info(`[Job] regulatory-deadline-monitor: tenant ${t.tenant_id} — created ${tasksCreated} tasks`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] regulatory-deadline-monitor error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalTasksCreated > 0) {
            logger.info(`[Job] regulatory-deadline-monitor: ${totalTasksCreated} total tasks created across ${tenants.length} tenants`);
          }
          if (allErrors.length > 0) {
            logger.warn(`[Job] regulatory-deadline-monitor: ${allErrors.length} errors occurred`);
          }
        } catch (err: unknown) {
          logger.error("[Job] regulatory-deadline-monitor error:", toErrorMessage(err));
        }
      },
    },
  ];
}
