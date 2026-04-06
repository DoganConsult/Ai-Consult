// @ts-nocheck
import { JobDefinition } from '../job-types';
import { logger } from '../../../../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../../../../errors/http-error.util';
import { swallowDefault, EC , catchHandler } from '../../../../../platform/dos/resilience/resilient-catch';
import { emptyResult } from '../../../../../config/database/database';

export async function getAiAnalysisJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    {
      name: 'ai-drift-detection',
      cron: '0 * * * *',
      description: 'Hourly RBAC drift detection via AI drift detector',
      handler: async () => {
        try {
          const { runDriftDetection } = await import('../../../ai/services/governance/compliance/ai-drift-detector.worker');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runDriftDetection(t.tenant_id);
            } catch (err) {
              logger.warn(`[Job] ai-drift-detection failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-drift-detection fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'ai-security-posture',
      cron: '0 3 * * *',
      description: 'Daily security posture assessment at 3 AM',
      handler: async () => {
        try {
          const { assessSecurityPosture } = await import('../../../ai/services/governance/compliance/ai-security-posture.worker');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await assessSecurityPosture(t.tenant_id);
            } catch (err) {
              logger.warn(`[Job] ai-security-posture failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-security-posture fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'ai-rbac-optimization',
      cron: '0 4 * * 0',
      description: 'Weekly RBAC optimization analysis on Sundays at 4 AM',
      handler: async () => {
        try {
          const { runRoleMining } = await import('../../ai/services/ai-role-mining.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runRoleMining(t.tenant_id);
            } catch (err) {
              logger.warn(`[Job] ai-rbac-optimization failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-rbac-optimization fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'ai-audit-anomaly-detection',
      cron: '0 */4 * * *',
      description: 'Audit anomaly detection every 4 hours',
      handler: async () => {
        try {
          const { detectAuditAnomalies } = await import('../../../ai/services/governance/compliance/ai-audit-anomaly.worker');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await detectAuditAnomalies(t.tenant_id, 4);
            } catch (err) {
              logger.warn(`[Job] ai-audit-anomaly failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-audit-anomaly fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'ai-permission-recommendations',
      cron: '0 5 * * 1',
      description: 'Weekly permission recommendations on Mondays at 5 AM',
      handler: async () => {
        try {
          const { generatePermissionRecommendations } = await import('../../../ai/services/governance/ai-permission-recommender.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await generatePermissionRecommendations(t.tenant_id);
            } catch (err) {
              logger.warn(`[Job] ai-permission-recommendations failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-permission-recommendations fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'ai-auto-remediation',
      cron: '0 6 * * *',
      description: 'Daily auto-remediation scan (dry-run) at 6 AM',
      handler: async () => {
        try {
          const { runAutoRemediation } = await import('../../../ai/services/workflow/ai-auto-remediation.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runAutoRemediation(t.tenant_id, true);
            } catch (err) {
              logger.warn(`[Job] ai-auto-remediation failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-auto-remediation fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'ai-relearning-trigger-detection',
      cron: '0 2 * * *',
      description: 'Daily relearning trigger scan at 2 AM — detects inactive role agents',
      handler: async () => {
        try {
          const { detectRelearningTriggers } = await import('../../ai/services/employee-role-agent.service');
          const { getPool } = await import('../../../../../config/db/pool');
          const pool = getPool();
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const triggers = await detectRelearningTriggers(pool, t.tenant_id);
              if (triggers.length > 0) {
                logger.info(`[Job] ai-relearning-trigger: ${t.tenant_id} — ${triggers.length} agents need refresh`);
              }
            } catch (err) {
              logger.warn(`[Job] ai-relearning-trigger failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-relearning-trigger fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'module-health-check',
      cron: '*/30 * * * *',
      description: 'Module health check every 30 minutes',
      handler: async () => {
        try {
          const { checkAllModulesHealth } = await import('../services/module/module-health.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const results = await checkAllModulesHealth(t.tenant_id);
              const unhealthy = results.filter(r => r.status === 'unhealthy').length;
              const degraded = results.filter(r => r.status === 'degraded').length;
              if (unhealthy > 0 || degraded > 0) {
                logger.warn(`[Job] module-health: ${t.tenant_id} — ${unhealthy} unhealthy, ${degraded} degraded`);
              }
            } catch (err) {
              logger.warn(`[Job] module-health-check failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] module-health-check fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // AI-First Analysis Jobs — DB-driven, dynamic
    // ═══════════════════════════════════════════════════════════════

    {
      name: 'ai-compliance-posture',
      cron: '0 5 * * *',
      description: 'Daily compliance posture assessment at 5 AM',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
          for (const t of tenants.rows) {
            try {
              const { runCompliancePostureAssessment } = await import('../services/misc/ai-compliance-posture.worker');
              await runCompliancePostureAssessment(t.tenant_id);
            } catch (err) {
              logger.warn(`[Job] ai-compliance-posture failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-compliance-posture fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'ai-evidence-staleness',
      cron: '0 */6 * * *',
      description: 'Evidence staleness monitor every 6 hours — notifies owners of stale evidence',
      handler: async () => {
        try {
          const { safeQuery, tenantSchema } = await import('../../../../../config/database/database');
          const tenants = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
          for (const t of tenants.rows) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const staleEvidence = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
                `SELECT evidence_id, control_id, title, last_collected_at
                 FROM "${schema}".evidence
                 WHERE status = 'active' AND last_collected_at < NOW() - INTERVAL '60 days'`
              ), { operation: 'query evidence' });

              if (staleEvidence.rows.length > 0) {
                // Create notification for evidence owners (cap at 20 per cycle)
                for (const ev of staleEvidence.rows.slice(0, 20)) {
                  await safeQuery(
                    `INSERT INTO "${schema}".notification_queue (tenant_id, recipient_id, notification_type, subject, body, priority)
                     SELECT $1, c.owner, 'stale_evidence', $2, $3, 'medium'
                     FROM "${schema}".controls c WHERE c.control_id = $4`,
                    [t.tenant_id, `Stale Evidence: ${ev.title}`,
                     `Evidence "${ev.title}" has not been collected since ${ev.last_collected_at}. Please update.`,
                     ev.control_id]
                  ).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
            } catch (err) {
              logger.warn(`[Job] ai-evidence-staleness failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] ai-evidence-staleness fatal: ${toErrorMessage(err)}`);
        }
      },
    },

    {
      name: 'dynamic-signal-scan',
      cron: '*/30 * * * *',
      description: 'Dynamic signal scan every 30 minutes — DB-driven detector execution',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
          for (const t of tenants.rows) {
            try {
              const { runDynamicSignalScan } = await import('../../../../governance-ai/signal-detection.service');
              const result = await runDynamicSignalScan(t.tenant_id);
              if (result.signals_created > 0) {
                logger.info(`[Job] dynamic-signal-scan tenant=${t.tenant_id} created=${result.signals_created} detectors=${result.detectors_run}`);
              }
            } catch (err) {
              logger.warn(`[Job] dynamic-signal-scan failed for ${t.tenant_id}: ${toErrorMessage(err)}`);
            }
          }
        } catch (err) {
          logger.error(`[Job] dynamic-signal-scan fatal: ${toErrorMessage(err)}`);
        }
      },
    },
  ];
}
