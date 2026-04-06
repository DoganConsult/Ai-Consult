// @ts-nocheck
// @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
import { logger } from '../observability/logger.service';
/**
 * CANONICAL JOB SCHEDULING SERVICE
 *
 * When TEMPORAL_ENABLED=true (default): Temporal is the primary scheduler.
 * Job handlers are registered in-memory for Temporal to invoke via executeJobByName().
 * node-cron intervals are NOT started.
 *
 * When TEMPORAL_ENABLED=false (fallback): node-cron schedules jobs directly.
 *
 * Distributed lock via Redis prevents duplicate execution across PM2 cluster workers.
 * Falls back to process-local runningJobs Set if Redis unavailable.
 */

import * as cron from "node-cron";
import * as crypto from "crypto";
import { safeQuery } from '../../../config/database/database';
import { getRedis, redisConnected } from '../../../config/database/redis';
import { toErrorMessage } from '../../../errors/http-error.util';
import { getFirstRow } from '../../../shared/data/db-utils';

export type JobDefinition = { name?: string; jobCode?: string; cron?: string; schedule?: string; handler?: () => Promise<void> };
const _staticJobDefinitions: JobDefinition[] = [];

export function registerStaticJobDefinition(definition: JobDefinition) {
  _staticJobDefinitions.push(definition);
}

// === Types ===

export interface JobConfig {
  name: string;
  cronExpression: string;
  enabled: boolean;
  description?: string;
}

export interface JobInfo {
  job_name: string;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface JobExecution {
  execution_id: string;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
}

// === In-memory state ===

const scheduledTasks = new Map<string, cron.ScheduledTask>();
const runningJobs = new Set<string>();
const jobHandlers = new Map<string, () => Promise<void>>();

// When true, registerJob() only stores handlers — does NOT start cron intervals.
// Set by registerJobHandlersOnly() when Temporal is the primary scheduler.
let handlerOnlyMode = false;

// === Register a job ===

export async function registerJob(
  name: string,
  cronExpression: string,
  handler: () => Promise<void>
): Promise<void> {
  // Store handler for Temporal-based invocation via executeJobByName()
  jobHandlers.set(name, handler);

  // Upsert into job_registry
  await safeQuery(
    `INSERT INTO job_registry (job_name, cron_expression, enabled)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (job_name) DO UPDATE SET cron_expression = $2`,
    [name, cronExpression]
  );

  // In handler-only mode (Temporal primary), skip cron scheduling
  if (handlerOnlyMode) return;

  // In PM2 Cluster mode, only the leader (instance 0) should run node-cron intervals
  // to prevent duplicate DB load across all Express instances.
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') {
    logger.debug(`[JobScheduler] Follower instance — skipping node-cron activation for ${name}`);
    return;
  }

  // Stop existing task if re-registering
  const existing = scheduledTasks.get(name);
  if (existing) {
    existing.stop();
  }

  // Schedule with node-cron
  const task = cron.schedule(cronExpression, async () => {
    await executeJob(name, handler);
  });

  scheduledTasks.set(name, task);
}

// === Register all job handlers without cron intervals ===
// Used when Temporal is the primary scheduler. Sets handlerOnlyMode so
// registerJob() stores handlers in the jobHandlers Map and upserts into
// job_registry, but does NOT call cron.schedule().
// Temporal activities call executeJobByName() which looks up these handlers.

async function registerJobHandlersOnly(): Promise<void> {
  handlerOnlyMode = true;
  await registerAllJobDefinitions();
  handlerOnlyMode = false;
}

// === Execute a job by name (for Temporal Scheduled Workflows) ===
// Looks up the handler registered via registerJob() and runs it
// with the same single-instance locking and execution recording.

export async function executeJobByName(jobName: string): Promise<void> {
  let handler = jobHandlers.get(jobName);
  if (!handler) {
    logger.info(`[AI-OS] Handler lazy-registration triggered for job: ${jobName}`);
    await registerJobHandlersOnly();
    handler = jobHandlers.get(jobName);
  }
  if (!handler) {
    throw new Error(`[JobScheduler] No handler registered for job: ${jobName}`);
  }
  await executeJob(jobName, handler);
}

// === Execute a job with distributed lock (Redis) + process-local fallback ===

// Lua script for token-safe lock release: only deletes if the stored value matches our token
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

