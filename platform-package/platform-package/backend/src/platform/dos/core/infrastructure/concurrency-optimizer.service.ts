// @ts-nocheck
// ============================================
// AGRC-OS — Concurrency Optimizer Service
// Requirements: 3.4 Concurrency Optimization
// Purpose: Optimizes concurrent agent execution to maximize throughput
// while respecting resource limits and dependencies
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { getAgentDependencyConfig } from '../../../../modules/ai/services/agent-cooperation.service';
import { getAgentWorkloadMetrics, balanceWorkload } from '../../../../modules/workflow/services/tasks/workload-balancer.service';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

export interface ConcurrencyPlan {
  tenantId: string;
  wave: number;
  agents: Array<{
    agentId: string;
    canExecute: boolean;
    reason: string;
    estimatedStartTime?: number;
  }>;
  totalConcurrent: number;
  estimatedCompletionTime: number;
}

export interface ExecutionWave {
  waveNumber: number;
  agentIds: string[];
  canExecuteInParallel: boolean;
  estimatedDuration: number;
}

/**
 * Optimize concurrent execution based on dependencies and resources
 */
export async function optimizeConcurrency(
  tenantId: string,
  agentIds: string[]
): Promise<ConcurrencyPlan> {
  const _schema = tenantSchema(tenantId);
  const waves: ExecutionWave[] = [];
  const executed = new Set<string>();
  let waveNumber = 0;

  // Build dependency graph
  const dependencies: Record<string, string[]> = {};
  const canParallel: Record<string, string[]> = {};

  for (const agentId of agentIds) {
    const config = await getAgentDependencyConfig(tenantId, agentId);
    dependencies[agentId] = config.dependsOn || [];
    canParallel[agentId] = config.canParallelWith || [];
  }

  // Build execution waves
  while (executed.size < agentIds.length) {
    waveNumber++;
    const waveAgents: string[] = [];

    // Find agents that can execute in this wave (dependencies satisfied)
    for (const agentId of agentIds) {
      if (executed.has(agentId)) continue;

      const deps = dependencies[agentId] || [];
      const allDepsSatisfied = deps.every(dep => executed.has(dep));

      if (allDepsSatisfied) {
        // Check workload balance
        const balance = await balanceWorkload(tenantId, agentId, 'medium');
        if (balance.shouldExecute || balance.shouldQueue) {
          waveAgents.push(agentId);
        }
      }
    }

    if (waveAgents.length === 0) break; // Deadlock or all queued

    // Get average execution time for this wave
    let maxDuration = 0;
    for (const agentId of waveAgents) {
      const metrics = await getAgentWorkloadMetrics(tenantId, agentId);
      maxDuration = Math.max(maxDuration, metrics.avgExecutionTime);
    }

    waves.push({
      waveNumber,
      agentIds: waveAgents,
      canExecuteInParallel: true,
      estimatedDuration: maxDuration,
    });

    // Mark as executed (for dependency resolution)
    waveAgents.forEach(id => executed.add(id));
  }

  // Build detailed plan
  const agents: ConcurrencyPlan['agents'] = [];
  let totalConcurrent = 0;
  let estimatedCompletionTime = 0;

  for (const wave of waves) {
    for (const agentId of wave.agentIds) {
      const _metrics = await getAgentWorkloadMetrics(tenantId, agentId);
      const balance = await balanceWorkload(tenantId, agentId, 'medium');

      agents.push({
        agentId,
        canExecute: balance.shouldExecute,
        reason: balance.reason,
        estimatedStartTime: estimatedCompletionTime,
      });

      if (balance.shouldExecute) {
        totalConcurrent++;
      }
    }

    estimatedCompletionTime += wave.estimatedDuration;
  }

  return {
    tenantId,
    wave: waveNumber,
    agents,
    totalConcurrent,
    estimatedCompletionTime,
  };
}

/**
 * Get optimal concurrency level for a tenant
 */
export async function getOptimalConcurrencyLevel(tenantId: string): Promise<{
  recommended: number;
  current: number;
  maxAllowed: number;
  reasoning: string;
}> {
  const schema = tenantSchema(tenantId);

  // Get current concurrent runs
  const currentRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: '0' }]), safeQuery(
    `SELECT COUNT(*) as count
     FROM "${schema}".agent_runs
     WHERE tenant_id = $1 AND status IN ('running', 'pending')`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  const current = Number(getFirstRow(currentRes)?.count || 0);

  // Get resource quota
  const { getTenantResourceQuota } = await import('./resource-allocator.service');
  const quota = await getTenantResourceQuota(tenantId);

  // Calculate optimal based on available resources
  const availableCompute = quota.totalComputeUnits - quota.currentUsage.computeUnits;
  const recommended = Math.floor(availableCompute / 50); // ~50 units per concurrent run
  const maxAllowed = Math.floor(quota.totalComputeUnits / 50);

  let reasoning = '';
  if (current >= maxAllowed) {
    reasoning = `At maximum capacity (${current}/${maxAllowed}). Reduce load or increase quota.`;
  } else if (current >= recommended) {
    reasoning = `Near optimal (${current}/${recommended}). Consider scaling down.`;
  } else {
    reasoning = `Below optimal (${current}/${recommended}). Can increase concurrency.`;
  }

  return {
    recommended,
    current,
    maxAllowed,
    reasoning,
  };
}

