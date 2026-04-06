// @ts-nocheck
// ============================================
// Shahin — Production Monitoring Service
// Service health, DB stats, memory, process info,
// uptime tracking, and alerting thresholds
// ============================================

import * as os from 'os';
import { query, safeQuery } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';

// === Types ===

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  node: string;
  pid: number;
  database: DatabaseHealth;
  memory: MemoryStats;
  cpu: CpuStats;
  system: SystemInfo;
  checks: HealthCheck[];
}

interface DatabaseHealth {
  connected: boolean;
  responseMs: number;
  activeConnections: number;
  maxConnections: number;
  databaseSize: string;
  tenantCount: number;
}

interface MemoryStats {
  rssBytes: number;
  rssMB: string;
  heapUsedBytes: number;
  heapUsedMB: string;
  heapTotalBytes: number;
  heapTotalMB: string;
  externalBytes: number;
  heapUsagePercent: number;
}

interface CpuStats {
  loadAvg1m: number;
  loadAvg5m: number;
  loadAvg15m: number;
  cpuCount: number;
}

interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  totalMemoryGB: string;
  freeMemoryGB: string;
  memoryUsagePercent: number;
  uptimeHours: string;
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  value?: string | number;
}

// === Thresholds ===

const THRESHOLDS = {
  heapUsagePercent: { warn: 75, fail: 90 },
  systemMemoryPercent: { warn: 80, fail: 95 },
  dbResponseMs: { warn: 100, fail: 500 },
  loadAvg: { warn: 0.8, fail: 1.5 }, // per CPU
};

// === Health Check ===

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthCheck[] = [];
  const mem = process.memoryUsage();
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  // Database check
  let dbHealth: DatabaseHealth;
  try {
    const start = Date.now();
    const dbResult = await safeQuery('SELECT 1 as ok');
    const responseMs = Date.now() - start;

    const connResult = await safeQuery(
      `SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active'`
    );
    const maxResult = await safeQuery(`SHOW max_connections`);
    const sizeResult = await safeQuery(
      `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
    );
    const tenantResult = await safeQuery(`SELECT count(*) as n FROM tenants`);

    dbHealth = {
      connected: dbResult.rows.length > 0,
      responseMs,
      activeConnections: parseInt(getFirstRow(connResult)?.active || '0'),
      maxConnections: parseInt(getFirstRow(maxResult)?.max_connections || '100'),
      databaseSize: getFirstRow(sizeResult)?.size || 'any',
      tenantCount: parseInt(getFirstRow(tenantResult)?.n || '0'),
    };

    checks.push({
      name: 'database',
      status: responseMs > THRESHOLDS.dbResponseMs.fail ? 'fail' :
              responseMs > THRESHOLDS.dbResponseMs.warn ? 'warn' : 'pass',
      message: `DB response: ${responseMs}ms`,
      value: responseMs,
    });
  } catch (err: unknown) {
    dbHealth = {
      connected: false, responseMs: -1, activeConnections: 0,
      maxConnections: 0, databaseSize: 'unreachable', tenantCount: 0,
    };
    checks.push({ name: 'database', status: 'fail', message: `DB error: ${toErrorMessage(err)}` });
  }

  // Memory check
  checks.push({
    name: 'heap_memory',
    status: heapPercent > THRESHOLDS.heapUsagePercent.fail ? 'fail' :
            heapPercent > THRESHOLDS.heapUsagePercent.warn ? 'warn' : 'pass',
    message: `Heap usage: ${heapPercent}%`,
    value: heapPercent,
  });

  // System memory
  const systemMemPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  checks.push({
    name: 'system_memory',
    status: systemMemPercent > THRESHOLDS.systemMemoryPercent.fail ? 'fail' :
            systemMemPercent > THRESHOLDS.systemMemoryPercent.warn ? 'warn' : 'pass',
    message: `System memory: ${systemMemPercent}%`,
    value: systemMemPercent,
  });

  // CPU load
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  const loadPerCpu = loadAvg[0] / cpuCount;
  checks.push({
    name: 'cpu_load',
    status: loadPerCpu > THRESHOLDS.loadAvg.fail ? 'fail' :
            loadPerCpu > THRESHOLDS.loadAvg.warn ? 'warn' : 'pass',
    message: `Load per CPU: ${loadPerCpu.toFixed(2)} (${loadAvg[0].toFixed(2)} / ${cpuCount} cores)`,
    value: loadPerCpu,
  });

  // Overall status
  const hasFailures = checks.some(c => c.status === 'fail');
  const hasWarnings = checks.some(c => c.status === 'warn');
  const overallStatus = hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    pid: process.pid,
    database: dbHealth,
    memory: {
      rssBytes: mem.rss,
      rssMB: (mem.rss / 1024 / 1024).toFixed(1) + 'MB',
      heapUsedBytes: mem.heapUsed,
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1) + 'MB',
      heapTotalBytes: mem.heapTotal,
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1) + 'MB',
      externalBytes: mem.external,
      heapUsagePercent: heapPercent,
    },
    cpu: {
      loadAvg1m: loadAvg[0],
      loadAvg5m: loadAvg[1],
      loadAvg15m: loadAvg[2],
      cpuCount,
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemoryGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + 'GB',
      freeMemoryGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + 'GB',
      memoryUsagePercent: systemMemPercent,
      uptimeHours: (os.uptime() / 3600).toFixed(1) + 'h',
    },
    checks,
  };
}

// === DB Statistics ===

export async function getDatabaseStats(): Promise<unknown> {
  try {
    const [tableStats, indexStats, sizeStats, connections] = await Promise.all([
      query(`SELECT schemaname, count(*) as table_count
             FROM information_schema.tables
             WHERE table_schema LIKE 'tenant_%' OR table_schema = 'public'
             GROUP BY schemaname ORDER BY schemaname`),
      query(`SELECT count(*) as total_indexes FROM pg_indexes
             WHERE schemaname LIKE 'tenant_%' OR schemaname = 'public'`),
      query(`SELECT pg_size_pretty(pg_database_size(current_database())) as total_size`),
      query(`SELECT state, count(*) as n FROM pg_stat_activity GROUP BY state`),
    ]);

    return {
      schemas: tableStats.rows,
      totalIndexes: parseInt(getFirstRow(indexStats)?.total_indexes || '0'),
      databaseSize: getFirstRow(sizeStats)?.total_size,
      connections: connections.rows,
    };
  } catch (err: unknown) {
    return { error: toErrorMessage(err) };
  }
}

// === Slow Queries ===

export async function getSlowQueries(limit = 20): Promise<any[]> {
  try {
    const result = await safeQuery(
      `SELECT query, calls, mean_exec_time, total_exec_time, rows
       FROM pg_stat_statements
       ORDER BY mean_exec_time DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch {
    // pg_stat_statements extension might not be enabled
    return [];
  }
}
