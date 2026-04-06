// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger';
// ============================================
// Shahin GRC — Infrastructure Jobs
// ============================================

import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getInfrastructureJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Connector health check — every 15 minutes
    {
      name: 'connector-health-check',
      cron: '*/15 * * * *',
      handler: async () => {
        logger.info("[Job] connector-health-check executed");
        try {
          const { getHealthDashboard } = await import("../../../../integrations/services/connector.service");
          const { createNotification } = await import('../../../../notification/services/notification.service');
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const health = await getHealthDashboard(t.tenant_id);
              const failed = health.connectors.filter(h => h.status === 'failed');
              if (failed.length > 0) {
                // Notify tenant admins about failed connectors
                const admins = await safeQuery(
                  `SELECT user_id FROM users WHERE tenant_id = $1 AND role IN ('admin', 'grc_manager') LIMIT 5`,
                  [t.tenant_id]
                );
                for (const admin of admins.rows) {
                  await createNotification(t.tenant_id, {
                    userId: admin.user_id,
                    type: 'connector_alert',
                    title: `${failed.length} connector(s) failing`,
                    body: `Connectors with repeated failures: ${failed.map(f => f.connectorId).join(', ')}`,
                    link: '/connectors',
                  });
                }
              }
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] connector-health-check error:", toErrorMessage(err));
        }
      },
    },
    // Materialized View Refresh — every 15 minutes
    {
      name: 'materialized-view-refresh',
      cron: '*/15 * * * *',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          await safeQuery(`SELECT public.refresh_materialized_views()`, []);
        } catch (err: unknown) {
          if (!toErrorMessage(err).includes("does not exist")) {
            logger.error("[Job] materialized-view-refresh error:", toErrorMessage(err));
          }
        }
      },
    },
    // Email Inbox Poll — every 5 minutes
    {
      name: 'email-inbox-poll',
      cron: '*/5 * * * *',
      handler: async () => {
        if (process.env.EMAIL_AUTH_TYPE !== 'oauth2') return;
        try {
          const { pollAllTenants } = await import("../services/email/email-inbox.service");
          const results = await pollAllTenants();
          if (results.messagesProcessed > 0) {
            logger.info(`[Job] email-inbox-poll: ${results.messagesProcessed} new messages synced across ${results.tenantsPolled} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] email-inbox-poll error:", toErrorMessage(err));
        }
      },
    },
    // Qiyas GRC Automation — every 2 minutes
    {
      name: 'qiyas-grc-automation',
      cron: '*/2 * * * *',
      handler: async () => {
        try {
          const { processAllTenantTriggers } = await import("../../../qiyas-grc-automation.processor");
          await processAllTenantTriggers();
        } catch (err: unknown) {
          logger.error("[Job] qiyas-grc-automation error:", toErrorMessage(err));
        }
      },
    },
    // CCM worker — cadence-aware, every 10 min
    {
      name: 'ccm-worker',
      cron: '*/10 * * * *',
      handler: async () => {
        logger.info("[Job] ccm-worker executed");
        try {
          const { runCCMCycle } = await import("../../../compliance/services/ccm/ccm-worker.service");
          const tenants = await getProvisionedTenants();
          const now = new Date();
          const __currentHour = now.getUTCHours();
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
    // Provisioning Health Check — every 5 min
    {
      name: 'provisioning-health-check',
      cron: '*/5 * * * *',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          // Find jobs stuck in 'running' for > 30 min or 'queued' with steps started > 10 min ago
          const stuckJobs = await safeQuery(`
            SELECT j.id AS job_id, j.tenant_id, j.job_status,
                   COUNT(s.id) FILTER (WHERE s.status = 'queued') AS queued_steps,
                   COUNT(s.id) FILTER (WHERE s.status = 'completed') AS completed_steps,
                   COUNT(s.id) FILTER (WHERE s.status = 'failed') AS failed_steps,
                   j.created_at
            FROM provisioning_jobs j
            LEFT JOIN provisioning_steps s ON s.job_id = j.id
            WHERE j.job_status IN ('running', 'queued')
              AND j.created_at < NOW() - INTERVAL '30 minutes'
              AND j.created_at > NOW() - INTERVAL '24 hours'
            GROUP BY j.id, j.tenant_id, j.job_status, j.created_at
            HAVING COUNT(s.id) FILTER (WHERE s.status = 'queued') > 0
            ORDER BY j.created_at ASC
            LIMIT 5
          `);

          if (stuckJobs.rows.length === 0) return;
          logger.info(`[Job] provisioning-health-check: found ${stuckJobs.rows.length} stuck job(s)`);

          for (const job of stuckJobs.rows) {
            try {
              // Reset stuck 'running' steps back to 'queued'
              await safeQuery(`
                UPDATE provisioning_steps SET status = 'queued', error_message = NULL
                WHERE job_id = $1 AND status = 'running'
              `, [job.job_id]);

              // Reset job status to 'running' to allow step-runner to pick it up
              await safeQuery(`
                UPDATE provisioning_jobs SET job_status = 'running', updated_at = NOW()
                WHERE id = $1
              `, [job.job_id]);

              // Re-trigger the step runner
              const { ProvisioningStepRunnerService } = await import('../../../onboarding/services/provisioning/provisioning-step-runner.service');
              const runner = new ProvisioningStepRunnerService();
              setImmediate(() => runner.runJob(job.job_id).catch((e: unknown) =>
                logger.error(`[Job] provisioning-health-check: retry failed for job ${job.job_id}:`, toErrorMessage(e))
              ));

              logger.info(`[Job] provisioning-health-check: retrying job ${job.job_id} for tenant ${job.tenant_id} (${job.completed_steps} done, ${job.queued_steps} queued)`);
            } catch (err: unknown) {
              logger.error(`[Job] provisioning-health-check: error retrying job ${job.job_id}:`, toErrorMessage(err));
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] provisioning-health-check error:", toErrorMessage(err));
        }
      },
    },
    // Module Lifecycle Monitor — every 15 min
    {
      name: 'module-lifecycle-monitor',
      cron: '*/15 * * * *',
      handler: async () => {
        try {
          const tenants = await getProvisionedTenants();
          const { safeQuery, tenantSchema } = await import('../../../../../config/database/database');
          const { createProcessTask } = await import('../../../workflow/services/tasks/process-orchestration.service');
          const { eventBus } = await import('../../../../../platform/dos/events/event-bus');

          const MODULE_ENTITY_MAP: Record<string, { table: string; idCol: string; statusCol: string }> = {
            risk:        { table: 'risks',             idCol: 'risk_id',        statusCol: 'status' },
            compliance:  { table: 'controls',          idCol: 'control_id',     statusCol: 'status' },
            policy:      { table: 'policies',          idCol: 'policy_id',      statusCol: 'status' },
            evidence:    { table: 'evidence',          idCol: 'evidence_id',    statusCol: 'status' },
            audit:       { table: 'audit_engagements', idCol: 'engagement_id',  statusCol: 'status' },
            incident:    { table: 'incidents',         idCol: 'incident_id',    statusCol: 'status' },
            exception:   { table: 'exceptions',        idCol: 'exception_id',   statusCol: 'status' },
            governance:  { table: 'governance_bodies',  idCol: 'body_id',       statusCol: 'status' },
            vendor:      { table: 'vendors',           idCol: 'vendor_id',      statusCol: 'status' },
            bcp:         { table: 'bcp_plans',         idCol: 'plan_id',        statusCol: 'status' },
            asset:       { table: 'assets',            idCol: 'asset_id',       statusCol: 'status' },
            remediation: { table: 'remediation_tasks', idCol: 'task_id',        statusCol: 'status' },
            action:      { table: 'action_items',      idCol: 'item_id',        statusCol: 'status' },
          };

          let totalBreaches = 0;
          let totalSodConflicts = 0;

          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);

              // 1. Find SLA-expired transitions
              const transitions = await safeQuery(
                `SELECT transition_id, module_code, from_status, to_status, sla_hours, authority_level
                 FROM "${schema}".module_lifecycle_transitions
                 WHERE sla_hours IS NOT NULL AND sla_hours > 0`
              );

              for (const tr of transitions.rows) {
                const entityDef = MODULE_ENTITY_MAP[tr.module_code];
                if (!entityDef) continue;

                try {
                  const breached = await safeQuery(
                    `SELECT ${entityDef.idCol} AS entity_id
                     FROM "${schema}".${entityDef.table}
                     WHERE ${entityDef.statusCol} = $1
                       AND updated_at < NOW() - ($2 || ' hours')::INTERVAL
                       AND deleted_at IS NULL
                     LIMIT 50`,
                    [tr.from_status, tr.sla_hours]
                  );

                  for (const entity of breached.rows) {
                    totalBreaches++;
                    try {
                      await createProcessTask(t.tenant_id, {
                        title: `SLA breach: ${tr.module_code} ${entity.entity_id} stuck in ${tr.from_status} > ${tr.sla_hours}h`,
                        description: `Entity ${entity.entity_id} in module ${tr.module_code} has exceeded the ${tr.sla_hours}-hour SLA for transition from ${tr.from_status} to ${tr.to_status}`,
                        entityType: tr.module_code,
                        entityId: entity.entity_id,
                        taskType: 'remediation',
                        priority: 'high',
                      });
                    } catch { /* task creation non-fatal */ }

                    try {
                      await eventBus.publish({
                        eventType: `${tr.module_code}.sla_breached`,
                        tenantId: t.tenant_id,
                        sourceService: 'module-lifecycle-monitor',
                        entityType: tr.module_code,
                        entityId: entity.entity_id,
                        severity: 'warning',
                        payload: { fromStatus: tr.from_status, toStatus: tr.to_status, slaHours: tr.sla_hours },
                      });
                    } catch { /* event emission non-fatal */ }
                  }
                } catch { /* per-transition non-fatal (table may not exist) */ }
              }

              // 2. Detect active SoD violations: users holding conflicting roles
              try {
                const sodConflicts = await safeQuery(
                  `SELECT sr.rule_name, sr.role_a, sr.role_b, sr.severity,
                          a1.user_id, a1.functional_role_code AS held_role_a, a2.functional_role_code AS held_role_b
                   FROM "${schema}".sod_rules sr
                   JOIN "${schema}".enterprise_user_role_assignments a1
                     ON a1.functional_role_code = sr.role_a AND a1.is_active = true
                   JOIN "${schema}".enterprise_user_role_assignments a2
                     ON a2.functional_role_code = sr.role_b AND a2.is_active = true
                     AND a1.user_id = a2.user_id
                   WHERE sr.is_active = true
                   LIMIT 100`
                );

                for (const conflict of sodConflicts.rows) {
                  totalSodConflicts++;
                  try {
                    await createProcessTask(t.tenant_id, {
                      title: `SoD conflict: ${conflict.user_id} holds ${conflict.held_role_a} + ${conflict.held_role_b}`,
                      description: `Rule "${conflict.rule_name}" violated: user holds incompatible roles ${conflict.role_a} and ${conflict.role_b} (severity: ${conflict.severity})`,
                      entityType: 'sod_violation',
                      entityId: conflict.user_id,
                      taskType: 'control_review',
                      priority: conflict.severity === 'critical' ? 'critical' : 'high',
                    });
                  } catch { /* non-fatal */ }
                }
              } catch { /* sod_rules table may not exist — non-fatal */ }

            } catch (e: unknown) {
              if (!toErrorMessage(e).includes("does not exist")) {
                logger.error(`[Job] module-lifecycle-monitor error for ${t.tenant_id}: ${toErrorMessage(e)}`);
              }
            }
          }

          if (totalBreaches > 0 || totalSodConflicts > 0) {
            logger.info(`[Job] module-lifecycle-monitor: ${totalBreaches} SLA breaches, ${totalSodConflicts} SoD conflicts across ${tenants.length} tenants`);
          }
        } catch (err: unknown) { logger.error("[Job] module-lifecycle-monitor error:", toErrorMessage(err)); }
      },
    },
    // Retired Write Guard — daily at 3 AM
    {
      name: 'retired-write-guard',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info("[Job] retired-write-guard executed");
        try {
          const { runRetiredWriteGuardCheck } = await import('../../services/misc/retired-write-guard.service');
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
    // Autonomy Review — monthly on the 1st at 2 AM (Feature 19)
    {
      name: 'autonomy-review',
      cron: '0 2 1 * *',
      handler: async () => {
        logger.info("[Job] autonomy-review executed");
        try {
          const { reviewTenantAutonomy } = await import('../../services/autonomy/autonomy-review.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const recommendation = await reviewTenantAutonomy(t.tenant_id);
              if (recommendation) {
                logger.info(`[Job] autonomy-review: tenant ${t.tenant_id} — current: ${recommendation.currentMode}, recommended: ${recommendation.recommendedMode}, ` +
                  `accuracy: ${(recommendation.metrics.avgEvalScore * 100).toFixed(1)}%, ` +
                  `HITL override: ${(recommendation.metrics.hitlOverrideRate * 100).toFixed(1)}%, ` +
                  `consecutive passes: ${recommendation.consecutivePassCycles}`);
              }
            } catch (err: unknown) {
              logger.warn(`[Job] autonomy-review failed for tenant ${t.tenant_id}:`, toErrorMessage(err));
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] autonomy-review error:", toErrorMessage(err));
        }
      },
    },
  ];
}
