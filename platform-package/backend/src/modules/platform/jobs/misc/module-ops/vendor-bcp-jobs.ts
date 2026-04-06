// @ts-nocheck
import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { logger } from '../../../../../platform/dos/observability/logger.service';
/**
 * Vendor & BCP domain job definitions.
 * Covers vendor reassessment, compliance sync, contract expiry, SLA breach scanning,
 * BCP exercise reminders, and BCP health checks.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getVendorBcpJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Vendor reassessment check — daily at 8 AM
    {
      name: 'vendor-reassessment-check',
      cron: '0 8 * * *',
      handler: async () => {
        logger.info("[Job] vendor-reassessment-check executed");
        try {
          const { createNotification } = await import('../../../../notification/services/notification.service');
          async function resolveAssigneeToUserId(tenantId: string, opts: { roleCode?: string } = {}): Promise<string | null> {
      const { safeQuery, tenantSchema } = await import('../../../../../config/database/database');
      const schema = tenantSchema(tenantId);
      if (!opts.roleCode) return null;
      const r = await safeQuery(`SELECT ura.user_id FROM "${schema}".user_role_assignments ura JOIN "${schema}".functional_roles fr ON fr.id=ura.functional_role_id WHERE fr.code=$1 AND ura.is_active=TRUE LIMIT 1`, [opts.roleCode]);
      return r.rows[0]?.user_id || null;
    }
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
              const vendors = await safeQuery(
                `SELECT vendor_id, name, next_assessment_date, owner_id FROM "${schema}".vendors
                 WHERE next_assessment_date IS NOT NULL
                   AND next_assessment_date <= CURRENT_DATE + INTERVAL '30 days'
                   AND next_assessment_date >= CURRENT_DATE`,
              );
              for (const v of vendors.rows) {
                let userId = v.owner_id;
                if (!userId) {
                  userId = (await resolveAssigneeToUserId(t.tenant_id, { roleCode: 'compliance_officer' })) ?? undefined;
                }
                if (userId) {
                  await createNotification(t.tenant_id, {
                    userId,
                    type: 'vendor_reassessment_due',
                    title: `Vendor reassessment approaching: ${v.name}`,
                    body: `Vendor "${v.name}" is due for reassessment on ${v.next_assessment_date}.`,
                    link: `/vendors/${v.vendor_id}`,
                  }).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] vendor-reassessment-check error:", toErrorMessage(err));
        }
      },
    },

    // Vendor Compliance Sync — daily at 9 AM
    {
      name: 'vendor-compliance-sync',
      cron: '0 9 * * *',
      handler: async () => {
        logger.info("[Job] vendor-compliance-sync executed");
        try {
          const { runComplianceSync } = await import("../../vendor/services/vendor/vendor-compliance-sync.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await runComplianceSync(t.tenant_id);
            } catch { /* tenant sync failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] vendor-compliance-sync error:", toErrorMessage(err));
        }
      },
    },

    // Vendor contract expiry check — daily at 8 AM
    {
      name: 'vendor-contract-expiry-check',
      cron: '0 8 * * *',
      handler: async () => {
        logger.info("[Job] vendor-contract-expiry-check executed");
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            const schema = `tenant_${t.tenant_id}`;
            try {
              const expiring = await safeQuery(
                `SELECT vendor_id, name, contract_end_date
                 FROM "${schema}".vendors
                 WHERE contract_end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
                   AND status = 'active' AND deleted_at IS NULL`
              );
              for (const v of expiring.rows) {
                try {
                  const { eventBus } = await import('../../../../../platform/dos/events/event-bus');
                  await eventBus.publish({
                    eventType: 'vendor.contract_expiring', tenantId: t.tenant_id,
                    sourceService: 'job-scheduler', entityType: 'vendor',
                    entityId: v.vendor_id, severity: 'warning',
                    payload: { name: v.name, contractEndDate: v.contract_end_date },
                  });
                } catch { /* best effort */ }
              }
              if (expiring.rows.length > 0) {
                logger.info(`[Job] vendor-contract-expiry-check: ${expiring.rows.length} vendors expiring for ${t.tenant_id}`);
              }
            } catch (e: unknown) {
              if (!toErrorMessage(e).includes("does not exist")) {
                logger.error(`[Job] vendor-contract-expiry-check error for ${t.tenant_id}: ${toErrorMessage(e)}`);
              }
            }
          }
        } catch (err: unknown) { logger.error("[Job] vendor-contract-expiry-check error:", toErrorMessage(err)); }
      },
    },

    // Vendor SLA Breach Scanner — hourly
    {
      name: 'vendor-sla-breach-scanner',
      cron: '0 * * * *',
      handler: async () => {
        logger.info("[Job] vendor-sla-breach-scanner executed");
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const { checkVendorSLABreaches } = await import("../../vendor/services/vendor/vendor-advanced.service");
              const breaches = await checkVendorSLABreaches(t.tenant_id);
              for (const b of breaches) {
                try {
                  const { eventBus } = await import('../../../../../platform/dos/events/event-bus');
                  await eventBus.publish({
                    eventType: 'vendor.sla_breached', tenantId: t.tenant_id,
                    sourceService: 'job-scheduler', entityType: 'vendor_sla',
                    entityId: b.breach_id || b.sla_def_id, severity: 'critical',
                    payload: { vendorId: b.vendor_id, metric: b.metric_name, code: b.metric_code },
                  });
                } catch { /* best effort */ }
              }
              if (breaches.length > 0) {
                logger.info(`[Job] vendor-sla-breach-scanner: ${breaches.length} active breaches for ${t.tenant_id}`);
              }
            } catch (e: unknown) {
              if (!toErrorMessage(e).includes("does not exist")) {
                logger.error(`[Job] vendor-sla-breach-scanner error for ${t.tenant_id}: ${toErrorMessage(e)}`);
              }
            }
          }
        } catch (err: unknown) { logger.error("[Job] vendor-sla-breach-scanner error:", toErrorMessage(err)); }
      },
    },

    // BCP Exercise Reminder — daily at 7 AM
    {
      name: 'bcp-exercise-reminder',
      cron: '0 7 * * *',
      handler: async () => {
        logger.info("[Job] bcp-exercise-reminder executed");
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            const schema = `tenant_${t.tenant_id}`;
            try {
              const upcoming = await safeQuery(
                `SELECT exercise_id, title, scheduled_date, facilitator_id
                 FROM "${schema}".bcp_exercises
                 WHERE status IN ('planned','scheduled')
                   AND scheduled_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
                   AND deleted_at IS NULL`
              );
              for (const ex of upcoming.rows) {
                try {
                  const { createNotification } = await import('../../../../notification/services/notification.service');
                  if (ex.facilitator_id) {
                    await createNotification(t.tenant_id, {
                      userId: ex.facilitator_id, type: 'bcp_exercise_reminder',
                      title: `BCP Exercise upcoming: ${ex.title}`,
                      body: `Scheduled for ${new Date(ex.scheduled_date).toLocaleDateString()}`,
                      link: `/bcp/exercises`,
                    }).catch(catchHandler(EC.EVENT_BUS, {}));
                  }
                } catch { /* best effort */ }
              }
              const overdue = await safeQuery(
                `SELECT exercise_id, title FROM "${schema}".bcp_exercises
                 WHERE status IN ('planned','scheduled') AND scheduled_date < NOW() AND deleted_at IS NULL`
              );
              for (const ex of overdue.rows) {
                try {
                  const { eventBus } = await import('../../../../../platform/dos/events/event-bus');
                  await eventBus.publish({
                    eventType: 'bcp.exercise_overdue', tenantId: t.tenant_id,
                    sourceService: 'job-scheduler', entityType: 'bcp_exercise',
                    entityId: ex.exercise_id, severity: 'warning',
                    payload: { title: ex.title },
                  });
                } catch { /* best effort */ }
              }
            } catch (e: unknown) {
              if (!toErrorMessage(e).includes("does not exist")) {
                logger.error(`[Job] bcp-exercise-reminder error for ${t.tenant_id}: ${toErrorMessage(e)}`);
              }
            }
          }
        } catch (err: unknown) { logger.error("[Job] bcp-exercise-reminder error:", toErrorMessage(err)); }
      },
    },

    // BCP Health Check — every 6 hours
    {
      name: 'bcp-health-check',
      cron: '0 */6 * * *',
      handler: async () => {
        logger.info("[Job] bcp-health-check executed");
        try {
          const { runBCPHealthCheck } = await import('../../../../bcp/services/bcp.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              // Feature flag gate
              const { isFeatureEnabled } = await import("../../../../agrc-engine/helpers/feature-flag.helper");
              const tSchema = `tenant_${t.tenant_id}`;
              const flagOn = await isFeatureEnabled(tSchema, 'bcp_proactive_enabled').catch(() => true);
              if (!flagOn) continue;

              const result = await runBCPHealthCheck(t.tenant_id);
              if (result.tasksCreated > 0 || result.notificationsSent > 0) {
                logger.info(`[Job] bcp-health-check: tenant ${t.tenant_id} — ${result.tasksCreated} tasks, ${result.notificationsSent} notifications, ${result.upcomingDeadlines} upcoming`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] bcp-health-check error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] bcp-health-check error:", toErrorMessage(err));
        }
      },
    },
  ];
}