async function executeJob(
  name: string,
  handler: () => Promise<void>
): Promise<void> {
  const lockKey = `job:lock:${name}`;
  const lockToken = crypto.randomUUID();
  let usedRedisLock = false;

  // --- Distributed lock via Redis (preferred) ---
  try {
    if (redisConnected()) {
      const redis = getRedis();
      // NX = only set if not exists, PX = expire in milliseconds (5 min TTL)
      const acquired = await redis.set(lockKey, lockToken, "PX", 300000, "NX");
      if (!acquired) {
        logger.info(`[JobScheduler] Skipping ${name} — distributed lock held by another worker`);
        return;
      }
      usedRedisLock = true;
    }
  } catch (redisErr: unknown) {
    // Redis unavailable — fall back to process-local lock
    logger.warn(`[JobScheduler] Redis lock unavailable for ${name}, using process-local lock: ${toErrorMessage(redisErr)}`);
  }

  // --- Process-local fallback lock (used when Redis is unavailable) ---
  if (!usedRedisLock) {
    if (runningJobs.has(name)) {
      logger.info(`[JobScheduler] Skipping ${name} — already running (process-local)`);
      return;
    }
  }

  runningJobs.add(name);
  const startTime = Date.now();

  // Record execution start
  const execResult = await safeQuery(
    `INSERT INTO job_executions (job_name, status) VALUES ($1, 'running') RETURNING execution_id`,
    [name]
  );
  const executionId = getFirstRow(execResult)?.execution_id;

  try {
    await handler();

    const durationMs = Date.now() - startTime;

    // Record success
    await safeQuery(
      `UPDATE job_executions SET status = 'success', completed_at = NOW(), duration_ms = $1
       WHERE execution_id = $2`,
      [durationMs, executionId]
    );

    // Update registry
    await safeQuery(
      `UPDATE job_registry SET last_run_at = NOW(), last_status = 'success', last_error = NULL
       WHERE job_name = $1`,
      [name]
    );

    logger.info(`[JobScheduler] ${name} completed in ${durationMs}ms`);
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = toErrorMessage(err) || String(err);

    // Record failure
    await safeQuery(
      `UPDATE job_executions SET status = 'failed', completed_at = NOW(), duration_ms = $1, error_message = $2
       WHERE execution_id = $3`,
      [durationMs, errorMessage, executionId]
    );

    // Update registry
    await safeQuery(
      `UPDATE job_registry SET last_run_at = NOW(), last_status = 'failed', last_error = $1
       WHERE job_name = $2`,
      [errorMessage, name]
    );

    logger.error(`[JobScheduler] ${name} failed: ${errorMessage}`);
  } finally {
    runningJobs.delete(name);

    // Release distributed lock with token-safe compare-and-delete
    if (usedRedisLock) {
      try {
        const redis = getRedis();
        await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, lockToken);
      } catch (releaseErr: unknown) {
        logger.warn(`[JobScheduler] Failed to release Redis lock for ${name}: ${toErrorMessage(releaseErr)}`);
      }
    }
  }
}

// === Query functions ===

export async function getJobs(): Promise<JobInfo[]> {
  const result = await safeQuery(`SELECT * FROM job_registry ORDER BY job_name`);
  return result.rows;
}

export async function getJobHistory(
  jobName: string,
  limit: number = 50
): Promise<JobExecution[]> {
  const result = await safeQuery(
    `SELECT * FROM job_executions WHERE job_name = $1 ORDER BY started_at DESC LIMIT $2`,
    [jobName, limit]
  );
  return result.rows;
}

// === Config serialize/deserialize ===

export function serializeJobConfig(config: JobConfig): string {
  return JSON.stringify(config);
}

export function deserializeJobConfig(json: string): JobConfig {
  const parsed = JSON.parse(json);
  return {
    name: parsed.name,
    cronExpression: parsed.cronExpression,
    enabled: parsed.enabled,
    description: parsed.description,
  };
}

// === Utility: check if a job is currently running ===

export function isJobRunning(name: string): boolean {
  return runningJobs.has(name);
}

// === Utility: get only provisioned tenants (schema has core tables) ===
// Exported for use by other schedulers and background jobs (e.g. AgrcEngineScheduler).

export async function getProvisionedTenants(): Promise<Array<{ tenant_id: string; settings?: unknown }>> {
  const tenants = await safeQuery(
    `SELECT t.tenant_id, t.settings
     FROM tenants t
     WHERE (t.status = 'active' OR t.status = 'onboarding')
       AND t.tenant_id ~ '^[a-z0-9_]+$'
       AND EXISTS (
         SELECT 1 FROM information_schema.schemata s
         WHERE s.schema_name = 'tenant_' || t.tenant_id
       )
       AND EXISTS (
         SELECT 1 FROM information_schema.tables tb
         WHERE tb.table_schema = 'tenant_' || t.tenant_id
           AND tb.table_name = 'controls'
       )`
  );
  return tenants.rows;
}

// === Default Jobs Registration ===

export async function registerDefaultJobs(): Promise<void> {
  if (process.env.DISABLE_SCHEDULERS === 'true') {
    logger.info('[JobScheduler] All scheduled jobs disabled via DISABLE_SCHEDULERS=true');
    return;
  }

  // When Temporal is the primary scheduler, register handlers only (no cron intervals).
  // Temporal schedules call executeJobByName() which looks up handlers from the jobHandlers Map.
  if (process.env.TEMPORAL_ENABLED === 'true') {
    logger.info('[JobScheduler] Temporal is primary scheduler — registering handlers only (no cron intervals)');
    await registerJobHandlersOnly();
    return;
  }

  // Fallback: register all jobs with cron intervals (TEMPORAL_ENABLED is not true)
  await registerAllJobDefinitions();
}

// === Post-job registration hooks (replaces hard-coded product imports) ===
// Modules register their own event subscriptions by calling registerPostJobHook()
// during their own startup phase (via server-startup.ts), not inside Platform Core.

type PostJobHookFn = () => Promise<void>;
const _postJobHooks: PostJobHookFn[] = [];

/**
 * Register a function to be called after all job definitions are loaded.
 * Use this in server-startup.ts to wire in Product/Module event subscriptions
 * without coupling Platform Core to specific product modules.
 */
export function registerPostJobHook(fn: PostJobHookFn): void {
  _postJobHooks.push(fn);
}

async function registerAllJobDefinitions(): Promise<void> {
  const allJobs = _staticJobDefinitions;
  for (const job of allJobs) {
    const jobKey = (job as Record<string, unknown>)?.jobCode ?? job.name;
    await registerJob(jobKey, (job as Record<string, unknown>)?.cron ?? (job as Record<string, unknown>)?.schedule ?? '0 * * * *', (job as Record<string, unknown>)?.handler ?? (async () => { logger.info(`[JobScheduler] No handler for ${jobKey}`); })) as string;
  }

  logger.info(`[JobScheduler] ${allJobs.length} jobs registered`);

  // Run all externally-registered post-job hooks (Product/Module subscriptions)
  for (const hook of _postJobHooks) {
    try {
      await hook();
    } catch (err: unknown) {
      logger.error('[JobScheduler] Post-job hook failed:', toErrorMessage(err));
    }
  }
}



