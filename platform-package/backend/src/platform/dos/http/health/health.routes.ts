// @ts-nocheck
// ============================================
// Platform — Health, Readiness & Metrics Endpoints
// GET /health — basic health check
// GET /ready  — DB readiness probe
// GET /metrics — in-memory request metrics
// ============================================

import { Router, Request, Response } from 'express';
import { safeQuery } from '../../../../config/database/database';
import { isRedisHealthy } from '../../../../config/database/redis';
import { cacheStats } from '../../../../modules/platform/services/misc/cache.service';
import { getErrorSummary, getRecentErrors } from '../../observability/services/error-tracker.service';
import { getMetricsText, getContentType } from '../../../../modules/platform/services/misc/prometheus.service';
import { getMemoryTrend } from '../../observability/services/memory-monitor.service';
let checkComplianceHealth: any = async () => ({ status: 'unavailable' });
try { ({ checkComplianceHealth } = require('../../../../modules/compliance/services/compliance/compliance-workspace.service')); } catch {}
import { toErrorMessage } from '../../../../errors/http-error.util';
import { getFirstRow } from '../../../../shared/data/db-utils';
let getAllBreakerStatus: any = () => ({});
try { ({ getAllBreakerStatus } = require('../../../../modules/ai/services/governance/circuit/ai-circuit-breaker.service')); } catch {}
import { swallowNull, EC } from '../../resilience/resilient-catch';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { asyncHandler } from '../error-handling/async-handler';

// ─── MetricsStore ───────────────────────────────────

export class MetricsStore {
  private _requestCount = 0;
  private _totalResponseTimeMs = 0;
  private _activeConnections = 0;

  recordRequest(responseTimeMs: number): void {
    this._requestCount++;
    this._totalResponseTimeMs += responseTimeMs;
  }

  incrementConnections(): void {
    this._activeConnections++;
  }

  decrementConnections(): void {
    if (this._activeConnections > 0) this._activeConnections--;
  }

  get requestCount(): number {
    return this._requestCount;
  }

  get avgResponseTimeMs(): number {
    if (this._requestCount === 0) return 0;
    return Math.round((this._totalResponseTimeMs / this._requestCount) * 100) / 100;
  }

  get activeConnections(): number {
    return this._activeConnections;
  }

  snapshot() {
    return {
      requestCount: this.requestCount,
      avgResponseTimeMs: this.avgResponseTimeMs,
      activeConnections: this.activeConnections,
      memoryUsage: process.memoryUsage(),
    };
  }

  reset(): void {
    this._requestCount = 0;
    this._totalResponseTimeMs = 0;
    this._activeConnections = 0;
  }
}

export const metricsStore = new MetricsStore();

// ─── Health response builder (pure, testable) ───────

export function buildHealthResponse() {
  const isProduction = process.env.NODE_ENV === 'production';
  const base: Record<string, unknown> = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  };
  // Only expose operational details in non-production
  if (!isProduction) {
    const mem = process.memoryUsage();
    base.version = '1.0.0';
    base.uptime = Math.round(process.uptime());
    base.instance = process.env.pm_id || process.pid;
    base.memory = {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    };
    base.requests = metricsStore.requestCount;
    base.avgResponseMs = metricsStore.avgResponseTimeMs;
  }
  return base;
}

// ─── Routes ─────────────────────────────────────────

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check — returns status, uptime, memory usage
 *     tags: [Foundation]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'ok' }
 *                 version: { type: string }
 *                 uptime: { type: integer, description: 'Uptime in seconds' }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json(buildHealthResponse());
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe — checks DB, Redis, Temporal connectivity
 *     tags: [Foundation]
 *     security: []
 *     responses:
 *       200:
 *         description: All subsystems ready
 *       503:
 *         description: One or more subsystems unavailable
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await safeQuery('SELECT 1');
    const redis = await isRedisHealthy();

    // Temporal connectivity check
    let temporal: string = 'disabled';
    if (process.env.TEMPORAL_ENABLED === 'true') {
      try {
        const { getTemporalClient } = require('../temporal/client');
        await getTemporalClient();
        temporal = 'connected';
      } catch {
        temporal = 'unreachable';
      }
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redis.connected ? `connected (${redis.latencyMs}ms)` : 'unavailable (using memory fallback)',
      temporal,
      langgraph: process.env.LANGGRAPH_AGENTS_ENABLED === 'true' ? 'enabled' : 'disabled',
      otel: process.env.OTEL_ENABLED === 'true' ? 'enabled' : 'disabled',
    });
  } catch {
    res.status(503).json({ status: 'unavailable', error: 'Database connection failed' });
  }
});

