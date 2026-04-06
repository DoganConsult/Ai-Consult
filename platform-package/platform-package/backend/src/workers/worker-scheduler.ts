// ============================================
// Shahin GRC — Worker Scheduler
// Orchestrates all background workers and provides
// shared helpers for tenant iteration and notifications.
//
// Worker tenant contract (Phase 9 / multi-DB):
// - Tenant identity always comes from control plane `public.tenants` (listActiveTenants),
//   never from job body, queue payload, or client-supplied tenantId alone.
// - `productKey` is loaded from the same row for entitlements/logging; workers must not
//   treat product scope from untrusted messages without control-plane validation.
// - Health workers use the default platform pool + quoted schema names; tenants with
//   `isolation_mode = 'database'` are skipped here until queries are routed through
//   TenantConnectionResolver (same resolver as HTTP).
// ============================================

import { randomUUID } from 'crypto';
import { query, safeQuery } from '../config/database/database';
import { getDefaultProductKey } from '../platform/deployment-profile';
import { logger } from '../platform/dos/observability/logger.service';
import type {
  WorkerConfig,
  TenantInfo,
  WorkerRunSummary,
  WorkerStatus,
} from './workspace-health-types';

// ---------------------------------------------------------------------------
// WorkerScheduler — orchestrates all background workers
// ---------------------------------------------------------------------------

export class WorkerScheduler {
  private workers: Map<string, WorkerConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private running: Set<string> = new Set();
  private lastRun: Map<string, { at: Date; status: string; durationMs: number }> = new Map();
  private log = logger.child({ service: 'workspace-health-workers' });

  /** Register a worker with the scheduler */
  register(config: WorkerConfig): void {
    this.workers.set(config.name, config);
    this.log.info(`Worker registered: ${config.name}`, {
      interval: `${config.intervalMs / 1000}s`,
      enabled: config.enabled,
    });
  }

  /** Start all registered and enabled workers */
  async start(): Promise<void> {
    // Ensure the execution log table exists
    await this.ensureLogTable();

    for (const [name, config] of this.workers) {
      if (!config.enabled) {
        this.log.info(`Worker ${name} is disabled — skipping`);
        continue;
      }
      this.scheduleWorker(name, config);
    }

    this.log.info('WorkerScheduler started', {
      totalWorkers: this.workers.size,
      enabledWorkers: [...this.workers.values()].filter(w => w.enabled).length,
    });
  }

