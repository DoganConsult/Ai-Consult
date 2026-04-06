import { Router } from 'express';
import pool from '../db/pool.js';
import redis from '../db/redis.js';

const router = Router();

router.get('/', async (_req, res) => {
  const checks = { status: 'ok', timestamp: new Date().toISOString(), services: {} };

  try {
    await pool.query('SELECT 1');
    checks.services.postgresql = 'connected';
  } catch {
    checks.services.postgresql = 'disconnected';
    checks.status = 'degraded';
  }

  try {
    await redis.ping();
    checks.services.redis = 'connected';
  } catch {
    checks.services.redis = 'disconnected';
    checks.status = 'degraded';
  }

  res.status(checks.status === 'ok' ? 200 : 503).json(checks);
});

export default router;