/**
 * @swagger
 * /health/agents:
 *   get:
 *     summary: AI agent health summary across all active tenants
 *     tags: [Foundation]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         schema: { type: string }
 *         description: Setup token for authorization
 *     responses:
 *       200:
 *         description: Agent run health per tenant
 *       403:
 *         description: Unauthorized — invalid setup token
 */
router.get('/health/agents', asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers['x-setup-token'] as string | undefined;
  const expected = process.env.SETUP_TOKEN;
  if (expected && token !== expected) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const tenantsResult = await safeQuery(
      "SELECT tenant_id FROM tenants WHERE status = 'active'"
    );

    const agentHealth: Array<{
      tenantId: string;
      recentRuns: number;
      lastRunAt: string | null;
      errors: number;
    }> = [];

    for (const t of tenantsResult.rows) {
      const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
      try {
        const runs = await safeQuery(
          `SELECT agent_id, status, started_at, completed_at, error_message
           FROM "${schema}".agent_runs
           WHERE started_at > NOW() - INTERVAL '2 hours'
           ORDER BY started_at DESC`
        );
        const lastRun = getFirstRow(runs);
        agentHealth.push({
          tenantId: t.tenant_id,
          recentRuns: runs.rows.length,
          lastRunAt: lastRun?.started_at || null,
          errors: runs.rows.filter((r: unknown) => r.status === 'failed').length,
        });
      } catch {
        // Tenant schema may not have agent_runs table yet
        agentHealth.push({
          tenantId: t.tenant_id,
          recentRuns: 0,
          lastRunAt: null,
          errors: 0,
        });
      }
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      temporalEnabled: process.env.TEMPORAL_ENABLED === 'true',
      langgraphEnabled: process.env.LANGGRAPH_AGENTS_ENABLED === 'true',
      activeTenants: tenantsResult.rows.length,
      tenants: agentHealth,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: 'Failed to query agent health', detail: (e as Error).message });
  }
}));

router.get('/health/cache', asyncHandler(async (_req: Request, res: Response) => {
  const redis = await isRedisHealthy();
  const stats = await cacheStats();
  res.json({ redis, cache: stats, timestamp: new Date().toISOString() });
}));

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe — confirms process is running
 *     tags: [Foundation]
 *     security: []
 *     responses:
 *       200:
 *         description: Process alive
 */
router.get('/health/live', (_req: Request, res: Response) => {
  const lagStart = Date.now();
  setImmediate(() => {
    const lag = Date.now() - lagStart;
    const healthy = lag < 500;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'alive' : 'degraded',
      eventLoopLagMs: lag,
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      instance: process.env.pm_id || process.pid,
    });
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await safeQuery('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable', error: 'Database connection failed' });
  }
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: In-memory request metrics snapshot
 *     tags: [Foundation]
 *     security: []
 *     responses:
 *       200:
 *         description: Request count, avg response time, active connections, memory usage
 */
router.get('/metrics', asyncHandler(async (_req: Request, res: Response) => {
  // In production, require bearer token or setup token
  if (process.env.NODE_ENV === 'production') {
    const bearer = _req.headers.authorization?.replace('Bearer ', '');
    const setupHeader = _req.headers['x-setup-token'] as string | undefined;
    const expected = process.env.METRICS_AUTH_TOKEN || process.env.SETUP_TOKEN;
    if (expected && bearer !== expected && setupHeader !== expected) {
      res.status(403).json({ error: 'Unauthorized — provide Bearer token or x-setup-token header' });
      return;
    }
  }
  // Return Prometheus text format if Accept header requests it, otherwise JSON
  const accept = _req.headers.accept || '';
  if (accept.includes('text/plain') || accept.includes('application/openmetrics-text')) {
    const text = await getMetricsText();
    res.setHeader('Content-Type', getContentType());
    res.send(text);
  } else {
    res.json(metricsStore.snapshot());
  }
}));