  /** Stop all workers */
  stop(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      this.log.info(`Worker stopped: ${name}`);
    }
    this.timers.clear();
    this.log.info('WorkerScheduler stopped');
  }

  /** Get status of all registered workers */
  getStatus(): WorkerStatus[] {
    const statuses: WorkerStatus[] = [];
    for (const [name, config] of this.workers) {
      const last = this.lastRun.get(name);
      const nextRunAt = last
        ? new Date(last.at.getTime() + config.intervalMs).toISOString()
        : null;

      statuses.push({
        name,
        description: config.description,
        intervalMs: config.intervalMs,
        enabled: config.enabled,
        running: this.running.has(name),
        lastRunAt: last?.at.toISOString() ?? null,
        lastStatus: last?.status ?? null,
        lastDurationMs: last?.durationMs ?? null,
        nextRunAt,
      });
    }
    return statuses;
  }

  // -- Private ---------------------------------------------------------------

  private scheduleWorker(name: string, config: WorkerConfig): void {
    // Run once after a short staggered delay (avoid all workers hitting DB at once)
    const staggerMs = Math.floor(Math.random() * 30_000) + 5_000;
    setTimeout(() => this.executeWorker(name, config), staggerMs);

    // Then schedule on interval
    const timer = setInterval(() => this.executeWorker(name, config), config.intervalMs);
    this.timers.set(name, timer);

    this.log.info(`Worker scheduled: ${name}`, {
      firstRunIn: `${Math.round(staggerMs / 1000)}s`,
      interval: `${config.intervalMs / 1000}s`,
    });
  }

  private async executeWorker(name: string, config: WorkerConfig): Promise<void> {
    // Prevent concurrent runs of the same worker
    if (this.running.has(name)) {
      this.log.warn(`Worker ${name} is still running — skipping this cycle`);
      return;
    }

    this.running.add(name);
    const startedAt = new Date();
    const logId = await this.logStart(name);

    this.log.info(`Worker started: ${name}`, { logId });

    try {
      const tenants = await this.listActiveTenants();
      const summary = await config.handler(tenants);
      const durationMs = Date.now() - startedAt.getTime();

      await this.logComplete(logId, 'completed', durationMs, summary);

      this.lastRun.set(name, { at: startedAt, status: 'completed', durationMs });

      this.log.info(`Worker completed: ${name}`, {
        logId,
        durationMs,
        itemsProcessed: summary.itemsProcessed,
        itemsFixed: summary.itemsFixed,
        errorCount: summary.errors.length,
      });
    } catch (err: unknown) {
      const durationMs = Date.now() - startedAt.getTime();
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      await this.logComplete(logId, 'failed', durationMs, {
        itemsProcessed: 0,
        itemsFixed: 0,
        errors: [{ message: errorMsg }],
      });

      this.lastRun.set(name, { at: startedAt, status: 'failed', durationMs });

      this.log.error(`Worker failed: ${name}`, {
        logId,
        durationMs,
        error: errorMsg,
      });
    } finally {
      this.running.delete(name);
    }
  }

  private async listActiveTenants(): Promise<TenantInfo[]> {
    const result = await query(
      `SELECT tenant_id, schema_name, COALESCE(product_key, $1) AS product_key
       FROM public.tenants
       WHERE status = 'active'
         AND schema_name IS NOT NULL
         AND (isolation_mode IS NULL OR isolation_mode <> 'database')`,
      [getDefaultProductKey()]
    );
    return result.rows.map((r: { tenant_id: string; schema_name: string; product_key: string }) => ({
      tenantId: r.tenant_id,
      schema: r.schema_name,
      productKey: r.product_key,
    }));
  }

  private async ensureLogTable(): Promise<void> {
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS public.worker_execution_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_name VARCHAR(100) NOT NULL,
        tenant_id TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        duration_ms INTEGER,
        items_processed INTEGER DEFAULT 0,
        items_fixed INTEGER DEFAULT 0,
        errors JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}'
      )
    `);
  }

  private async logStart(workerName: string): Promise<string> {
    const id = randomUUID();
    await safeQuery(
      `INSERT INTO public.worker_execution_log (id, worker_name, status, started_at)
       VALUES ($1::uuid, $2::text, 'running', NOW())`,
      [id, workerName]
    );
    return id;
  }

  private async logComplete(
    logId: string,
    status: string,
    durationMs: number,
    summary: WorkerRunSummary
  ): Promise<void> {
    await safeQuery(
      `UPDATE public.worker_execution_log
       SET status = $2::text,
           completed_at = NOW(),
           duration_ms = $3::int,
           items_processed = $4::int,
           items_fixed = $5::int,
           errors = $6::jsonb,
           metadata = $7::jsonb
       WHERE id = $1::uuid`,
      [
        logId,
        status,
        durationMs,
        summary.itemsProcessed,
        summary.itemsFixed,
        JSON.stringify(summary.errors),
        JSON.stringify(summary.metadata ?? {}),
      ]
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: run handler for each tenant sequentially, aggregating results
// ---------------------------------------------------------------------------

export async function forEachTenant(
  tenants: TenantInfo[],
  fn: (tenant: TenantInfo) => Promise<{ processed: number; fixed: number; errors: Array<{ tenantId?: string; message: string }> }>
): Promise<WorkerRunSummary> {
  let totalProcessed = 0;
  let totalFixed = 0;
  const allErrors: Array<{ tenantId?: string; message: string }> = [];

  for (const tenant of tenants) {
    try {
      const result = await fn(tenant);
      totalProcessed += result.processed;
      totalFixed += result.fixed;
      allErrors.push(...result.errors);
    } catch (err: unknown) {
      allErrors.push({ tenantId: tenant.tenantId, message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return { itemsProcessed: totalProcessed, itemsFixed: totalFixed, errors: allErrors };
}

// ---------------------------------------------------------------------------
// Helper: create a notification in a tenant schema (safe — catches errors)
// ---------------------------------------------------------------------------

export async function createNotification(
  schema: string,
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string | null
): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".notifications
     (notification_id, user_id, type, title, body, link, read, read_at)
     VALUES (gen_random_uuid(), $1::text, $2::text, $3::text, $4::text, $5::text, false, NULL)`,
    [userId, type, title, body, link ?? null]
  );
}
