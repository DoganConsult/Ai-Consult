// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getAgentDefinition, setAgentState } from '../registry/agent-registry.service';
import type { AgentHealthSnapshot, HealthPosture } from '../contracts/agent.types';

const _failureCounts = new Map<string, number>();

export async function checkAgentHealth(tenantId: string, agentCode: string): Promise<AgentHealthSnapshot> {
  const def = getAgentDefinition(agentCode);
  const schema = tenantSchema(tenantId);

  const { rows: runRows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COALESCE(AVG(duration_ms),0)::int AS avg_duration
     FROM "${schema}".dos_agent_runs
     WHERE agent_code = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [agentCode],
  );

  const stats = runRows[0] || { total: 0, failed: 0, completed: 0, avg_duration: 0 };
  const consecutiveFailures = _failureCounts.get(`${tenantId}:${agentCode}`) ?? 0;
  const posture = determinePosture(stats, consecutiveFailures, def?.healthPolicy);

  return {
    agentCode,
    tenantId,
    posture,
    consecutiveFailures,
    runs24h: stats.total,
    failures24h: stats.failed,
    avgDurationMs: stats.avg_duration,
    lastCheckedAt: new Date().toISOString(),
  };
}

export function recordRunOutcome(tenantId: string, agentCode: string, success: boolean): void {
  const key = `${tenantId}:${agentCode}`;
  if (success) {
    _failureCounts.set(key, 0);
  } else {
    _failureCounts.set(key, (_failureCounts.get(key) ?? 0) + 1);
  }
}

export async function evaluateCircuitBreaker(tenantId: string, agentCode: string): Promise<boolean> {
  const def = getAgentDefinition(agentCode);
  if (!def) return false;

  const key = `${tenantId}:${agentCode}`;
  const failures = _failureCounts.get(key) ?? 0;

  if (failures >= def.healthPolicy.circuitBreakerThreshold) {
    if (def.healthPolicy.autoDisableOnFailure) {
      await setAgentState(tenantId, agentCode, 'disabled', 'system:circuit_breaker', `${failures} consecutive failures`);
    }
    return true;
  }

  try {
    const { getOrCreateBreaker } = await import('../../../../utils/circuit-breaker');
    const getBreaker = (name: string) => getOrCreateBreaker({ name });
    const breaker = getBreaker(`agent:${agentCode}`);
    if (breaker.getState() === 'OPEN') return true;
  } catch {
    // Temporal circuit breaker unavailable
  }

  return false;
}

export async function getAllAgentHealth(tenantId: string): Promise<AgentHealthSnapshot[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT agent_code FROM "${schema}".dos_agent_registry`,
    [],
  );
  const snapshots: AgentHealthSnapshot[] = [];
  for (const r of rows) {
    snapshots.push(await checkAgentHealth(tenantId, r.agent_code));
  }
  return snapshots;
}

function determinePosture(
  stats: { total: number; failed: number },
  consecutiveFailures: number,
  healthPolicy?: { maxConsecutiveFailures: number; circuitBreakerThreshold: number },
): HealthPosture {
  if (!healthPolicy) return 'unknown';
  if (consecutiveFailures >= healthPolicy.circuitBreakerThreshold) return 'unhealthy';
  if (consecutiveFailures >= healthPolicy.maxConsecutiveFailures) return 'degraded';
  if (stats.total > 0 && stats.failed / stats.total > 0.5) return 'degraded';
  return 'healthy';
}

export function resetHealthCounters(): void {
  _failureCounts.clear();
}

export const agentHealthService = {
  checkAgentHealth,
  recordRunOutcome,
  evaluateCircuitBreaker,
  getAllAgentHealth,
  resetHealthCounters,
};