/**
 * @swagger
 * /metrics/prometheus:
 *   get:
 *     summary: Prometheus-format metrics endpoint
 *     tags: [Foundation]
 *     security: []
 *     responses:
 *       200:
 *         description: Prometheus text-format metrics
 *         content:
 *           text/plain: {}
 */
router.get('/metrics/prometheus', asyncHandler(async (_req: Request, res: Response) => {
  // In production, require bearer token or setup token
  if (process.env.NODE_ENV === 'production') {
    const bearer = _req.headers.authorization?.replace('Bearer ', '');
    const setupHeader = _req.headers['x-setup-token'] as string | undefined;
    const expected = process.env.METRICS_AUTH_TOKEN || process.env.SETUP_TOKEN;
    if (expected && bearer !== expected && setupHeader !== expected) {
      res.status(403).json({ error: 'Unauthorized — provide Bearer token or x-setup-token header' });
      return;
    }
  }
  const text = await getMetricsText();
  res.setHeader('Content-Type', getContentType());
  res.send(text);
}));

router.get('/health/memory-trend', (_req: Request, res: Response) => {
  res.json(getMemoryTrend());
});

router.get('/health/compliance', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string);
  if (!tenantId) {
    res.status(200).json({ ok: true, message: 'No tenant specified — compliance check skipped' });
    return;
  }
  const result = await checkComplianceHealth(tenantId);
  if (result.ok) {
    res.status(200).json({ ok: true, tenantId });
    return;
  }
  res.status(503).json({ ok: false, tenantId, reason: result.reason });
}));

router.get('/errors/summary', (req: Request, res: Response) => {
  const token = req.headers['x-setup-token'] as string | undefined;
  const expected = process.env.SETUP_TOKEN;
  if (expected && token !== expected) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }
  res.json(getErrorSummary());
});

router.get('/errors/recent', (req: Request, res: Response) => {
  const token = req.headers['x-setup-token'] as string | undefined;
  const expected = process.env.SETUP_TOKEN;
  if (expected && token !== expected) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json(getRecentErrors(limit));
});

interface PreflightCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail?: string;
}

