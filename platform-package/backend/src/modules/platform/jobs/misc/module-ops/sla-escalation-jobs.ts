// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger.service';
/**
 * SLA & Escalation domain job definitions.
 * Covers process task SLA monitoring, escalation checks, incident SLA monitoring,
 * and deadline notification checks.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getSlaEscalationJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Process Task SLA Monitor — every 10 minutes
    {
      name: 'process-task-monitor',
      cron: '*/10 * * * *',
      handler: async () => {
        try {
          const { checkProcessTaskSLAs } = await import('../../../workflow/services/tasks/process-task-monitor.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await checkProcessTaskSLAs(t.tenant_id);
              if (result.breached > 0 || result.escalated > 0) {
                logger.info(`[Job] process-task-monitor: tenant ${t.tenant_id} — ${result.breached} breached, ${result.escalated} escalated, ${result.warnings} warnings`);
              }
            } catch { /* tenant SLA check failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] process-task-monitor error:", toErrorMessage(err));
        }
      },
    },

    // Escalation check — every 30 minutes
    {
      name: 'escalation-check',
      cron: '*/30 * * * *',
      handler: async () => {
        logger.info("[Job] escalation-check executed");
        try {
          const { checkEscalations } = await import("../services/misc/escalation.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const results = await checkEscalations(t.tenant_id);
              if (results.length > 0) {
                logger.info(`[Job] escalation-check: escalated ${results.length} approvals for tenant ${t.tenant_id}`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] escalation-check error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] escalation-check error:", toErrorMessage(err));
        }
      },
    },

    // Incident SLA Monitor — hourly
    {
      name: 'incident-sla-monitor',
      cron: '0 * * * *',
      handler: async () => {
        logger.info("[Job] incident-sla-monitor executed");
        try {
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            const schema = `tenant_${t.tenant_id}`;
            try {
              const breached = await safeQuery(
                `UPDATE "${schema}".incidents
                 SET sla_status = 'breached', updated_at = NOW()
                 WHERE status IN ('open','investigating','contained')
                   AND sla_deadline IS NOT NULL AND sla_deadline < NOW()
                   AND (sla_status IS NULL OR sla_status != 'breached')
                 RETURNING incident_id, title, severity`
              );
              for (const inc of breached.rows) {
                try {
                  const { eventBus } = await import('../../../../../platform/dos/events/event-bus');
                  await eventBus.publish({
                    eventType: 'incident.sla_breached', tenantId: t.tenant_id,
                    sourceService: 'job-scheduler', entityType: 'incident',
                    entityId: inc.incident_id, severity: 'critical',
                    payload: { title: inc.title, incidentSeverity: inc.severity },
                  });
                } catch { /* best effort */ }
              }
              if (breached.rows.length > 0) {
                logger.info(`[Job] incident-sla-monitor: ${breached.rows.length} SLA breaches for ${t.tenant_id}`);
              }
            } catch (e: unknown) {
              if (!toErrorMessage(e).includes("does not exist")) {
                logger.error(`[Job] incident-sla-monitor error for ${t.tenant_id}: ${toErrorMessage(e)}`);
              }
            }
          }
        } catch (err: unknown) { logger.error("[Job] incident-sla-monitor error:", toErrorMessage(err)); }
      },
    },

    // Deadline notification check — daily at 6 AM
    {
      name: 'deadline-notification-check',
      cron: '0 6 * * *',
      handler: async () => {
        logger.info("[Job] deadline-notification-check executed");
        try {
          const { checkDeadlineNotifications } = await import('../../../../notification/services/notification.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            await checkDeadlineNotifications(t.tenant_id);
          }
        } catch (err: unknown) {
          logger.error("[Job] deadline-notification-check error:", toErrorMessage(err));
        }
      },
    },
  ];
}
