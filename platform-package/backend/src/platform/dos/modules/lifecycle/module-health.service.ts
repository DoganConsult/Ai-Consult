// @ts-nocheck
import { query, safeQuery } from '../../../config/database';
import { logger } from '../observability/logger.service';

// --- Types ---

export interface HealthCheckResult {
  checkName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  latencyMs: number;
  checkedAt: Date;
}

export interface ModuleHealthStatus {
  moduleCode: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  lastCheckedAt: Date | null;
}

export interface HealthEvent {
  eventType: 'status_change' | 'check_failure' | 'recovery' | 'degradation';
  previousStatus: string | null;
  currentStatus: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface HealthHistoryEntry {
  moduleCode: string;
  eventType: string;
  previousStatus: string | null;
  currentStatus: string;
  message: string;
  metadata: Record<string, unknown>;
  recordedAt: Date;
}

// --- In-memory health check registry ---

type HealthCheckFn = () => Promise<HealthCheckResult>;

const healthCheckRegistry = new Map<string, Map<string, HealthCheckFn>>();

// --- Functions ---

/**
 * Get the current health status for a module including all registered check results.
 */
export async function getModuleHealth(moduleCode: string): Promise<ModuleHealthStatus> {
  try {
    // Run registered health checks if any
    const checks = await runModuleHealthChecks(moduleCode);

    // Also fetch the latest persisted status
    const result = await safeQuery(
      `SELECT overall_status, last_checked_at
       FROM module_health_status
       WHERE module_code = $1 LIMIT 1`,
      [moduleCode],
    );

    const dbRow = result.rows[0] as any;
    const overallStatus = checks.length > 0
      ? deriveOverallStatus(checks)
      : (dbRow?.overall_status || 'healthy');

    // Persist the computed status
    if (checks.length > 0) {
      await persistHealthStatus(moduleCode, overallStatus, checks);
    }

    return {
      moduleCode,
      overallStatus,
      checks,
      lastCheckedAt: checks.length > 0 ? new Date() : (dbRow?.last_checked_at || null),
    };
  } catch (err) {
    logger.error(`[ModuleHealth] Failed to get health for ${moduleCode}: ${(err as Error).message}`);
    return {
      moduleCode,
      overallStatus: 'unhealthy',
      checks: [],
      lastCheckedAt: null,
    };
  }
}

/**
 * Register a health check function for a module.
 * The check function is called when health is evaluated.
 */
export function registerModuleHealthCheck(
  moduleCode: string,
  checkFn: HealthCheckFn,
): void {
  let moduleChecks = healthCheckRegistry.get(moduleCode);
  if (!moduleChecks) {
    moduleChecks = new Map();
    healthCheckRegistry.set(moduleCode, moduleChecks);
  }

  // Generate a unique key for this check based on registration order
  const checkKey = `check_${moduleChecks.size + 1}`;
  moduleChecks.set(checkKey, checkFn);
  logger.info(`[ModuleHealth] Registered health check '${checkKey}' for module ${moduleCode}`);
}

/**
 * Execute all registered health checks for a module.
 * Returns individual check results with latency measurement.
 */
export async function runModuleHealthChecks(moduleCode: string): Promise<HealthCheckResult[]> {
  const moduleChecks = healthCheckRegistry.get(moduleCode);
  if (!moduleChecks || moduleChecks.size === 0) {
    return [];
  }

  const results: HealthCheckResult[] = [];

  for (const [checkKey, checkFn] of moduleChecks) {
    const startTime = Date.now();
    try {
      const result = await checkFn();
      result.latencyMs = Date.now() - startTime;
      result.checkedAt = new Date();
      results.push(result);
    } catch (err) {
      results.push({
        checkName: checkKey,
        status: 'unhealthy',
        message: `Check failed: ${(err as Error).message}`,
        latencyMs: Date.now() - startTime,
        checkedAt: new Date(),
      });
    }
  }

  return results;
}

/**
 * Get aggregated health status for all registered modules.
 */
export async function getAllModuleHealth(): Promise<ModuleHealthStatus[]> {
  try {
    // Start with DB-persisted statuses
    const result = await safeQuery(
      `SELECT module_code, overall_status, last_checked_at,
              COALESCE(check_results, '[]'::jsonb) AS check_results
       FROM module_health_status
       ORDER BY module_code`,
      [],
    );

    const statuses: ModuleHealthStatus[] = result.rows.map((r: any) => ({
      moduleCode: r.module_code,
      overallStatus: r.overall_status || 'healthy',
      checks: parseCheckResults(r.check_results),
      lastCheckedAt: r.last_checked_at || null,
    }));

    // Merge in any in-memory registered modules not yet persisted
    for (const moduleCode of healthCheckRegistry.keys()) {
      const existing = statuses.find(s => s.moduleCode === moduleCode);
      if (!existing) {
        const health = await getModuleHealth(moduleCode);
        statuses.push(health);
      }
    }

    return statuses.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  } catch (err) {
    logger.error(`[ModuleHealth] Failed to get all module health: ${(err as Error).message}`);
    return [];
  }
}

/**
 * List modules with failing or degraded health checks.
 */
export async function getUnhealthyModules(): Promise<ModuleHealthStatus[]> {
  try {
    const result = await safeQuery(
      `SELECT module_code, overall_status, last_checked_at,
              COALESCE(check_results, '[]'::jsonb) AS check_results
       FROM module_health_status
       WHERE overall_status IN ('unhealthy', 'degraded')
       ORDER BY
         CASE overall_status WHEN 'unhealthy' THEN 0 WHEN 'degraded' THEN 1 ELSE 2 END,
         module_code`,
      [],
    );

    return result.rows.map((r: any) => ({
      moduleCode: r.module_code,
      overallStatus: r.overall_status,
      checks: parseCheckResults(r.check_results),
      lastCheckedAt: r.last_checked_at || null,
    }));
  } catch (err) {
    logger.error(`[ModuleHealth] Failed to get unhealthy modules: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Record a health event for a module (status change, failure, recovery, etc.).
 * Persists to the health event log for audit trail (Law 12).
 */
export async function recordHealthEvent(
  moduleCode: string,
  event: HealthEvent,
): Promise<void> {
  try {
    await query(
      `INSERT INTO module_health_events
       (module_code, event_type, previous_status, current_status, message, metadata, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        moduleCode,
        event.eventType,
        event.previousStatus || null,
        event.currentStatus,
        event.message,
        JSON.stringify(event.metadata || {}),
      ],
    );

    // Update the current status in the status table
    await safeQuery(
      `INSERT INTO module_health_status (module_code, overall_status, last_checked_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (module_code) DO UPDATE
       SET overall_status = EXCLUDED.overall_status, last_checked_at = NOW()`,
      [moduleCode, event.currentStatus],
    );

    logger.info(`[ModuleHealth] Recorded ${event.eventType} for ${moduleCode}: ${event.currentStatus}`);
  } catch (err) {
    logger.error(`[ModuleHealth] Failed to record event for ${moduleCode}: ${(err as Error).message}`);
  }
}

/**
 * Get historical health data for a module since a given date.
 */
export async function getModuleHealthHistory(
  moduleCode: string,
  since: Date,
): Promise<HealthHistoryEntry[]> {
  try {
    const result = await query(
      `SELECT module_code, event_type, previous_status, current_status,
              message, COALESCE(metadata, '{}'::jsonb) AS metadata, recorded_at
       FROM module_health_events
       WHERE module_code = $1 AND recorded_at >= $2
       ORDER BY recorded_at DESC`,
      [moduleCode, since],
    );

    return result.rows.map((r: any) => ({
      moduleCode: r.module_code,
      eventType: r.event_type,
      previousStatus: r.previous_status,
      currentStatus: r.current_status,
      message: r.message || '',
      metadata: typeof r.metadata === 'object' ? r.metadata : {},
      recordedAt: r.recorded_at,
    }));
  } catch (err) {
    logger.error(`[ModuleHealth] Failed to get history for ${moduleCode}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Calculate uptime percentage for a module based on health events.
 * Computed as (total_time - unhealthy_time) / total_time over the last 30 days.
 */
export async function getModuleUptime(moduleCode: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    const result = await query(
      `SELECT event_type, current_status, recorded_at
       FROM module_health_events
       WHERE module_code = $1 AND recorded_at >= $2
       ORDER BY recorded_at ASC`,
      [moduleCode, thirtyDaysAgo],
    );

    if (result.rows.length === 0) {
      // No events recorded — assume healthy (100% uptime)
      return 100.0;
    }

    const now = Date.now();
    const periodStart = thirtyDaysAgo.getTime();
    const totalMs = now - periodStart;
    let unhealthyMs = 0;
    let lastUnhealthyAt: number | null = null;

    for (const row of result.rows) {
      const ts = new Date(row.recorded_at).getTime();
      const status = row.current_status;

      if (status === 'unhealthy') {
        if (lastUnhealthyAt === null) {
          lastUnhealthyAt = ts;
        }
      } else {
        // Transitioned away from unhealthy
        if (lastUnhealthyAt !== null) {
          unhealthyMs += ts - lastUnhealthyAt;
          lastUnhealthyAt = null;
        }
      }
    }

    // If still unhealthy, count up to now
    if (lastUnhealthyAt !== null) {
      unhealthyMs += now - lastUnhealthyAt;
    }

    const uptimePercent = totalMs > 0 ? ((totalMs - unhealthyMs) / totalMs) * 100 : 100.0;
    return Math.round(uptimePercent * 100) / 100;
  } catch (err) {
    logger.error(`[ModuleHealth] Failed to compute uptime for ${moduleCode}: ${(err as Error).message}`);
    return 0;
  }
}

// --- Internal helpers ---

/**
 * Derive overall status from individual check results.
 * If any check is unhealthy, overall is unhealthy.
 * If any check is degraded (and none unhealthy), overall is degraded.
 */
function deriveOverallStatus(checks: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
  if (checks.some(c => c.status === 'unhealthy')) return 'unhealthy';
  if (checks.some(c => c.status === 'degraded')) return 'degraded';
  return 'healthy';
}

/**
 * Persist computed health status and check results to DB.
 */
async function persistHealthStatus(
  moduleCode: string,
  overallStatus: string,
  checks: HealthCheckResult[],
): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO module_health_status (module_code, overall_status, check_results, last_checked_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (module_code) DO UPDATE
       SET overall_status = EXCLUDED.overall_status,
           check_results = EXCLUDED.check_results,
           last_checked_at = NOW()`,
      [moduleCode, overallStatus, JSON.stringify(checks)],
    );
  } catch {
    // Non-blocking; health check table may not exist yet
  }
}

/**
 * Parse stored check results from JSONB.
 */
function parseCheckResults(raw: unknown): HealthCheckResult[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((c: any) => ({
      checkName: c.checkName || c.check_name || 'unknown',
      status: c.status || 'healthy',
      message: c.message || '',
      latencyMs: c.latencyMs || c.latency_ms || 0,
      checkedAt: c.checkedAt ? new Date(c.checkedAt) : new Date(),
    }));
  }
  return [];
}

export const moduleHealthService = {
  getModuleHealth,
  registerModuleHealthCheck,
  runModuleHealthChecks,
  getAllModuleHealth,
  getUnhealthyModules,
  recordHealthEvent,
  getModuleHealthHistory,
  getModuleUptime,
};