router.get('/preflight', asyncHandler(async (req: Request, res: Response) => {
  const setupToken = req.headers['x-setup-token'] as string | undefined;
  const expectedToken = process.env.SETUP_TOKEN;
  if (expectedToken && setupToken !== expectedToken) {
    res.status(403).json({ error: 'Unauthorized — provide SETUP_TOKEN' });
    return;
  }

  const checks: PreflightCheck[] = [];

  try {
    await safeQuery('SELECT 1');
    checks.push({ name: 'database_connection', status: 'pass' });
  } catch (e: unknown) {
    checks.push({ name: 'database_connection', status: 'fail', detail: toErrorMessage(e) });
  }

  try {
    const r = await safeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users','tenants','regulators','instruments')");
    const count = parseInt(getFirstRow(r)?.count, 10);
    checks.push({ name: 'core_tables', status: count >= 4 ? 'pass' : 'fail', detail: `${count}/4 tables found` });
  } catch (e: unknown) {
    checks.push({ name: 'core_tables', status: 'fail', detail: toErrorMessage(e) });
  }

  const jwtVal = process.env.DAUTH_JWT_SECRET || process.env.JWT_SECRET;
  const jwtSet = !!jwtVal && jwtVal !== 'dev-secret';
  checks.push({ name: 'jwt_secret', status: jwtSet ? 'pass' : (process.env.NODE_ENV === 'production' ? 'fail' : 'warn'), detail: jwtSet ? 'Configured' : 'Using dev default' });

  const dbPass = process.env.DB_PASSWORD || process.env.PG_PASSWORD;
  checks.push({ name: 'db_password', status: !!dbPass ? 'pass' : 'warn', detail: dbPass ? 'Set' : 'Using default' });

  checks.push({ name: 'claude_api_key', status: !!process.env.CLAUDE_API_KEY ? 'pass' : 'warn', detail: process.env.CLAUDE_API_KEY ? 'Set' : 'AI features disabled' });

  checks.push({ name: 'node_env', status: process.env.NODE_ENV === 'production' ? 'pass' : 'warn', detail: process.env.NODE_ENV || 'not set' });

  // Redis cache check
  try {
    const redisHealth = await isRedisHealthy();
    checks.push({ name: 'redis_cache', status: redisHealth.connected ? 'pass' : 'warn', detail: redisHealth.connected ? `Connected (${redisHealth.latencyMs}ms)` : 'Unavailable — using in-memory fallback' });
  } catch {
    checks.push({ name: 'redis_cache', status: 'warn', detail: 'Could not check Redis' });
  }

  checks.push({ name: 'smtp_config', status: !!process.env.SMTP_HOST ? 'pass' : 'warn', detail: process.env.SMTP_HOST ? 'Configured' : 'Email disabled' });

  checks.push({ name: 'cors_origins', status: !!process.env.CORS_ORIGINS ? 'pass' : 'warn', detail: process.env.CORS_ORIGINS || 'Using default (permissive in dev)' });

  try {
    const r = await safeQuery("SELECT COUNT(*) FROM regulators");
    const count = parseInt(getFirstRow(r)?.count, 10);
    checks.push({ name: 'registry_data', status: count > 0 ? 'pass' : 'warn', detail: `${count} regulators` });
  } catch {
    checks.push({ name: 'registry_data', status: 'warn', detail: 'Could not query regulators' });
  }

  try {
    const r = await safeQuery("SELECT COUNT(*) FROM tenants WHERE status = 'active'");
    const count = parseInt(getFirstRow(r)?.count, 10);
    checks.push({ name: 'active_tenants', status: count > 0 ? 'pass' : 'warn', detail: `${count} active tenants` });
  } catch {
    checks.push({ name: 'active_tenants', status: 'warn', detail: 'Could not query tenants' });
  }

  try {
    const r = await safeQuery("SELECT COUNT(*) FROM public.product_modules");
    const count = parseInt(getFirstRow(r)?.count, 10);
    checks.push({
      name: 'product_modules',
      status: count > 0 ? 'pass' : 'fail',
      detail: count > 0 ? `${count} product_modules rows` : 'product_modules is empty — module mounting will fail',
    });
  } catch {
    checks.push({ name: 'product_modules', status: 'fail', detail: 'Could not query public.product_modules' });
  }

  const migrationFiles = [
    '001_add_deleted_at_columns',
    '002_enhanced_platform_tables',
    '003_entity_links',
    '004_activity_feed_enhancements',
    '005_notification_preferences',
    '006_search_command_tables',
    '007_ai_sessions',
    '008_autonomous_workflow_tables',
  ];
  checks.push({ name: 'migration_files', status: 'pass', detail: `${migrationFiles.length} tenant migrations defined` });

  checks.push({ name: 'uptime', status: 'pass', detail: `${Math.round(process.uptime())}s` });
  checks.push({ name: 'memory_mb', status: 'pass', detail: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB heap` });

  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');
  const overall = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

  res.status(hasFail ? 503 : 200).json({
    status: overall,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks,
    summary: {
      total: checks.length,
      pass: checks.filter(c => c.status === 'pass').length,
      warn: checks.filter(c => c.status === 'warn').length,
      fail: checks.filter(c => c.status === 'fail').length,
    },
  });
}));

router.get('/health/deep', asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers['x-setup-token'] as string | undefined;
  const expected = process.env.SETUP_TOKEN;
  if (expected && token !== expected) {
    res.status(403).json({ error: 'Unauthorized — provide SETUP_TOKEN' });
    return;
  }

  const checks: PreflightCheck[] = [];

  try {
    const start = Date.now();
    await safeQuery('SELECT 1');
    checks.push({ name: 'database', status: 'pass', detail: `${Date.now() - start}ms` });
  } catch (e: unknown) {
    checks.push({ name: 'database', status: 'fail', detail: toErrorMessage(e) });
  }

  try {
    const redis = await isRedisHealthy();
    checks.push({ name: 'redis', status: redis.connected ? 'pass' : 'warn', detail: redis.connected ? `${redis.latencyMs}ms` : 'unavailable' });
  } catch {
    checks.push({ name: 'redis', status: 'warn', detail: 'unreachable' });
  }

  let _temporal: string = 'disabled';
  if (process.env.TEMPORAL_ENABLED === 'true') {
    try {
      const { getTemporalClient } = require('../temporal/client');
      await getTemporalClient();
      temporal = 'connected';
      checks.push({ name: 'temporal', status: 'pass', detail: 'connected' });
    } catch {
      temporal = 'unreachable';
      checks.push({ name: 'temporal', status: 'fail', detail: 'unreachable' });
    }
  } else {
    checks.push({ name: 'temporal', status: 'warn', detail: 'disabled' });
  }

  try {
    const r = await safeQuery("SELECT COUNT(*)::int as cnt FROM tenants WHERE status = 'active'");
    const cnt = getFirstRow(r)?.cnt || 0;
    checks.push({ name: 'active_tenants', status: cnt > 0 ? 'pass' : 'warn', detail: `${cnt}` });
  } catch {
    checks.push({ name: 'active_tenants', status: 'warn', detail: 'query failed' });
  }

  try {
    const r = await safeQuery("SELECT COUNT(*)::int as cnt FROM public.product_modules");
    const cnt = getFirstRow(r)?.cnt || 0;
    checks.push({ name: 'product_modules', status: cnt > 0 ? 'pass' : 'fail', detail: `${cnt} rows` });
  } catch {
    checks.push({ name: 'product_modules', status: 'fail', detail: 'query failed' });
  }

  const lag = await new Promise<number>((resolve) => {
    const start = Date.now();
    setImmediate(() => resolve(Date.now() - start));
  });
  checks.push({ name: 'event_loop_lag', status: lag < 100 ? 'pass' : lag < 500 ? 'warn' : 'fail', detail: `${lag}ms` });

  const mem = process.memoryUsage();
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  checks.push({ name: 'memory', status: heapPct < 85 ? 'pass' : heapPct < 95 ? 'warn' : 'fail', detail: `${heapPct}% heap (${Math.round(mem.heapUsed / 1024 / 1024)}MB)` });

  const breakerStatus = await swallowNull(EC.DEPENDENCY, () => getAllBreakerStatus());
  if (breakerStatus) {
    const openBreakers = Object.entries(breakerStatus).filter(([, v]: [string, any]) => v?.state === 'open');
    checks.push({ name: 'circuit_breakers', status: openBreakers.length === 0 ? 'pass' : 'warn', detail: openBreakers.length > 0 ? `${openBreakers.length} open` : 'all closed' });
  }

  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');
  res.status(hasFail ? 503 : 200).json({
    status: hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    pid: process.pid,
    instance: process.env.pm_id || process.pid,
    checks,
    summary: {
      total: checks.length,
      pass: checks.filter(c => c.status === 'pass').length,
      warn: checks.filter(c => c.status === 'warn').length,
      fail: checks.filter(c => c.status === 'fail').length,
    },
  });
}));

router.get('/health/ai-os-diagnostics', asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers['x-setup-token'] as string | undefined;
  const expected = process.env.SETUP_TOKEN;
  if (expected && token !== expected) {
    res.status(403).json({ error: 'Unauthorized — provide SETUP_TOKEN' });
    return;
  }

  const diag: Record<string, any> = {
    timestamp: new Date().toISOString(),
    temporalEnabled: process.env.TEMPORAL_ENABLED === 'true',
    langgraphEnabled: process.env.LANGGRAPH_AGENTS_ENABLED === 'true',
    aiProvider: process.env.AI_PROVIDER || 'auto',
  };

  try {
    if (process.env.TEMPORAL_ENABLED === 'true') {
      const { getTemporalClient } = require('../temporal/client');
      const client = await getTemporalClient();
      const scheduleClient = client.schedule;
      let scheduleCount = 0;
      if (scheduleClient) {
        try {
          for await (const _s of scheduleClient.list()) {
            scheduleCount++;
          }
        } catch { /* list may not be available */ }
      }
      diag.temporal = { status: 'connected', activeSchedules: scheduleCount };
    } else {
      diag.temporal = { status: 'disabled' };
    }
  } catch (e: unknown) {
    diag.temporal = { status: 'unreachable', error: toErrorMessage(e) };
  }

  try {
    const _workerResult = await safeQuery(
      "SELECT name, pm_id, status FROM information_schema.columns LIMIT 0"
    ).catch(() => null);
    const pm2Env = process.env.pm_id;
    diag.workers = {
      currentInstance: pm2Env || process.pid,
      temporalWorkers: process.env.TEMPORAL_ENABLED === 'true' ? 'started' : 'disabled',
    };
  } catch {
    diag.workers = { status: 'unknown' };
  }

  try {
    const tenantResult = await safeQuery(
      "SELECT COUNT(*) as count FROM tenants WHERE status = 'active'"
    );
    diag.activeTenants = parseInt(getFirstRow(tenantResult)?.count || '0', 10);
  } catch (e: unknown) {
    diag.activeTenants = { error: toErrorMessage(e) };
  }

  try {
    const agentResult = await safeQuery(
      "SELECT COUNT(*) as count FROM agent_registry"
    );
    diag.registeredAgents = parseInt(getFirstRow(agentResult)?.count || '0', 10);
  } catch {
    try {
      const { getAgentCatalog } = require('../platform/agent-catalog-registry');
      diag.registeredAgents = getAgentCatalog().length;
    } catch {
      diag.registeredAgents = 'unknown';
    }
  }

  try {
    const lastExec = await safeQuery(
      "SELECT job_name, started_at, status FROM job_executions ORDER BY started_at DESC LIMIT 1"
    );
    if (getFirstRow(lastExec)) {
      diag.schedulerLastExecution = {
        jobName: getFirstRow(lastExec)?.job_name,
        startedAt: getFirstRow(lastExec)?.started_at,
        status: getFirstRow(lastExec)?.status,
      };
    } else {
      diag.schedulerLastExecution = null;
    }
  } catch {
    diag.schedulerLastExecution = 'no job_executions table';
  }

  const redisHealth = await isRedisHealthy();
  diag.dependencies = {
    database: 'connected',
    redis: redisHealth.connected ? 'connected' : 'unavailable',
    ollama: process.env.OLLAMA_HOST || '127.0.0.1:11434',
  };

  try {
    const masterMig = await safeQuery(
      "SELECT MAX(version) as ceiling FROM public.schema_migrations"
    ).catch(() => null);
    const sampleTenant = await safeQuery(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' LIMIT 1"
    ).catch(() => null);
    let tenantCeiling: number | string = 'unknown';
    if (sampleTenant && (getFirstRow(sampleTenant as any) as any)?.schema_name) {
      const tSchema = (getFirstRow(sampleTenant as any) as any)?.schema_name;
      const tMig = await safeQuery(
        `SELECT MAX(version) as ceiling FROM "${tSchema}".schema_migrations`
      ).catch(() => null);
      tenantCeiling = tMig ? ((getFirstRow(tMig as any) as any)?.ceiling ?? 'unknown') : 'unknown';
    }
    diag.migrationCeiling = {
      master: masterMig ? ((getFirstRow(masterMig as any) as any)?.ceiling ?? 'unknown') : 'unknown',
      tenant: tenantCeiling,
    };
  } catch {
    diag.migrationCeiling = 'unknown';
  }

  try {
    const providers: Record<string, string> = {};
    providers.claude = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY ? 'key_present' : 'no_key';
    providers.azureOpenAI = (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) ? 'key_present' : 'no_key';
    providers.ollama = process.env.OLLAMA_HOST || '127.0.0.1:11434';
    const freeProviders = ['GROQ_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'TOGETHER_API_KEY', 'CEREBRAS_API_KEY', 'MISTRAL_API_KEY', 'DEEPSEEK_API_KEY', 'SAMBANOVA_API_KEY'];
    const freeConfigured = freeProviders.filter(k => !!process.env[k]).length;
    providers.freeProviders = `${freeConfigured}/8 configured`;
    providers.fallbackChain = 'Claude → Azure → Free → Ollama';
    providers.emailOAuth2 = process.env.EMAIL_AUTH_TYPE === 'oauth2' ? 'configured' : 'smtp_fallback';
    diag.providerReadiness = providers;
  } catch { /* non-fatal */ }

  try {
    const { getGatewayHealth } = require('../services/ai-gateway.service');
    diag.gatewayHealth = getGatewayHealth();
  } catch { /* non-fatal */ }

  try {
    const { getAllExternalServices, healthCheck } = require('../../../config/app/external-services');
    const extSvcs = getAllExternalServices();
    const extHealth: Record<string, any> = {};
    for (const [key, svc] of Object.entries(extSvcs) as [string, any][]) {
      if (svc.enabled) {
        const ok = await healthCheck(key).catch(() => false);
        extHealth[key] = { enabled: true, url: svc.url, healthy: ok };
      } else {
        extHealth[key] = { enabled: false };
      }
    }
    diag.externalServices = extHealth;
  } catch { /* non-fatal */ }

  try {
    const { getMcpServerInfo } = require('../../../mcp/server');
    diag.mcpServer = getMcpServerInfo();
  } catch { /* non-fatal */ }

  try {
    const { getActiveSubscriptionCount } = require('../../../openclaw/ag-ui/ag-ui-streaming');
    diag.agUiSubscriptions = getActiveSubscriptionCount();
  } catch { /* non-fatal */ }

  try {
    const { checkTikaHealth } = require('../../../connectors/tika.connector');
    diag.tika = { healthy: await checkTikaHealth().catch(() => false) };
  } catch { diag.tika = { healthy: false }; }

  try {
    const { checkUnstructuredHealth } = require('../../../connectors/unstructured.connector');
    diag.unstructured = { healthy: await checkUnstructuredHealth().catch(() => false) };
  } catch { diag.unstructured = { healthy: false }; }

  diag.uptime = Math.round(process.uptime());
  diag.pid = process.pid;
  diag.instance = process.env.pm_id || process.pid;

  res.json(diag);
}));

// ── R1.1: Workflow Health + DLQ Visibility ───────────────────────────────────

router.get('/health/workflow', authenticate, requirePermission('admin.system.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) { res.status(400).json({ error: 'Tenant context required' }); return; }
  const { tenantSchema: ts } = await import('../../../../config/database/database');
  const schema = ts(tenantId);

  const checks: PreflightCheck[] = [];

  // 1. MWR row count
  try {
    const mwr = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".module_workflow_registry`);
    const cnt = getFirstRow(mwr)?.cnt || 0;
    checks.push({ name: 'mwr_row_count', status: cnt >= 25 ? 'pass' : cnt >= 13 ? 'warn' : 'fail', detail: `${cnt} rows (expected 25)` });
  } catch { checks.push({ name: 'mwr_row_count', status: 'fail', detail: 'Table not found' }); }

  // 2. Template resolution
  try {
    const { validateModuleWorkflowMap } = await import('../../../config/module-workflow-map.validator');
    const result = validateModuleWorkflowMap();
    const errs = result.issues.filter(i => i.level === 'error').length;
    checks.push({ name: 'template_resolution', status: errs === 0 ? 'pass' : 'fail', detail: `${errs} errors, ${result.issues.length} total issues` });
  } catch (e: unknown) { checks.push({ name: 'template_resolution', status: 'fail', detail: String(e) }); }

  // 3. Stalled workflow instances
  try {
    const stalled = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_executions
       WHERE status = 'running' AND started_at < NOW() - INTERVAL '24 hours'`
    );
    const cnt = getFirstRow(stalled)?.cnt || 0;
    checks.push({ name: 'stalled_executions', status: cnt === 0 ? 'pass' : 'warn', detail: `${cnt} running > 24h` });
  } catch { checks.push({ name: 'stalled_executions', status: 'warn', detail: 'Could not check' }); }

  // 4. SLA breaches
  try {
    const breached = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".process_tasks
       WHERE breached_at IS NOT NULL AND status NOT IN ('completed', 'cancelled', 'auto_closed')`
    );
    const cnt = getFirstRow(breached)?.cnt || 0;
    checks.push({ name: 'active_sla_breaches', status: cnt === 0 ? 'pass' : cnt <= 5 ? 'warn' : 'fail', detail: `${cnt} active breaches` });
  } catch { checks.push({ name: 'active_sla_breaches', status: 'warn', detail: 'Could not check' }); }

  // 5. Failed chain instances
  try {
    const failed = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_chain_instances WHERE status = 'failed'`
    );
    const cnt = getFirstRow(failed)?.cnt || 0;
    checks.push({ name: 'failed_chains', status: cnt === 0 ? 'pass' : 'warn', detail: `${cnt} failed chains` });
  } catch { checks.push({ name: 'failed_chains', status: 'warn', detail: 'Could not check' }); }

  // 6. Orphan process_tasks
  try {
    const orphans = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".process_tasks
       WHERE module_code IS NULL AND status NOT IN ('completed', 'cancelled', 'auto_closed')`
    );
    const cnt = getFirstRow(orphans)?.cnt || 0;
    checks.push({ name: 'tasks_without_module', status: cnt === 0 ? 'pass' : 'warn', detail: `${cnt} tasks with NULL module_code` });
  } catch { checks.push({ name: 'tasks_without_module', status: 'warn', detail: 'Column may not exist yet' }); }

  // 7. Cron last run check (stall recovery)
  try {
    const lastRun = await safeQuery(
      `SELECT MAX(created_at) AS last_run FROM "${schema}".agrc_event_log
       WHERE event_type = 'workflow.stall_recovery' AND created_at > NOW() - INTERVAL '15 minutes'`
    );
    const hasRun = !!getFirstRow(lastRun)?.last_run;
    checks.push({ name: 'stall_recovery_cron', status: hasRun ? 'pass' : 'warn', detail: hasRun ? 'Ran within 15 min' : 'No recent execution' });
  } catch { checks.push({ name: 'stall_recovery_cron', status: 'warn', detail: 'Could not check event log' }); }

  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');
  res.status(hasFail ? 503 : 200).json({
    status: hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy',
    tenantId,
    timestamp: new Date().toISOString(),
    checks,
    summary: { total: checks.length, pass: checks.filter(c => c.status === 'pass').length, warn: checks.filter(c => c.status === 'warn').length, fail: checks.filter(c => c.status === 'fail').length },
  });
}));