/**
 * Adjust concurrency dynamically based on system load
 */
export async function adjustConcurrency(tenantId: string): Promise<{
  adjusted: boolean;
  newLimit?: number;
  reason: string;
}> {
  const optimal = await getOptimalConcurrencyLevel(tenantId);

  // If current is significantly above recommended, throttle
  if (optimal.current > optimal.recommended * 1.2) {
    const newLimit = Math.floor(optimal.recommended * 1.1);

    await eventBus.publish({
      tenantId,
      eventType: 'concurrency_throttled',
      severity: 'warning',
      entityId: tenantId,
      payload: { current: optimal.current, newLimit, reason: optimal.reasoning },
    });

    return {
      adjusted: true,
      newLimit,
      reason: `Throttled from ${optimal.current} to ${newLimit}: ${optimal.reasoning}`,
    };
  }

  // If current is significantly below recommended, allow more
  if (optimal.current < optimal.recommended * 0.8 && optimal.current < optimal.maxAllowed) {
    const newLimit = Math.min(optimal.recommended, optimal.maxAllowed);

    await eventBus.publish({
      tenantId,
      eventType: 'concurrency_increased',
      severity: 'info',
      entityId: tenantId,
      payload: { current: optimal.current, newLimit, reason: optimal.reasoning },
    });

    return {
      adjusted: true,
      newLimit,
      reason: `Increased from ${optimal.current} to ${newLimit}: ${optimal.reasoning}`,
    };
  }

  return {
    adjusted: false,
    reason: `No adjustment needed: ${optimal.reasoning}`,
  };
}

/**
 * Get concurrency statistics for monitoring
 */
export async function getConcurrencyStats(tenantId: string): Promise<{
  currentConcurrent: number;
  peakConcurrent: number;
  avgConcurrent: number;
  utilizationRate: number;
  recommendations: string[];
}> {
  const schema = tenantSchema(tenantId);

  // Current
  const currentRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: '0' }]), safeQuery(
    `SELECT COUNT(*) as count
     FROM "${schema}".agent_runs
     WHERE tenant_id = $1 AND status IN ('running', 'pending')`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  const currentConcurrent = Number(getFirstRow(currentRes)?.count || 0);

  // Peak (last 24 hours)
  const peakRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ peak: '0' }]), safeQuery(
    `SELECT MAX(concurrent_count) as peak
     FROM (
       SELECT COUNT(*) as concurrent_count
       FROM "${schema}".agent_runs
       WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY DATE_TRUNC('hour', created_at)
     ) hourly`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  const peakConcurrent = Number(getFirstRow(peakRes)?.peak || 0);

  // Average (last 24 hours)
  const avgRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ avg: '0' }]), safeQuery(
    `SELECT AVG(concurrent_count) as avg
     FROM (
       SELECT COUNT(*) as concurrent_count
       FROM "${schema}".agent_runs
       WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY DATE_TRUNC('hour', created_at)
     ) hourly`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query agent_runs' });

  const avgConcurrent = Number(getFirstRow(avgRes)?.avg || 0);

  // Get optimal level
  const optimal = await getOptimalConcurrencyLevel(tenantId);
  const utilizationRate = optimal.maxAllowed > 0 
    ? (currentConcurrent / optimal.maxAllowed) * 100 
    : 0;

  const recommendations: string[] = [];
  if (utilizationRate > 90) {
    recommendations.push('Concurrency utilization >90%. Consider increasing quota or reducing load.');
  } else if (utilizationRate < 30) {
    recommendations.push('Low utilization. Can increase concurrent runs for better throughput.');
  }

  if (currentConcurrent > optimal.recommended * 1.2) {
    recommendations.push(`Current (${currentConcurrent}) exceeds recommended (${optimal.recommended}). Consider throttling.`);
  }

  return {
    currentConcurrent,
    peakConcurrent,
    avgConcurrent: Math.round(avgConcurrent * 100) / 100,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    recommendations,
  };
}
