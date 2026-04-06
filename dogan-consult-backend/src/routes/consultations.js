import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db/pool.js';
import redis from '../db/redis.js';
import { formLimiter } from '../middleware/rateLimiter.js';
import { notifyConsultation } from '../services/notifications.js';

const router = Router();

const validate = [
  body('type').isIn(['advisory', 'proposal']).withMessage('Invalid type'),
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('email').isEmail().normalizeEmail(),
  body('organization').optional().trim().isLength({ max: 255 }),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('serviceArea').optional().trim().isLength({ max: 100 }),
  body('message').optional().trim().isLength({ max: 5000 }),
  body('lang').optional().isIn(['en', 'ar', 'tr']),
];

router.post('/', formLimiter, validate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type, name, email, organization, phone, serviceArea, message, lang } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO consultations (type, name, email, organization, phone, service_area, message, lang)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
      [type, name, email, organization || null, phone || null, serviceArea || null, message || null, lang || 'ar']
    );

    await redis.del('consultations:stats');

    notifyConsultation({ type, name, email, organization, serviceArea, message, lang }).catch(() => {});

    res.status(201).json({
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('Consultation insert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const cached = await redis.get('consultations:stats');
    if (cached) return res.json(JSON.parse(cached));

    const result = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM consultations GROUP BY status`
    );
    const stats = { total: 0, byStatus: {} };
    for (const row of result.rows) {
      stats.byStatus[row.status] = row.count;
      stats.total += row.count;
    }

    await redis.setEx('consultations:stats', 300, JSON.stringify(stats));
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
