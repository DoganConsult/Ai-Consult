// @ts-nocheck
import { catchHandler, EC } from '../../../../platform/dos/resilience/resilient-catch';
import { getProductUrl } from '../../../../platform/dos/branding/product-identity';
/**
 * Miscellaneous operational job definitions.
 * Covers connector health check, engagement OS orchestrator, email inbox poll,
 * report schedule execution, personal agent SLA check, and module lifecycle monitor.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { lazyImport } from '../../../../platform/dos/core/lazy-import';
import { getFirstRow } from '../../../../shared/data/db-utils';

export async function getOtherOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await lazyImport('../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Connector health check — every 15 minutes
    {
      name: 'connector-health-check',
      cron: '*/15 * * * *',
      handler: async () => {
        logger.info("[Job] connector-health-check executed");
        try {
          const { getHealthDashboard } = await lazyImport("../../../integrations/services/connector.service");
          const { createNotification } = await lazyImport("../../../notification/services/notification.service");
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const health = await getHealthDashboard(t.tenant_id);
              const failed = health.filter((h: unknown) => h.status === 'failed');
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
                    body: `Connectors with repeated failures: ${failed.map((f: unknown) => f.connectorId).join(', ')}`,
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

    // Engagement OS Orchestrator — every 15 minutes
    {
      name: 'engagement-os-orchestrator',
      cron: '*/15 * * * *',
      handler: async () => {
        logger.info("[Job] engagement-os-orchestrator executed");
        try {
          const { runEngagementOSCycle } = await lazyImport("../../../analytics/services/engagement/engagement-os-orchestrator.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runEngagementOSCycle(t.tenant_id);
            } catch { /* tenant cycle failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] engagement-os-orchestrator error:", toErrorMessage(err));
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
          const { pollAllTenants } = await lazyImport("../../services/email/email-inbox.service");
          const results = await pollAllTenants(10);
          const totalNew = Object.values(results as Record<string, { newMessages: number }>).reduce((s, r) => s + r.newMessages, 0);
          if (totalNew > 0) {
            logger.info(`[Job] email-inbox-poll: ${totalNew} new messages synced`);
          }
        } catch (err: unknown) {
          logger.error("[Job] email-inbox-poll error:", toErrorMessage(err));
        }
      },
    },

    // Report schedule execution — every minute
    {
      name: 'report-schedule-execution',
      cron: '* * * * *',
      handler: async () => {
        logger.info("[Job] report-schedule-execution executed");
        try {
          const { generateReport } = await lazyImport("../../../reporting/services/report/report-generator.service");
          const { CronExpressionParser } = await import("cron-parser");
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            const schema = `tenant_${t.tenant_id}`;
            try {
              const schedules = await safeQuery(
                `SELECT * FROM "${schema}".report_schedules WHERE enabled = TRUE`
              );
              for (const schedule of schedules.rows) {
                // Evaluate the cron expression to check if this schedule is due
                try {
                  const expr = CronExpressionParser.parse(schedule.cron_expression);
                  const prevDue = expr.prev().toDate();
                  const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : new Date(0);
                  // Schedule is due if the last cron match is after the last run
                  if (prevDue.getTime() <= lastRun.getTime()) continue;
                } catch (err: unknown) {
                  logger.warn('[Job] Invalid cron expression for scheduled report', {
                    scheduleId: schedule.schedule_id,
                    cronExpression: schedule.cron_expression,
                    error: toErrorMessage(err)
                  });
                  logger.error(`[Job] Invalid cron expression for schedule ${schedule.schedule_id}: ${schedule.cron_expression}`);
                  continue;
                }

                try {
                  const reportData = await generateReport(
                    t.tenant_id,
                    schedule.report_type,
                    schedule.parameters || {}
                  );

                  // Store generated report
                  const reportTitle = `${schedule.report_type} — ${new Date().toISOString().split('T')[0]}`;
                  const insertResult = await safeQuery(
                    `INSERT INTO "${schema}".reports (title, type, parameters, generated_by, generated_at)
                     VALUES ($1, $2, $3, $4, NOW()) RETURNING report_id`,
                    [reportTitle, schedule.report_type, JSON.stringify(reportData), schedule.created_by || 'scheduler']
                  );
                  const reportId = getFirstRow(insertResult)?.report_id;

                  // Update last_run_at
                  await safeQuery(
                    `UPDATE "${schema}".report_schedules SET last_run_at = NOW() WHERE schedule_id = $1`,
                    [schedule.schedule_id]
                  );

                  logger.info(`[Job] Generated scheduled report ${schedule.report_type} for tenant ${t.tenant_id}`);

                  // Notify creator + subscribers (best-effort)
                  try {
                    const { createNotification } = await lazyImport("../../../notification/services/notification.service");
                    const { sendTemplatedEmail } = await lazyImport("../../../../platform/dos/notifications/email.service");
                    const subscribers: string[] = [schedule.created_by];
                    if (Array.isArray(schedule.subscribers)) {
                      for (const sub of schedule.subscribers) {
                        const uid = typeof sub === 'string' ? sub : sub?.userId;
                        if (uid && !subscribers.includes(uid)) subscribers.push(uid);
                      }
                    }
                    for (const userId of subscribers) {
                      await createNotification(t.tenant_id, {
                        userId,
                        type: 'report_ready',
                        title: `Scheduled report ready: ${schedule.report_type}`,
                        body: `Your scheduled ${schedule.report_type} report has been generated.`,
                        link: reportId ? `/report-hub/${reportId}` : '/report-hub',
                      }).catch(catchHandler(EC.EVENT_BUS, {}));
                      // Email (best-effort)
                      try {
                        const userResult = await safeQuery(
                          `SELECT email, full_name FROM users WHERE user_id = $1 AND tenant_id = $2`,
                          [userId, t.tenant_id]
                        );
                        if (userResult.rows.length > 0) {
                          const u = getFirstRow(userResult);
                          await sendTemplatedEmail(u.email, 'report_ready', {
                            recipientName: u.full_name,
                            title: `Scheduled report ready: ${schedule.report_type}`,
                            body: `Your scheduled "${schedule.report_type}" report has been generated and is available in the Report Hub.`,
                            ctaLabel: 'View Report',
                            ctaUrl: `${getProductUrl()}/report-hub`,
                          }).catch(catchHandler(EC.EVENT_BUS, {}));
                        }
                      } catch { /* email failure is non-fatal */ }
                    }
                  } catch { /* notification failure is non-fatal */ }
                } catch (genErr: unknown) {
                  logger.error(`[Job] Failed to generate report ${schedule.report_type} for tenant ${t.tenant_id}: ${toErrorMessage(genErr)}`);
                }
              }
            } catch (schemaErr: unknown) {
              if (!toErrorMessage(schemaErr).includes("does not exist")) {
                logger.error(`[Job] report-schedule-execution error for tenant ${t.tenant_id}: ${toErrorMessage(schemaErr)}`);
              }
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] report-schedule-execution error:", toErrorMessage(err));
        }
      },
    },

    // Personal Agent SLA Check — hourly
    {
      name: 'personal-agent-sla-check',
      cron: '0 * * * *', // Every hour
      handler: async () => {
        logger.info("[Job] personal-agent-sla-check executed");
        try {
          const { runPersonalAgentSlaCheckJob } = await lazyImport("../misc/personal-agent-sla-check.job");
          await runPersonalAgentSlaCheckJob();
        } catch (err: unknown) {
          logger.error("[Job] personal-agent-sla-check error:", toErrorMessage(err));
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
          const { safeQuery, tenantSchema } = await lazyImport("../../../../config/database/database");
          const { createProcessTask } = await lazyImport("../../../workflow/services/tasks/process-orchestration.service");
          const { eventBus } = await lazyImport("../../services/event/event-bus.service");

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

    // Autonomous remediation — every 2 hours (Pillar 7c)
    {
      name: 'autonomous-remediation',
      cron: '0 */2 * * *',
      description: 'Runs autonomous remediation cycle for all tenants (stale evidence, unassigned tasks, SLA breaches, expired policies)',
      handler: async () => {
        logger.info("[Job] autonomous-remediation executed");
        try {
          const { runRemediationCycle } = await lazyImport("../../../remediation/services/autonomous-remediation.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await runRemediationCycle(t.tenant_id);
              if (result.summary.totalActions > 0) {
                logger.info(`[Job] autonomous-remediation tenant=${t.tenant_id}: ${result.summary.totalActions} actions (${result.summary.successful} ok, ${result.summary.failed} failed)`);
              }
            } catch { /* tenant cycle failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] autonomous-remediation error:", toErrorMessage(err));
        }
      },
    },
  ];
}
