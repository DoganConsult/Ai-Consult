// @ts-nocheck
import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { getProductUrl } from '../../../../../platform/dos/branding/product-identity';
/**
 * Reporting & Analytics domain job definitions.
 * Covers KPI aggregation, report schedule execution, metric anomaly detection,
 * and stale task detection.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';
import { logger } from '../../../../../platform/dos/observability/logger.service';

export async function getReportingAnalyticsJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // KPI aggregation — daily at 1 AM
    {
      name: 'kpi-aggregation',
      cron: '0 1 * * *',
      handler: async () => {
        logger.info("[Job] kpi-aggregation executed");
        try {
          const { runAggregationJob } = await import('../../../analytics/services/analytics/analytics.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            await runAggregationJob(t.tenant_id);
          }
        } catch (err: unknown) {
          logger.error("[Job] kpi-aggregation error:", toErrorMessage(err));
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
          const { generateReport } = await import("../../reporting/services/report/report-generator.service");
          const { CronExpressionParser } = await import("cron-parser");
          const { safeQuery } = await import('../../../../../config/database/database');
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
                  const reportId = insertResult.rows[0]?.report_id;

                  // Update last_run_at
                  await safeQuery(
                    `UPDATE "${schema}".report_schedules SET last_run_at = NOW() WHERE schedule_id = $1`,
                    [schedule.schedule_id]
                  );

                  logger.info(`[Job] Generated scheduled report ${schedule.report_type} for tenant ${t.tenant_id}`);

                  // Notify creator + subscribers (best-effort)
                  try {
                    const { createNotification } = await import('../../../../notification/services/notification.service');
                    const { sendTemplatedEmail } = await import("../services/email/email.service");
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
                          const u = userResult.rows[0];
                          await sendTemplatedEmail({
                            to: u.email,
                            subject: `Scheduled report ready: ${schedule.report_type}`,
                            templateCode: 'report_ready',
                            tenantId: t.tenant_id,
                            templateVars: {
                              recipientName: u.full_name,
                              title: `Scheduled report ready: ${schedule.report_type}`,
                              body: `Your scheduled "${schedule.report_type}" report has been generated and is available in the Report Hub.`,
                              ctaLabel: 'View Report',
                              ctaUrl: `${getProductUrl()}/report-hub`,
                            },
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

    // Metric anomaly detection — hourly (Priority 16)
    {
      name: 'metric-anomaly-detection',
      cron: '0 * * * *', // Every hour at minute 0
      handler: async () => {
        logger.info("[Job] metric-anomaly-detection executed");
        try {
          const { detectMetricAnomalies } = await import('../../../analytics/services/misc/metric-anomaly-detector.service');
          const tenants = await getProvisionedTenants();
          let totalAnomalies = 0;
          const allErrors: string[] = [];

          for (const t of tenants) {
            try {
              const result = await detectMetricAnomalies(t.tenant_id);
              totalAnomalies += result.anomaliesDetected.length;
              if (result.errors.length > 0) {
                allErrors.push(...result.errors.map(e => `[${t.tenant_id}] ${e}`));
              }
              if (result.anomaliesDetected.length > 0) {
                logger.info(`[Job] metric-anomaly-detection: tenant ${t.tenant_id} — ${result.anomaliesDetected.length} anomalies detected (${result.metricsChecked} metrics checked)`);
                // Log critical anomalies separately
                const critical = result.anomaliesDetected.filter(a => a.severity === 'critical');
                if (critical.length > 0) {
                  logger.warn(`[Job] metric-anomaly-detection: tenant ${t.tenant_id} — ${critical.length} CRITICAL anomalies: ${critical.map(a => a.metricName).join(', ')}`);
                }
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] metric-anomaly-detection error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalAnomalies > 0) {
            logger.info(`[Job] metric-anomaly-detection: ${totalAnomalies} total anomalies detected across ${tenants.length} tenants`);
          }
          if (allErrors.length > 0) {
            logger.warn(`[Job] metric-anomaly-detection: ${allErrors.length} errors occurred`);
          }
        } catch (err: unknown) {
          logger.error("[Job] metric-anomaly-detection error:", toErrorMessage(err));
        }
      },
    },

    // Stale task detection — daily at 7 AM (Priority 17)
    {
      name: 'stale-task-detection',
      cron: '0 7 * * *', // Daily at 7 AM
      handler: async () => {
        logger.info("[Job] stale-task-detection executed");
        try {
          const { detectStaleTasks } = await import('../../../workflow/services/tasks/process-task-monitor.service');
          const tenants = await getProvisionedTenants();
          let totalStale7Days = 0;
          let totalStale14Days = 0;
          let totalEscalated = 0;
          let totalObservations = 0;
          let totalNotifications = 0;
          const allErrors: string[] = [];

          for (const t of tenants) {
            try {
              const result = await detectStaleTasks(t.tenant_id);
              totalStale7Days += result.stale7Days;
              totalStale14Days += result.stale14Days;
              totalEscalated += result.escalated;
              totalObservations += result.observationsCreated;
              totalNotifications += result.notificationsSent;

              if (result.stale7Days > 0 || result.stale14Days > 0) {
                logger.info(`[Job] stale-task-detection: tenant ${t.tenant_id} — ${result.stale7Days} tasks stale 7+ days, ${result.stale14Days} tasks stale 14+ days, ${result.escalated} escalated`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] stale-task-detection error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
                allErrors.push(`[${t.tenant_id}] ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalStale7Days > 0 || totalStale14Days > 0) {
            logger.info(`[Job] stale-task-detection: ${totalStale7Days} tasks stale 7+ days, ${totalStale14Days} tasks stale 14+ days, ${totalEscalated} escalated, ${totalObservations} observations created, ${totalNotifications} notifications sent across ${tenants.length} tenants`);
          }
          if (allErrors.length > 0) {
            logger.warn(`[Job] stale-task-detection: ${allErrors.length} errors occurred`);
          }
        } catch (err: unknown) {
          logger.error("[Job] stale-task-detection error:", toErrorMessage(err));
        }
      },
    },
  ];
}
