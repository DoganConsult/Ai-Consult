// ============================================================
// Dogan Operating System — Health Guardian
// Monitors DB connectivity, memory, and event loop lag
// ============================================================

import { Pool } from 'pg';
import { BaseDoganGuardian } from './base-dogan-guardian.worker';

const HEAP_WARN_MB = 512;
const EVENT_LOOP_LAG_WARN_MS = 100;

/**
 * Periodically checks platform health indicators:
 * - Database connection (SELECT 1)
 * - Heap memory usage
 * - Event loop lag
 */
export class HealthGuardian extends BaseDoganGuardian {
  readonly guardianName = 'health-guardian';
  readonly intervalMs = 60_000; // 60 seconds

  constructor(pool: Pool) {
    super(pool);
  }

  async execute(): Promise<void> {
    // 1. DB connectivity check
    const dbStart = Date.now();
    try {
      await this.pool.query('SELECT 1');
      const dbLatencyMs = Date.now() - dbStart;
      if (dbLatencyMs > 500) {
        this.log('warn', `DB latency high: ${dbLatencyMs}ms`);
        await this.persistEvent('anomaly', 'warn', { type: 'db_latency', latencyMs: dbLatencyMs });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('error', `DB connection failed: ${msg}`);
      await this.persistEvent('anomaly', 'error', { type: 'db_connection_failure', error: msg });
    }

    // 2. Memory usage check
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMb = Math.round(mem.rss / 1024 / 1024);

    if (heapUsedMb > HEAP_WARN_MB) {
      this.log('warn', `Heap usage high: ${heapUsedMb}MB / ${heapTotalMb}MB (RSS: ${rssMb}MB)`);
      await this.persistEvent('anomaly', 'warn', {
        type: 'high_memory',
        heapUsedMb,
        heapTotalMb,
        rssMb,
      });
    }

    // 3. Event loop lag check
    const lagMs = await this.measureEventLoopLag();
    if (lagMs > EVENT_LOOP_LAG_WARN_MS) {
      this.log('warn', `Event loop lag: ${lagMs}ms`);
      await this.persistEvent('anomaly', 'warn', { type: 'event_loop_lag', lagMs });
    }
  }

  /**
   * Measure event loop lag by scheduling a timer and checking drift.
   */
  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        resolve(Date.now() - start);
      });
    });
  }
}
