// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger.service';
/**
 * Audit domain job definitions.
 * Covers audit schedule processing, reminder generation, SLA monitoring,
 * trail archival, merkle witness, and anomaly detection.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getAuditJobs(): Promise<JobDefinition[]> {
  return [
    // Audit Schedule Processor — daily at 2 AM
    {
      name: 'audit-schedule-processor',
      cron: '0 2 * * *',
      handler: async () => {
        logger.info("[Job] audit-schedule-processor executed");
        try {
          const { getDueSchedules } = await import("../../audit/services/audit/audit-schedules.service");
          const { createEngagement } = await import("../../audit/services/audit/audit.service");
          const { query } = await import('../../../../../config/database/database');
          const tenants = await query("SELECT tenant_id FROM public.tenants WHERE status = 'active'");
          for (const t of tenants.rows) {
            try {
              const due = await getDueSchedules(t.tenant_id);
              for (const s of due) {
                await createEngagement(t.tenant_id, { title: s.title, audit_type: s.audit_type });
                logger.info(`[Job] audit-schedule-processor: created audit from schedule ${s.id} for tenant ${t.tenant_id}`);
              }
            } catch { /* per-tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] audit-schedule-processor error:", toErrorMessage(err));
        }
      },
    },

    // Audit Reminder Generator — daily at 6 AM
    {
      name: 'audit-reminder-generator',
      cron: '0 6 * * *',
      handler: async () => {
        logger.info("[Job] audit-reminder-generator executed");
        try {
          const { generateReminders } = await import("../../audit/services/audit/audit-reminders.service");
          const { query } = await import('../../../../../config/database/database');
          const tenants = await query("SELECT tenant_id FROM public.tenants WHERE status = 'active'");
          for (const t of tenants.rows) {
            try { await generateReminders(t.tenant_id); } catch { /* per-tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] audit-reminder-generator error:", toErrorMessage(err));
        }
      },
    },

    // Audit Finding SLA Monitor — every 30 minutes
    {
      name: 'audit-sla-monitor',
      cron: '*/30 * * * *',
      handler: async () => {
        try {
          const { getBreachedFindings } = await import("../../audit/services/audit/audit-finding-slas.service");
          const { query } = await import('../../../../../config/database/database');
          const tenants = await query("SELECT tenant_id FROM public.tenants WHERE status = 'active'");
          for (const t of tenants.rows) {
            try {
              const breached = await getBreachedFindings(t.tenant_id);
              if (breached.length > 0) {
                logger.info(`[Job] audit-sla-monitor: ${breached.length} SLA breaches for tenant ${t.tenant_id}`);
              }
            } catch { /* per-tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] audit-sla-monitor error:", toErrorMessage(err));
        }
      },
    },

    // Audit Trail Archival — 1st of each month at 2 AM
    {
      name: 'audit-trail-archival',
      cron: '0 2 1 * *',
      handler: async () => {
        try {
          const { archiveOldAuditEntries } = await import("../../audit/services/audit/audit-trail-retention.service");
          const { query } = await import('../../../../../config/database/database');
          const tenants = await query("SELECT tenant_id FROM public.tenants WHERE status = 'active'");
          for (const t of tenants.rows) {
            try {
              const result = await archiveOldAuditEntries(t.tenant_id, 365);
              if (result.archived > 0) {
                logger.info(`[Job] audit-trail-archival: archived ${result.archived} entries for tenant ${t.tenant_id}`);
              }
            } catch { /* per-tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] audit-trail-archival error:", toErrorMessage(err));
        }
      },
    },

    // Merkle Witness — daily at 2 AM
    {
      name: 'merkle-witness-daily',
      cron: '0 2 * * *',
      handler: async () => {
        try {
          const { runDailyMerkleWitness } = await import("../services/misc/merkle-witness.service");
          const result = await runDailyMerkleWitness();
          logger.info(`[Job] merkle-witness-daily: ${result.witnessesCreated} witnesses for ${result.tenantsProcessed} tenants`);
        } catch (err: unknown) {
          logger.error("[Job] merkle-witness-daily error:", toErrorMessage(err));
        }
      },
    },

    // Audit Anomaly Detection — every 6 hours
    {
      name: 'audit-anomaly-detection',
      cron: '0 */6 * * *',
      handler: async () => {
        try {
          const { detectAnomalies, persistAnomalies, notifyAdminsOfAnomalies } = await import("../../audit/services/audit/audit-anomaly-detector.service");
          const { query: q } = await import('../../../../../config/database/database');
          const tenants = await q("SELECT tenant_id FROM public.tenants WHERE status = 'active'");
          for (const t of tenants.rows) {
            try {
              const anomalies = await detectAnomalies(t.tenant_id, 6);
              if (anomalies.length > 0) {
                await persistAnomalies(t.tenant_id, anomalies);
                await notifyAdminsOfAnomalies(t.tenant_id, anomalies);
                logger.info(`[Job] audit-anomaly-detection: ${anomalies.length} anomalies for tenant ${t.tenant_id}`);
              }
            } catch { /* per-tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] audit-anomaly-detection error:", toErrorMessage(err));
        }
      },
    },
  ];
}
