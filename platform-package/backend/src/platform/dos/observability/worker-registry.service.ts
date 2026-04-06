/**
 * Worker Registry — DOS Observability
 *
 * Unified registry for ALL worker types across the platform.
 * Tracks registration, health, and provides discovery for the admin dashboard.
 *
 * @owner DOS
 * Maps to: AGENTS.md Patch 0 §5, Patch 1 §2.11
 */

import { safeQuery } from '../../../config/database/database';
import { logger } from '../logger';

// ── Types ──

export type WorkerType = 'enforcement' | 'temporal' | 'job' | 'agent' | 'event' | 'mcp' | 'provisioning';

export interface WorkerRegistration {
  workerType: WorkerType;
  workerName: string;
  description: string;
  owner: 'DOS' | 'DAuth' | 'Shahin-AI';
  schedule?: string; // cron expression or 'on-demand'
  healthEndpoint?: string;
}

export interface WorkerStatus {
  workerType: WorkerType;
  workerName: string;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastDurationMs: number | null;
  totalRuns: number;
  failCount: number;
  successRate: number;
}

// ── Registry ──

const registry: Map<string, WorkerRegistration> = new Map();

export function registerWorker(reg: WorkerRegistration): void {
  const key = `${reg.workerType}:${reg.workerName}`;
  registry.set(key, reg);
  logger.info(`[WorkerRegistry] Registered ${key} (owner: ${reg.owner})`);
}

export function getRegisteredWorkers(): WorkerRegistration[] {
  return Array.from(registry.values());
}

export function getWorkersByType(type: WorkerType): WorkerRegistration[] {
  return Array.from(registry.values()).filter(w => w.workerType === type);
}

// ── Status from DB ──

export async function getWorkerStatuses(): Promise<WorkerStatus[]> {
  const result = await safeQuery(`
    SELECT
      worker_type,
      worker_name,
      MAX(started_at) as last_run_at,
      (SELECT status FROM public.worker_executions w2 WHERE w2.worker_type = we.worker_type AND w2.worker_name = we.worker_name ORDER BY started_at DESC LIMIT 1) as last_status,
      (SELECT duration_ms FROM public.worker_executions w3 WHERE w3.worker_type = we.worker_type AND w3.worker_name = we.worker_name ORDER BY started_at DESC LIMIT 1) as last_duration_ms,
      COUNT(*) as total_runs,
      COUNT(*) FILTER (WHERE status = 'failed') as fail_count
    FROM public.worker_executions we
    GROUP BY worker_type, worker_name
    ORDER BY worker_type, worker_name
  `);

  return result.rows.map((r: any) => ({
    workerType: r.worker_type,
    workerName: r.worker_name,
    lastRunAt: r.last_run_at,
    lastStatus: r.last_status,
    lastDurationMs: r.last_duration_ms,
    totalRuns: parseInt(r.total_runs, 10),
    failCount: parseInt(r.fail_count, 10),
    successRate: r.total_runs > 0 ? Math.round((1 - r.fail_count / r.total_runs) * 100) : 100,
  }));
}

// ── Bootstrap: register all known workers ──

export function bootstrapWorkerRegistry(): void {
  // Enforcement workers
  const enforcementChecks = [
    'noStubs', 'dirBudget', 'deprecatedDeathDates', 'wrongLayerImports',
    'noFrontendAuthTruth', 'forbiddenNames', 'v2Files', 'ownershipBoundaries',
  ];
  for (const check of enforcementChecks) {
    registerWorker({ workerType: 'enforcement', workerName: check, description: `Enforcement: ${check}`, owner: 'DOS', schedule: '0 3 * * *' });
  }

  // Temporal workers
  for (const name of ['general', 'provisioning', 'agent', 'evidence', 'sla']) {
    registerWorker({ workerType: 'temporal', workerName: name, description: `Temporal worker: ${name}`, owner: 'DOS', schedule: 'always-on', healthEndpoint: '/api/health' });
  }

  // Job scheduler (registered dynamically by job-scheduler.service.ts)
  registerWorker({ workerType: 'job', workerName: 'job-scheduler', description: 'Platform job scheduler', owner: 'DOS', schedule: 'per-job cron' });

  // LangGraph agents
  registerWorker({ workerType: 'agent', workerName: 'single-agent-graph', description: 'LangGraph single-agent executor', owner: 'Shahin-AI', schedule: 'on-demand' });
  registerWorker({ workerType: 'agent', workerName: 'orchestrator-graph', description: 'LangGraph multi-agent orchestrator', owner: 'Shahin-AI', schedule: 'on-demand' });

  // MCP
  registerWorker({ workerType: 'mcp', workerName: 'mcp-http', description: 'MCP HTTP server', owner: 'DOS', schedule: 'always-on', healthEndpoint: ':8080/health' });
  registerWorker({ workerType: 'mcp', workerName: 'openclaw', description: 'OpenClaw MCP server', owner: 'DOS', schedule: 'always-on' });

  logger.info(`[WorkerRegistry] Bootstrap complete: ${registry.size} workers registered`);
}
