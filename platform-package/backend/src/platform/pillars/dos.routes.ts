import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../dauth';
import { toErrorMessage } from '../../errors/http-error.util';
import { pool } from '../../config/db/pool';

const router = Router();

router.get(
  '/overview',
  authenticate,
  requirePermission('platform.config.read'),
  async (_req: Request, res: Response) => {
    try {
      const [tenants, partitions, policies] = await Promise.all([
        pool.query(`select count(*)::int as total,
                           count(*) filter (where status = 'active')::int as active,
                           count(*) filter (where status = 'suspended')::int as suspended
                      from platform.tenants`).catch(() => ({ rows: [{ total: 0, active: 0, suspended: 0 }] })),
        pool.query(`select count(*)::int as n
                      from pg_class c
                      join pg_namespace n on n.oid = c.relnamespace
                     where n.nspname = 'platform' and c.relname like 'audit_log_%'`)
          .catch(() => ({ rows: [{ n: 0 }] })),
        pool.query(`select count(*)::int as n
                      from pg_policies where schemaname = 'platform'`)
          .catch(() => ({ rows: [{ n: 0 }] })),
      ]);
      res.json({
        tenants: tenants.rows[0],
        auditPartitions: partitions.rows[0]?.n ?? 0,
        rlsPolicies: policies.rows[0]?.n ?? 0,
        ts: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/tenants',
  authenticate,
  requirePermission('platform.config.read'),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `select id, slug, name, status, created_at
           from platform.tenants
          order by created_at desc
          limit 500`,
      );
      res.json({ tenants: rows });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/modules',
  authenticate,
  requirePermission('platform.config.read'),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool
        .query(
          `select code, name, status
             from platform.module_registry
            order by code`,
        )
        .catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
      res.json({ modules: rows });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/products',
  authenticate,
  requirePermission('platform.config.read'),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool
        .query(
          `select code, name, status
             from platform.product_registry
            order by code`,
        )
        .catch(() => ({ rows: [] as Array<Record<string, unknown>> }));
      res.json({ products: rows });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/runtime',
  authenticate,
  requirePermission('platform.observability.read'),
  async (_req: Request, res: Response) => {
    try {
      const mem = process.memoryUsage();
      const [{ rows: conn }] = await Promise.all([
        pool
          .query(`select count(*)::int as connections from pg_stat_activity where datname = current_database()`)
          .catch(() => ({ rows: [{ connections: 0 }] })),
      ]);
      res.json({
        node: {
          uptimeSec: Math.round(process.uptime()),
          memoryMb: { rss: Math.round(mem.rss / 1024 / 1024), heap: Math.round(mem.heapUsed / 1024 / 1024) },
          pid: process.pid,
          version: process.version,
        },
        db: { connections: conn[0]?.connections ?? 0 },
        ts: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

export default router;
