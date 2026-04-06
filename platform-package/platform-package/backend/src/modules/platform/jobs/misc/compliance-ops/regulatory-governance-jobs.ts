// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger';
import { emptyResult } from '../../../../../config/database/database';
// ============================================
// Shahin GRC — Regulatory Governance Jobs
// ============================================

import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';
import type { GenericRow } from '../../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../../platform/dos/resilience/resilient-catch';

export async function getRegulatoryGovernanceJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Regulatory Change Propagation — daily at 6 AM
    {
      name: 'regulatory-change-propagation',
      cron: '0 6 * * *',
      handler: async () => {
        logger.info("[Job] regulatory-change-propagation executed");
        try {
          const { propagateRegulatoryChanges } = await import("../../../compliance/services/regulatory/regulatory-change-propagation.service");
          const result = await propagateRegulatoryChanges();
          if (result.changesProcessed > 0) {
            logger.info(`[Job] regulatory-change-propagation: ${result.changesProcessed} changes → ${result.tenantsNotified} tenant notifications`);
          }
        } catch (err: unknown) {
          logger.error("[Job] regulatory-change-propagation error:", toErrorMessage(err));
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
          const { scanAllInstruments } = await import("../../../compliance/services/regulatory/regulatory-delta.service");
          const { pushToTenant, getActiveTenantIds } = await import("../services/misc/websocket.service");
          const result = await scanAllInstruments();
          if (result.deltasFound > 0) {
            logger.info(`[Job] regulatory-delta-scanner: scanned ${result.scanned} instruments, found ${result.deltasFound} deltas`);
            const payload = { scanned: result.scanned, deltasFound: result.deltasFound, detectedAt: new Date().toISOString() };
            for (const tenantId of getActiveTenantIds()) {
              pushToTenant(tenantId, 'regulatory_feed_updated', payload);
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] regulatory-delta-scanner error:", toErrorMessage(err));
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
          const { monitorRegulatoryDeadlines } = await import('../../../compliance/services/regulatory/regulatory-calendar.service');
          const tenants = await getProvisionedTenants();
          let totalTasksCreated = 0;
          const allErrors: string[] = [];
          
          for (const t of tenants) {
            try {
              const { tasksCreated, errors } = await monitorRegulatoryDeadlines(t.tenant_id);
              totalTasksCreated += tasksCreated;
              if (errors.length > 0) {
                allErrors.push(...errors.map(e => `[${t.tenant_id}] ${e}`));
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
    // Governance Maturity Auto-Assessment — quarterly on 1st of Jan, Apr, Jul, Oct at 3 AM (Feature 50)
    {
      name: 'maturity-auto-assessment-quarterly',
      cron: '0 3 1 1,4,7,10 *',
      handler: async () => {
        logger.info("[Job] maturity-auto-assessment-quarterly executed");
        try {
          const { autoAssessMaturity } = await import('../../../governance/services/governance/governance-maturity-auto-assessment.service');
          const tenants = await getProvisionedTenants();
          let totalAssessments = 0;
          let totalErrors = 0;

          for (const t of tenants) {
            try {
              const result = await autoAssessMaturity(t.tenant_id);
              totalAssessments++;
              logger.info(`[Job] maturity-auto-assessment-quarterly: tenant ${t.tenant_id} — assessed at level ${result.level} (aggregate: ${result.aggregate.toFixed(2)})`);
            } catch (tenantErr: unknown) {
              totalErrors++;
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] maturity-auto-assessment-quarterly error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalAssessments > 0) {
            logger.info(`[Job] maturity-auto-assessment-quarterly: ${totalAssessments} assessments completed, ${totalErrors} errors across ${tenants.length} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] maturity-auto-assessment-quarterly error:", toErrorMessage(err));
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
          const { batchScoreEvidenceQuality } = await import("../../evidence/services/analysis/evidence-quality-scoring.service");
          const { safeQuery, tenantSchema } = await import('../../../../../config/database/database');
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
              ), { operation: 'fallback query' });

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
    // SoD Conflict Detection — daily at 2 AM (Priority 13)
    {
      name: 'sod-conflict-detection',
      cron: '0 2 * * *',
      handler: async () => {
        logger.info("[Job] sod-conflict-detection executed");
        try {
          const { detectSoDConflicts } = await import('../../../governance/services/governance/sod-conflict-detector.service');
          const tenants = await getProvisionedTenants();
          let totalConflicts = 0;
          for (const t of tenants) {
            try {
              const result = await detectSoDConflicts(t.tenant_id);
              totalConflicts += result.totalDetected;
              if (result.totalDetected > 0) {
                logger.info(`[Job] sod-conflict-detection: tenant ${t.tenant_id} — ${result.totalDetected} conflicts detected (${result.byType.raci} RACI, ${result.byType.authority} authority)`);
              }
              if (result.errors.length > 0) {
                logger.warn(`[Job] sod-conflict-detection: tenant ${t.tenant_id} — ${result.errors.length} errors:`, result.errors);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] sod-conflict-detection error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }
          if (totalConflicts > 0) {
            logger.info(`[Job] sod-conflict-detection: ${totalConflicts} total conflicts detected across ${tenants.length} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] sod-conflict-detection error:", toErrorMessage(err));
        }
      },
    },
  ];
}
