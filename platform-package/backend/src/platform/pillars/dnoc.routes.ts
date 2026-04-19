import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../dauth';
import { toErrorMessage } from '../../errors/http-error.util';
import { pool } from '../../config/db/pool';

const router = Router();

const PROM_URL = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090';
const AM_URL = process.env.ALERTMANAGER_URL || 'http://127.0.0.1:9093';

async function promQuery<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${PROM_URL}${path}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function amGet<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${AM_URL}${path}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

router.get(
  '/health',
  authenticate,
  requirePermission('platform.observability.read'),
  async (_req: Request, res: Response) => {
    try {
      const up = await promQuery<{ data: { result: Array<{ metric: Record<string, string>; value: [number, string] }> } }>(
        '/api/v1/query?query=up',
      );
      const services = (up?.data?.result ?? []).map((r) => ({
        name: r.metric.job || r.metric.instance || 'unknown',
        instance: r.metric.instance,
        status: r.value?.[1] === '1' ? 'up' : 'down',
      }));
      let dbOk = false;
      let dbLatency = 0;
      try {
        const t0 = Date.now();
        await pool.query('select 1');
        dbLatency = Date.now() - t0;
        dbOk = true;
      } catch {
        dbOk = false;
      }
      res.json({
        ts: new Date().toISOString(),
        prometheus: up !== null,
        alertmanager: (await amGet('/api/v2/status')) !== null,
        database: { up: dbOk, latencyMs: dbLatency },
        services,
      });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/slo',
  authenticate,
  requirePermission('platform.observability.read'),
  async (_req: Request, res: Response) => {
    const burn1h = await promQuery('/api/v1/query?query=slo:error_budget_burn:1h');
    const burn6h = await promQuery('/api/v1/query?query=slo:error_budget_burn:6h');
    const latencyP99 = await promQuery('/api/v1/query?query=histogram_quantile(0.99,sum by (le) (rate(http_request_duration_seconds_bucket[5m])))');
    res.json({ burn1h, burn6h, latencyP99, ts: new Date().toISOString() });
  },
);

router.get(
  '/alerts',
  authenticate,
  requirePermission('platform.observability.read'),
  async (_req: Request, res: Response) => {
    const alerts = await amGet<Array<Record<string, unknown>>>('/api/v2/alerts');
    res.json({ alerts: alerts ?? [], source: alerts ? 'alertmanager' : 'unavailable' });
  },
);

router.post(
  '/alerts/webhook',
  async (req: Request, res: Response) => {
    try {
      const body = req.body as { alerts?: Array<Record<string, unknown>> };
      const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
      for (const a of alerts) {
        const labels = (a.labels ?? {}) as Record<string, string>;
        const annotations = (a.annotations ?? {}) as Record<string, string>;
        await pool.query(
          `insert into platform.security_alerts
             (tenant_id, severity, source, category, title, detail, event_id, status)
           values
             (platform.system_tenant_id(),
              coalesce($1,'info'), 'dnoc', coalesce($2,'infra'),
              coalesce($3,'Infra alert'), $4::jsonb, $5, 'open')`,
          [
            labels.severity ?? 'info',
            labels.alertname ?? 'infra',
            annotations.summary ?? labels.alertname ?? 'DNOC alert',
            JSON.stringify({ labels, annotations, status: a.status }),
            (a.fingerprint as string | undefined) ?? null,
          ],
        );
      }
      res.json({ received: alerts.length });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.post(
  '/alerts/pager',
  async (req: Request, res: Response) => {
    try {
      const body = req.body as { alerts?: Array<Record<string, unknown>> };
      const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
      for (const a of alerts) {
        const labels = (a.labels ?? {}) as Record<string, string>;
        const annotations = (a.annotations ?? {}) as Record<string, string>;
        await pool.query(
          `insert into platform.security_alerts
             (tenant_id, severity, source, category, title, detail, event_id, status)
           values
             (platform.system_tenant_id(),
              coalesce($1,'critical'), 'dnoc-pager', coalesce($2,'infra'),
              coalesce($3,'Infra page'), $4::jsonb, $5, 'open')`,
          [
            labels.severity ?? 'critical',
            labels.alertname ?? 'infra',
            annotations.summary ?? labels.alertname ?? 'DNOC page',
            JSON.stringify({ labels, annotations, status: a.status, pager: true }),
            (a.fingerprint as string | undefined) ?? null,
          ],
        );
      }
      res.json({ paged: alerts.length });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/runbooks',
  authenticate,
  requirePermission('platform.observability.read'),
  async (_req: Request, res: Response) => {
    res.json({
      runbooks: [
        { name: 'component-down', path: 'ops/runbooks/component-down.md' },
        { name: 'auth-failure-burst', path: 'ops/runbooks/auth-failure-burst.md' },
        { name: 'risk-critical', path: 'ops/runbooks/risk-critical.md' },
        { name: 'slo-fast-burn', path: 'ops/runbooks/slo-fast-burn.md' },
        { name: 'slo-slow-burn', path: 'ops/runbooks/slo-slow-burn.md' },
        { name: 'latency-p99-high', path: 'ops/runbooks/latency-p99-high.md' },
      ],
    });
  },
);

export default router;
