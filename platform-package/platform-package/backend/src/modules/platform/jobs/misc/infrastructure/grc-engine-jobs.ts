// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger';
/**
 * GRC Engine domain job definitions.
 * Covers the autonomous GRC engine, AGRC-OS orchestrator, integration cycle,
 * DLQ retry, metrics snapshot, and data retention.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getGrcEngineJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Autonomous GRC Engine — every 30 minutes
    {
      name: 'autonomous-grc-engine',
      cron: '*/30 * * * *',
      handler: async () => {
        logger.info("[Job] autonomous-grc-engine executed");
        try {
          const { runAutonomousEngine } = await import("../services/misc/autonomous-grc-engine.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await runAutonomousEngine(t.tenant_id);
              if (result.totalActionsGenerated > 0) {
                logger.info(`[Job] autonomous-grc-engine: tenant ${t.tenant_id} — ${result.totalActionsGenerated} autonomous actions`);
              }
            } catch { /* tenant cycle failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] autonomous-grc-engine error:", toErrorMessage(err));
        }
      },
    },

    // AGRC-OS Orchestrator — cadence-aware, every 15 min
    {
      name: 'agrc-os-orchestrator',
      cron: '*/15 * * * *',
      handler: async () => {
        logger.info("[Job] agrc-os-orchestrator executed");
        try {
          const { runAGRCOSCycle } = await import('../../services/agrc/agrc-os-orchestrator.service');
          const tenants = await getProvisionedTenants();
          const now = new Date();
          const currentMinute = now.getUTCMinutes();

          for (const t of tenants) {
            try {
              const cadence = t.settings?.profileResolution?.reportingCadence;
              if (cadence === 'annual' && currentMinute !== 0) continue;
              if (cadence === 'semi_annual' && currentMinute !== 0 && currentMinute !== 30) continue;

              const result = await runAGRCOSCycle(t.tenant_id);
              if (result.enforcementActions > 0) {
                logger.info(`[Job] agrc-os-orchestrator: tenant ${t.tenant_id} — ${result.enforcementActions} enforcement actions`);
              }
            } catch { /* tenant cycle failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] agrc-os-orchestrator error:", toErrorMessage(err));
        }
      },
    },

    // AGRC-OS Integration Cycle — every 10 minutes
    {
      name: 'agrc-os-integration-cycle',
      cron: '*/10 * * * *',
      handler: async () => {
        try {
          const { runAgrcOsIntegrationCycle } = await import("../services/agrc/agrc-os-integration.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await runAgrcOsIntegrationCycle(t.tenant_id);
              if (result.activationRules.triggered > 0 || result.workloadDelegation.delegated > 0) {
                logger.info(`[Job] agrc-os-integration: tenant ${t.tenant_id} — ${result.activationRules.triggered} rules triggered, ${result.workloadDelegation.delegated} delegations`);
              }
            } catch { /* tenant integration failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] agrc-os-integration-cycle error:", toErrorMessage(err));
        }
      },
    },

    // Dead Letter Queue Retry — every 30 minutes
    {
      name: 'agrc-dlq-retry',
      cron: '*/30 * * * *',
      handler: async () => {
        try {
          const { eventBus } = await import('../../../../../platform/dos/events/event-bus');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await eventBus.retryDeadLetters(t.tenant_id, 20);
              if (result.retried > 0 || result.permanentFailures > 0) {
                logger.info(`[Job] agrc-dlq-retry: tenant ${t.tenant_id} — retried ${result.retried}, succeeded ${result.succeeded}, failed ${result.failed}, permanent failures ${result.permanentFailures}`);
              }
            } catch { /* DLQ table may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] agrc-dlq-retry error:", toErrorMessage(err));
        }
      },
    },

    // Continuous Attestation Engine — every 4 hours
    {
      name: 'continuous-attestation-check',
      cron: '0 */4 * * *',
      handler: async () => {
        logger.info("[Job] continuous-attestation-check executed");
        try {
          const { runContinuousAttestationCheck } = await import("../../compliance/services/misc/continuous-attestation.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await runContinuousAttestationCheck(t.tenant_id, {
                minReadinessThreshold: 80,
              });
              if (result.draftsGenerated > 0) {
                logger.info(`[Job] continuous-attestation-check: tenant ${t.tenant_id} — checked ${result.checked} entities, generated ${result.draftsGenerated} attestation drafts`);
              }
            } catch { /* tenant may not have required tables */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] continuous-attestation-check error:", toErrorMessage(err));
        }
      },
    },

    // Metrics Snapshot — every 6 hours
    {
      name: 'agrc-metrics-snapshot',
      cron: '0 */6 * * *',
      handler: async () => {
        logger.info("[Job] agrc-metrics-snapshot executed");
        try {
          const { saveMetricsSnapshot } = await import('../../services/agrc/agrc-metrics.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await saveMetricsSnapshot(t.tenant_id);
            } catch { /* tenant may not have AGRC-OS tables */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] agrc-metrics-snapshot error:", toErrorMessage(err));
        }
      },
    },

    // Data Retention Cleanup — daily at 3 AM
    {
      name: 'agrc-data-retention',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info("[Job] agrc-data-retention executed");
        try {
          const { purgeOldSnapshots, purgeOldCycleLogs } = await import('../../services/agrc/agrc-metrics.service');
          const { eventBus } = await import('../../../../../platform/dos/events/event-bus');
          const { pruneSignals, pruneDecisions } = await import("../../ai/services/ai-cockpit-signal.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const snapshotsPurged = await purgeOldSnapshots(t.tenant_id, 90);
              const cyclesPurged = await purgeOldCycleLogs(t.tenant_id, 90);
              const eventsPurged = await eventBus.purgeOldEvents(t.tenant_id, 90);
              const signalsPruned = await pruneSignals(t.tenant_id, 90);
              const decisionsPruned = await pruneDecisions(t.tenant_id, 180);
              if (snapshotsPurged > 0 || cyclesPurged > 0 || eventsPurged > 0 || signalsPruned > 0 || decisionsPruned > 0) {
                logger.info(`[Job] agrc-data-retention: tenant ${t.tenant_id} — purged ${snapshotsPurged} snapshots, ${cyclesPurged} cycles, ${eventsPurged} events, ${signalsPruned} signals, ${decisionsPruned} decisions`);
              }
            } catch { /* tenant may not have AGRC-OS tables */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] agrc-data-retention error:", toErrorMessage(err));
        }
      },
    },

    // Cross-Tenant Benchmark Aggregation — daily at 2 AM
    {
      name: 'benchmark-aggregation',
      cron: '0 2 * * *',
      handler: async () => {
        logger.info("[Job] benchmark-aggregation executed");
        try {
          const { runBenchmarkAggregation } = await import("../services/misc/benchmark-aggregator.service");
          const result = await runBenchmarkAggregation();
          logger.info(`[Job] benchmark-aggregation: completed — ${result.tenantCount} tenants, ${result.metrics.length} metrics, ${result.sectorMetrics.length} sector metrics, status: ${result.status}`);
        } catch (err: unknown) {
          logger.error("[Job] benchmark-aggregation error:", toErrorMessage(err));
        }
      },
    },
  ];
}
