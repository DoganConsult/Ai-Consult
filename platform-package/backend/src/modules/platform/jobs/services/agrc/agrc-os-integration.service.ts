/**
 * AGRC-OS Integration Service — Synchronizes AGRC engine state with the platform.
 *
 * Pulls agent run results from the agrc_engine_runs table and pushes
 * summarized metrics to the platform dashboard tables (widget_data, kpi_snapshots).
 */

import { safeQuery, tenantSchema } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/logger.service';

export interface AgrcIntegrationResult {
  synced: number;
  errors: number;
}

export async function runAgrcOsIntegrationCycle(
  tenantId: string,
): Promise<AgrcIntegrationResult> {
  const schema = tenantSchema(tenantId);
  let synced = 0;
  let errors = 0;

  try {
    // --- 1. Pull unsynced agent run results ---
    const { rows: unsyncedRuns } = await safeQuery(
      `SELECT id, agent_id, run_status, result_summary, started_at, completed_at, metrics
       FROM "${schema}".agrc_engine_runs
       WHERE synced_to_platform = FALSE
         AND run_status IN ('completed', 'failed')
       ORDER BY completed_at ASC
       LIMIT 500`,
    ).catch(() => ({ rows: [] }));

    if (unsyncedRuns.length === 0) {
      return { synced: 0, errors: 0 };
    }

    // --- 2. Aggregate metrics by agent ---
    const agentMetrics: Record<string, { runs: number; successes: number; failures: number; avgDuration: number }> = {};

    for (const run of unsyncedRuns) {
      const agentId = run.agent_id as string;
      if (!agentMetrics[agentId]) {
        agentMetrics[agentId] = { runs: 0, successes: 0, failures: 0, avgDuration: 0 };
      }
      const m = agentMetrics[agentId];
      m.runs++;
      if (run.run_status === 'completed') m.successes++;
      else m.failures++;

      if (run.started_at && run.completed_at) {
        const duration = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
        m.avgDuration = (m.avgDuration * (m.runs - 1) + duration) / m.runs;
      }
    }

    // --- 3. Push aggregated KPIs to dashboard ---
    for (const [agentId, metrics] of Object.entries(agentMetrics)) {
      try {
        await safeQuery(
          `INSERT INTO "${schema}".kpi_snapshots
             (kpi_code, dimension, value, metadata, snapshot_date, created_at)
           VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW())
           ON CONFLICT (kpi_code, dimension, snapshot_date)
           DO UPDATE SET value = $3, metadata = $4, created_at = NOW()`,
          [
            'agrc_agent_performance',
            agentId,
            metrics.successes / metrics.runs * 100,
            JSON.stringify({
              runs: metrics.runs,
              successes: metrics.successes,
              failures: metrics.failures,
              avgDurationMs: Math.round(metrics.avgDuration),
            }),
          ],
        );
        synced += metrics.runs;
      } catch (err) {
        logger.warn('[AgrcIntegration] Failed to push KPI for agent', {
          tenantId,
          agentId,
          error: err instanceof Error ? err.message : String(err),
        });
        errors += metrics.runs;
      }
    }

    // --- 4. Mark runs as synced ---
    const syncedIds = unsyncedRuns.map((r: any) => r.id);
    if (syncedIds.length > 0) {
      await safeQuery(
        `UPDATE "${schema}".agrc_engine_runs
         SET synced_to_platform = TRUE, synced_at = NOW()
         WHERE id = ANY($1)`,
        [syncedIds],
      ).catch((err) => {
        logger.warn('[AgrcIntegration] Failed to mark runs as synced', {
          tenantId,
          error: err instanceof Error ? err.message : String(err),
        });
        errors++;
      });
    }

    // --- 5. Sync overall AGRC health summary ---
    const { rows: healthRows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_runs,
         COUNT(*) FILTER (WHERE run_status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE run_status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE run_status = 'running')::int AS running
       FROM "${schema}".agrc_engine_runs
       WHERE started_at > NOW() - INTERVAL '24 hours'`,
    ).catch(() => ({ rows: [{ total_runs: 0, completed: 0, failed: 0, running: 0 }] }));

    await safeQuery(
      `INSERT INTO "${schema}".widget_data
         (widget_code, data_json, updated_at)
       VALUES ('agrc_health_summary', $1, NOW())
       ON CONFLICT (widget_code)
       DO UPDATE SET data_json = $1, updated_at = NOW()`,
      [JSON.stringify(healthRows[0])],
    ).catch(() => {});

    logger.info('[AgrcIntegration] Sync cycle complete', { tenantId, synced, errors });
    return { synced, errors };
  } catch (err) {
    logger.error('[AgrcIntegration] Integration cycle failed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { synced, errors: errors + 1 };
  }
}
