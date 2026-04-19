import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../dauth';
import { toErrorMessage } from '../../errors/http-error.util';
import { pool } from '../../config/db/pool';

const router = Router();

async function tableExists(name: string): Promise<boolean> {
  try {
    const { rows } = await pool.query(`select to_regclass($1) as r`, [name]);
    return rows[0]?.r != null;
  } catch {
    return false;
  }
}

router.get(
  '/sessions',
  authenticate,
  requirePermission('platform.user.invite'),
  async (_req: Request, res: Response) => {
    try {
      if (!(await tableExists('public.sessions'))) {
        res.json({ sessions: [], note: 'sessions table missing' });
        return;
      }
      const { rows } = await pool.query(
        `select id, user_id, created_at, expires_at, last_seen_at, ip, user_agent
           from public.sessions
          where (expires_at is null or expires_at > now())
          order by coalesce(last_seen_at, created_at) desc
          limit 200`,
      );
      res.json({ sessions: rows });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.post(
  '/sessions/:id/revoke',
  authenticate,
  requirePermission('platform.user.invite'),
  async (req: Request, res: Response) => {
    try {
      if (!(await tableExists('public.sessions'))) {
        res.status(404).json({ error: 'sessions table missing' });
        return;
      }
      await pool.query(`update public.sessions set expires_at = now() where id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/jit/active',
  authenticate,
  requirePermission('platform.permission.assign'),
  async (_req: Request, res: Response) => {
    try {
      const t = (await tableExists('platform.jit_elevations'))
        ? 'platform.jit_elevations'
        : (await tableExists('public.jit_elevations'))
          ? 'public.jit_elevations'
          : null;
      if (!t) {
        res.json({ elevations: [], note: 'jit table missing' });
        return;
      }
      const { rows } = await pool.query(
        `select * from ${t} where expires_at > now() order by expires_at asc limit 200`,
      );
      res.json({ elevations: rows });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/sod/blocked',
  authenticate,
  requirePermission('platform.sod.manage'),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `select id, ts, tenant_id, user_id, severity, title, detail
           from platform.security_alerts
          where category ilike '%sod%' or source = 'dauth'
          order by ts desc
          limit 100`,
      );
      res.json({ blocks: rows });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/risk/score',
  authenticate,
  requirePermission('platform.audit.read'),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `select
           count(*) filter (where severity in ('high','critical') and status = 'open')::int as open_high,
           count(*) filter (where ts > now() - interval '24 hours')::int as last_24h,
           count(*) filter (where ts > now() - interval '1 hour')::int as last_1h
           from platform.security_alerts`,
      );
      const r = rows[0] ?? { open_high: 0, last_24h: 0, last_1h: 0 };
      const score = Math.min(100, r.open_high * 15 + Math.floor(r.last_1h / 2) + Math.floor(r.last_24h / 10));
      const band = score >= 70 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low';
      res.json({ score, band, ...r, ts: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

export default router;
