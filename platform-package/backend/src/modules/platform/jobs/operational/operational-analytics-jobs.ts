import { logger } from '../../../../platform/dos/observability/logger.service';
/**
 * Analytics domain operational job definitions.
 * Covers KPI aggregation, materialized view refresh, and metric anomaly detection.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';

export async function getAnalyticsOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../platform/dos/jobs/job-scheduler.service');

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

    // Materialized View Refresh — every 15 minutes
    {
      name: 'materialized-view-refresh',
      cron: '*/15 * * * *',
      handler: async () => {
        try {
          const { safeQuery } = await import('../../../../config/database/database');
          await safeQuery(`SELECT public.refresh_materialized_views()`, []);
        } catch (err: unknown) {
          if (!toErrorMessage(err).includes("does not exist")) {
            logger.error("[Job] materialized-view-refresh error:", toErrorMessage(err));
          }
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
  ];
}
