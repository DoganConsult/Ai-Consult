// @ts-nocheck
/**
 * Enforcement Metrics — Prometheus + Event Bus
 *
 * Emits Prometheus counters/histograms for enforcement runs
 * and publishes events to the platform event bus.
 *
 * @owner DOS
 * Maps to: AGENTS.md Enterprise Playbook §AQ (monitoring), §Q (observability)
 */

import { logger } from './logger.service';
import type { EnforcementSweepResult, EnforcementCheckResult } from '../../../temporal/activities/enforcement/enforcement.activities';

// ── Prometheus Metrics ──
// Uses the existing prometheus.service.ts pattern — registers custom metrics

let prometheusRegistered = false;
let enforcementCheckTotal: unknown;
let enforcementSweepDuration: unknown;
let workerExecutionTotal: unknown;
let workerExecutionDuration: unknown;

export function registerEnforcementMetrics(): void {
  if (prometheusRegistered) return;
  try {
    const prom = require('prom-client');

    enforcementCheckTotal = new prom.Counter({
      name: 'enforcement_check_total',
      help: 'Total enforcement checks by name and status',
      labelNames: ['check', 'status'],
    });

    enforcementSweepDuration = new prom.Histogram({
      name: 'enforcement_sweep_duration_seconds',
      help: 'Enforcement sweep duration in seconds',
      buckets: [1, 5, 10, 30, 60, 120],
    });

    workerExecutionTotal = new prom.Counter({
      name: 'worker_execution_total',
      help: 'Worker executions by type, name, and status',
      labelNames: ['type', 'name', 'status'],
    });

    workerExecutionDuration = new prom.Histogram({
      name: 'worker_execution_duration_seconds',
      help: 'Worker execution duration in seconds',
      labelNames: ['type', 'name'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
    });

    prometheusRegistered = true;
    logger.info('[EnforcementMetrics] Prometheus metrics registered');
  } catch {
    logger.warn('[EnforcementMetrics] prom-client not available — metrics disabled');
  }
}

// ── Record Metrics ──

export function recordCheckResult(check: EnforcementCheckResult): void {
  if (enforcementCheckTotal) {
    enforcementCheckTotal.inc({ check: check.checkName, status: check.status });
  }
}

export function recordSweepDuration(durationMs: number): void {
  if (enforcementSweepDuration) {
    enforcementSweepDuration.observe(durationMs / 1000);
  }
}

export function recordWorkerExecution(type: string, name: string, status: string, durationMs: number): void {
  if (workerExecutionTotal) {
    workerExecutionTotal.inc({ type, name, status });
  }
  if (workerExecutionDuration && durationMs > 0) {
    workerExecutionDuration.observe({ type, name }, durationMs / 1000);
  }
}

// ── Event Bus Integration ──

export async function emitEnforcementEvent(result: EnforcementSweepResult): Promise<void> {
  try {
    const { eventBus } = await import('../events/event-bus');
    eventBus.publish('enforcement.sweep.completed', {
      runId: result.runId,
      verdict: result.verdict,
      checkCount: result.checks.length,
      failCount: result.checks.filter(c => c.status === 'FAIL').length,
      totalDurationMs: result.totalDurationMs,
      timestamp: result.timestamp,
    });

    // Emit individual failure events for alerting
    for (const check of result.checks) {
      if (check.status === 'FAIL') {
        eventBus.publish('enforcement.check.failed', {
          runId: result.runId,
          checkName: check.checkName,
          lawRef: check.lawRef,
          findingCount: check.findings.length,
          findings: check.findings.slice(0, 5), // first 5 for notification
        });
      }
    }
  } catch (err) {
    logger.warn('[EnforcementMetrics] Failed to emit event', { error: (err as Error).message });
  }
}
