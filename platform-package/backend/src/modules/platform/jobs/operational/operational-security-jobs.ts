import { logger } from '../../../../platform/dos/observability/logger';
/**
 * Security domain operational job definitions.
 * Covers break-glass expiry, retired write guard, SoD conflict detection,
 * and insider threat detection.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';

export async function getSecurityOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Break-glass expiry — every 5 minutes
    {
      name: 'break-glass-expiry',
      cron: '*/5 * * * *',
      handler: async () => {
        logger.info("[Job] break-glass-expiry executed");
        try {
          const { expireBreakGlassEntries } = await import('../../../ai-governance/services/ai/ai-governance-ops.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const expired = await expireBreakGlassEntries(t.tenant_id);
              if (expired > 0) {
                logger.info(`[Job] break-glass-expiry: expired ${expired} entries for tenant ${t.tenant_id}`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] break-glass-expiry error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] break-glass-expiry error:", toErrorMessage(err));
        }
      },
    },

    // Retired Write Guard — daily at 3 AM
    {
      name: 'retired-write-guard',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info("[Job] retired-write-guard executed");
        try {
          const { runRetiredWriteGuardCheck } = await import('../../../../platform/dos/security/services/retired-write-guard.service');
          const result = await runRetiredWriteGuardCheck();
          if (result.status === 'violations_found') {
            logger.warn(`[Job] retired-write-guard: ${result.violations.length} violation(s) detected`);
          } else {
            logger.info(`[Job] retired-write-guard: clean — ${result.retiredTableCount} retired tables checked`);
          }
        } catch (err: unknown) {
          logger.error("[Job] retired-write-guard error:", toErrorMessage(err));
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

    // Insider Threat Detection — daily at 2 AM (Feature 48)
    {
      name: 'insider-threat-detection',
      cron: '0 2 * * *',
      handler: async () => {
        logger.info("[Job] insider-threat-detection executed");
        try {
          const { runThreatDetectionAnalysis } = await import('../../../../platform/dos/security/services/insider-threat-detection.service');
          const tenants = await getProvisionedTenants();
          let totalThreats = 0;
          let totalAlerts = 0;
          let totalIncidents = 0;

          for (const t of tenants) {
            try {
              const result = await runThreatDetectionAnalysis(t.tenant_id, 24, 40);
              totalThreats += result.threatsDetected;
              totalAlerts += result.alertsCreated;
              totalIncidents += result.incidentsCreated;

              if (result.threatsDetected > 0) {
                logger.info(`[Job] insider-threat-detection: tenant ${t.tenant_id} — ${result.threatsDetected} threats detected, ${result.alertsCreated} alerts, ${result.incidentsCreated} incidents`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] insider-threat-detection error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalThreats > 0) {
            logger.info(`[Job] insider-threat-detection: ${totalThreats} total threats detected, ${totalAlerts} alerts, ${totalIncidents} incidents across ${tenants.length} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] insider-threat-detection error:", toErrorMessage(err));
        }
      },
    },
    // RBAC Drift Detection — daily at 4 AM
    {
      name: 'rbac-drift-detection',
      cron: '0 4 * * *',
      handler: async () => {
        try {
          const { runDriftDetection } = await import('../../../ai/services/governance/compliance/ai-drift-detector.worker');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const report = await runDriftDetection(t.tenant_id);
              if (report.summary.totalDrifts > 0) {
                logger.info(`[Job] rbac-drift-detection: tenant ${t.tenant_id} — ${report.summary.totalDrifts} drifts (${report.summary.critical}C/${report.summary.high}H)`);
              }
            } catch { /* tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] rbac-drift-detection error:", toErrorMessage(err));
        }
      },
    },

    // Security Posture Assessment — daily at 4:30 AM
    {
      name: 'security-posture-assessment',
      cron: '30 4 * * *',
      handler: async () => {
        try {
          const { assessSecurityPosture } = await import('../../../ai/services/governance/compliance/ai-security-posture.worker');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const posture = await assessSecurityPosture(t.tenant_id);
              logger.info(`[Job] security-posture-assessment: tenant ${t.tenant_id} — score ${posture.overallScore}/100`);
            } catch { /* tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] security-posture-assessment error:", toErrorMessage(err));
        }
      },
    },

    // RBAC Optimization — weekly on Sunday at 5 AM (AI-4)
    {
      name: 'rbac-optimization',
      cron: '0 5 * * 0',
      handler: async () => {
        try {
          const { generatePermissionRecommendations } = await import('../../../ai/services/governance/ai-permission-recommender.service');
          const { runAutoRemediation } = await import('../../../ai/services/workflow/ai-auto-remediation.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const recs = await generatePermissionRecommendations(t.tenant_id);
              const remediation = await runAutoRemediation(t.tenant_id, true);
              if (recs.recommendations.length > 0 || remediation.actions.length > 0) {
                logger.info(`[Job] rbac-optimization: tenant ${t.tenant_id} — ${recs.recommendations.length} recommendations, ${remediation.actions.length} remediation proposals`);
              }
            } catch { /* tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] rbac-optimization error:", toErrorMessage(err));
        }
      },
    },

    // Audit Anomaly Detection — daily at 5:30 AM (AI-4)
    {
      name: 'audit-anomaly-detection',
      cron: '30 5 * * *',
      handler: async () => {
        try {
          const { detectAuditAnomalies } = await import('../../../ai/services/governance/compliance/ai-audit-anomaly.worker');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const report = await detectAuditAnomalies(t.tenant_id);
              if (report.summary.total > 0) {
                logger.info(`[Job] audit-anomaly-detection: tenant ${t.tenant_id} — ${report.summary.total} anomalies (${report.summary.critical}C/${report.summary.high}H)`);
              }
            } catch { /* tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] audit-anomaly-detection error:", toErrorMessage(err));
        }
      },
    },
  ];
}