// Dead-letter queue: failed chain steps + stuck executions (DLQ visibility)
router.get('/health/workflow/dlq', authenticate, requirePermission('admin.system.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  if (!tenantId) { res.status(400).json({ error: 'Tenant context required' }); return; }
  const { tenantSchema: ts } = await import('../../../../config/database/database');
  const schema = ts(tenantId);

  // Failed chain steps
  const failedSteps = await safeQuery(
    `SELECT wcsl.log_id, wcsl.instance_id, wcsl.step_no, wcsl.module_code, wcsl.task_type,
            wcsl.notes, wcsl.completed_at,
            wci.chain_code, wci.trigger_entity_type, wci.trigger_entity_id
     FROM "${schema}".workflow_chain_step_log wcsl
     JOIN "${schema}".workflow_chain_instances wci ON wci.instance_id = wcsl.instance_id
     WHERE wcsl.status = 'failed'
     ORDER BY wcsl.completed_at DESC NULLS LAST
     LIMIT 50`
  ).catch(() => ({ rows: [] }));

  // Stuck workflow executions (running > 48h)
  const stuckExecs = await safeQuery(
    `SELECT execution_id, workflow_id, status, started_at, entity_type, entity_id
     FROM "${schema}".workflow_executions
     WHERE status = 'running' AND started_at < NOW() - INTERVAL '48 hours'
     ORDER BY started_at ASC
     LIMIT 50`
  ).catch(() => ({ rows: [] }));

  // Failed chain instances
  const failedChains = await safeQuery(
    `SELECT instance_id, chain_code, status, trigger_entity_type, trigger_entity_id, started_at
     FROM "${schema}".workflow_chain_instances
     WHERE status = 'failed'
     ORDER BY started_at DESC
     LIMIT 50`
  ).catch(() => ({ rows: [] }));

  res.json({
    tenantId,
    timestamp: new Date().toISOString(),
    failedChainSteps: { count: failedSteps.rows.length, items: failedSteps.rows },
    stuckExecutions: { count: stuckExecs.rows.length, items: stuckExecs.rows },
    failedChainInstances: { count: failedChains.rows.length, items: failedChains.rows },
    totalDlqItems: failedSteps.rows.length + stuckExecs.rows.length + failedChains.rows.length,
  });
}));

export default router;
