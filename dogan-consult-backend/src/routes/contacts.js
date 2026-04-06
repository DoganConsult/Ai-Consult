import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db/pool.js';
import { formLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const validate = [
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('email').isEmail().normalizeEmail(),
  body('subject').optional().trim().isLength({ max: 255 }),
  body('message').trim().notEmpty().isLength({ max: 5000 }),
  body('lang').optional().isIn(['en', 'ar', 'tr']),
];

router.post('/', formLimiter, validate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, subject, message, lang } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO contacts (name, email, subject, message, lang)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [name, email, subject || null, message, lang || 'ar']
    );

    res.status(201).json({
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('Contact insert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
