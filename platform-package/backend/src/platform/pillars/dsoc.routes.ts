import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../dauth';
import { toErrorMessage } from '../../errors/http-error.util';
import { pool } from '../../config/db/pool';
import { writeAudit } from './audit.util';
import { validateOrShip, SecurityAlertListSchema } from './contract.util';

const router = Router();

router.get(
  '/alerts',
  authenticate,
  requirePermission('platform.audit.read'),
  async (req: Request, res: Response) => {
    try {
      const severity = (req.query.severity as string | undefined) || null;
      const status = (req.query.status as string | undefined) || null;
      const limit = Math.min(parseInt((req.query.limit as string) || '100', 10) || 100, 500);
      const { rows } = await pool.query(
        `select id, ts, tenant_id, user_id, severity, source, category, title,
                detail, event_id, status, acked_by, acked_at
           from platform.security_alerts
          where ($1::text is null or severity = $1)
            and ($2::text is null or status = $2)
          order by ts desc
          limit $3`,
        [severity, status, limit],
      );
      const payload = { alerts: rows, ts: new Date().toISOString() };
      if (!validateOrShip(res, SecurityAlertListSchema, payload, 'dsoc.alerts.list')) return;
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/alerts/summary',
  authenticate,
  requirePermission('platform.audit.read'),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `select severity, status, count(*)::int as n
           from platform.security_alerts
          where ts > now() - interval '7 days'
          group by severity, status`,
      );
      res.json({ buckets: rows, ts: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

async function mutateAlert(id: string, newStatus: 'ack' | 'resolved' | 'suppressed', userId?: string) {
  await pool.query(
    `update platform.security_alerts
        set status = $2,
            acked_by = case when $2 in ('ack','resolved') then coalesce($3::uuid, acked_by) else acked_by end,
            acked_at = case when $2 in ('ack','resolved') then now() else acked_at end
      where id = $1`,
    [id, newStatus, userId ?? null],
  );
}

router.post(
  '/alerts/:id/ack',
  authenticate,
  requirePermission('platform.audit.read'),
  async (req: Request, res: Response) => {
    try {
      await mutateAlert(String(req.params.id), 'ack', (req as Request & { user?: { id?: string } }).user?.id);
      await writeAudit(req, 'dsoc.alert.ack', `platform.security_alerts:${req.params.id}`, { id: req.params.id });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.post(
  '/alerts/:id/resolve',
  authenticate,
  requirePermission('platform.audit.read'),
  async (req: Request, res: Response) => {
    try {
      await mutateAlert(String(req.params.id), 'resolved', (req as Request & { user?: { id?: string } }).user?.id);
      await writeAudit(req, 'dsoc.alert.resolve', `platform.security_alerts:${req.params.id}`, { id: req.params.id });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.post(
  '/alerts/:id/suppress',
  authenticate,
  requirePermission('platform.audit.read'),
  async (req: Request, res: Response) => {
    try {
      await mutateAlert(String(req.params.id), 'suppressed', (req as Request & { user?: { id?: string } }).user?.id);
      await writeAudit(req, 'dsoc.alert.suppress', `platform.security_alerts:${req.params.id}`, { id: req.params.id });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/audit',
  authenticate,
  requirePermission('platform.audit.read'),
  async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string | undefined) || null;
      const tenant = (req.query.tenant_id as string | undefined) || null;
      const limit = Math.min(parseInt((req.query.limit as string) || '200', 10) || 200, 1000);
      const { rows } = await pool.query(
        `select id, ts, tenant_id, user_id, action, target, status_code, client_ip, request_id, meta
           from platform.audit_log
          where ($1::text is null or action ilike '%'||$1||'%' or target ilike '%'||$1||'%')
            and ($2::uuid is null or tenant_id = $2::uuid)
          order by ts desc
          limit $3`,
        [q, tenant, limit],
      );
      res.json({ events: rows, ts: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/chain/verify',
  authenticate,
  requirePermission('platform.audit.read'),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `select count(*)::int as total,
                min(ts) as first_ts,
                max(ts) as last_ts
           from platform.audit_log`,
      );
      res.json({ ok: true, ...rows[0] });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

export default router;
