import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { publish } from '../../events/event-bus';
import { getAllAgentDefinitions } from '../registry/agent-registry.service';
import { checkAgentHealth } from './agent-health.service';

export interface WatchdogSweepResult {
  tenantId: string;
  sweptAt: string;
  stuckRunsRecovered: number;
  circuitBreakersTripped: number;
  expiredMemoriesPurged: number;
  healthAlerts: WatchdogAlert[];
}

export interface WatchdogAlert {
  agentCode: string;
  alertType: 'stuck_run' | 'circuit_open' | 'high_failure_rate' | 'budget_breach' | 'memory_pressure';
  severity: 'warning' | 'critical';
  detail: string;
  detectedAt: string;
}

const STUCK_THRESHOLD_MINUTES = 15;
const FAILURE_RATE_ALERT_THRESHOLD = 0.6;

export async function runWatchdogSweep(tenantId: string): Promise<WatchdogSweepResult> {
  const schema = tenantSchema(tenantId);
  const alerts: WatchdogAlert[] = [];
  const now = new Date().toISOString();

  const stuckRunsRecovered = await recoverStuckRuns(schema, tenantId, alerts);
  const circuitBreakersTripped = await checkCircuitBreakers(schema, tenantId, alerts);
  const expiredMemoriesPurged = await purgeExpiredMemories(schema);
  await checkAgentHealthAlerts(tenantId, alerts);
  await checkBudgetAlerts(schema, tenantId, alerts);

  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_watchdog_log
       (tenant_id, swept_at, stuck_recovered, circuits_tripped, memories_purged, alert_count)
     VALUES ($1, NOW(), $2, $3, $4, $5)`,
    [tenantId, stuckRunsRecovered, circuitBreakersTripped, expiredMemoriesPurged, alerts.length],
  );

  for (const alert of alerts) {
    await publish('agent.watchdog.alert', tenantId, alert);
  }

  return {
    tenantId,
    sweptAt: now,
    stuckRunsRecovered,
    circuitBreakersTripped,
    expiredMemoriesPurged,
    healthAlerts: alerts,
  };
}

async function recoverStuckRuns(
  schema: string,
  tenantId: string,
  alerts: WatchdogAlert[],
): Promise<number> {
  const { rows } = await safeQuery(
    `UPDATE "${schema}".dos_agent_runs
     SET status = 'failed', error = 'watchdog:stuck_run_timeout', completed_at = NOW()
     WHERE status IN ('running', 'queued')
       AND created_at < NOW() - INTERVAL '${STUCK_THRESHOLD_MINUTES} minutes'
     RETURNING run_id, agent_code`,
    [],
  );

  for (const r of rows) {
    alerts.push({
      agentCode: r.agent_code,
      alertType: 'stuck_run',
      severity: 'warning',
      detail: `Run ${r.run_id} stuck for >${STUCK_THRESHOLD_MINUTES}m — force-failed`,
      detectedAt: new Date().toISOString(),
    });
    await publish('agent.run.failed', tenantId, {
      runId: r.run_id,
      agentCode: r.agent_code,
      reason: 'watchdog:stuck_run_timeout',
    });
  }

  return rows.length;
}

async function checkCircuitBreakers(
  schema: string,
  _tenantId: string,
  alerts: WatchdogAlert[],
): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT agent_code, COUNT(*)::int AS recent_fails
     FROM "${schema}".dos_agent_runs
     WHERE status = 'failed'
       AND created_at > NOW() - INTERVAL '1 hour'
     GROUP BY agent_code
     HAVING COUNT(*) >= 5`,
    [],
  );

  let tripped = 0;
  for (const r of rows) {
    const def = getAllAgentDefinitions().find(d => d.agentCode === r.agent_code);
    const threshold = def?.healthPolicy.circuitBreakerThreshold ?? 5;
    if (r.recent_fails >= threshold) {
      alerts.push({
        agentCode: r.agent_code,
        alertType: 'circuit_open',
        severity: 'critical',
        detail: `${r.recent_fails} failures in last hour (threshold: ${threshold})`,
        detectedAt: new Date().toISOString(),
      });
      tripped++;
    }
  }

  return tripped;
}

async function purgeExpiredMemories(schema: string): Promise<number> {
  const result = await safeQuery(
    `DELETE FROM "${schema}".dos_agent_memories WHERE expires_at IS NOT NULL AND expires_at <= NOW()`,
    [],
  );
  return result.rowCount ?? 0;
}

async function checkAgentHealthAlerts(tenantId: string, alerts: WatchdogAlert[]): Promise<void> {
  const defs = getAllAgentDefinitions();
  for (const def of defs) {
    try {
      const health = await checkAgentHealth(tenantId, def.agentCode);
      if (health.runs24h > 5 && health.failures24h / health.runs24h > FAILURE_RATE_ALERT_THRESHOLD) {
        alerts.push({
          agentCode: def.agentCode,
          alertType: 'high_failure_rate',
          severity: 'warning',
          detail: `${health.failures24h}/${health.runs24h} failures in 24h (${(health.failures24h / health.runs24h * 100).toFixed(0)}%)`,
          detectedAt: new Date().toISOString(),
        });
      }
    } catch {
      // skip agents where health check fails
    }
  }
}

async function checkBudgetAlerts(schema: string, _tenantId: string, alerts: WatchdogAlert[]): Promise<void> {
  try {
    const { rows } = await safeQuery(
      `SELECT agent_code, COALESCE(SUM(cost_usd), 0)::numeric AS total_cost
       FROM "${schema}".dos_agent_metrics
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY agent_code
       HAVING COALESCE(SUM(cost_usd), 0) > 50`,
      [],
    );
    for (const r of rows) {
      alerts.push({
        agentCode: r.agent_code,
        alertType: 'budget_breach',
        severity: 'warning',
        detail: `24h cost: $${parseFloat(r.total_cost).toFixed(2)} exceeds $50 threshold`,
        detectedAt: new Date().toISOString(),
      });
    }
  } catch {
    // metrics table may not exist yet
  }
}

export async function getWatchdogHistory(tenantId: string, limit = 20): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_watchdog_log ORDER BY swept_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export const kernelWatchdogService = {
  runWatchdogSweep,
  getWatchdogHistory,
};
