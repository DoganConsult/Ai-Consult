import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db/pool.js';
import redis from '../db/redis.js';

const router = Router();

router.get('/actions', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status;
  const category = req.query.category;

  let where = [];
  let params = [];
  let idx = 1;

  if (status) { where.push(`status = $${idx++}`); params.push(status); }
  if (category) { where.push(`category = $${idx++}`); params.push(category); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT id, action_type, from_email, subject, category, priority, status, agent_notes, created_at
       FROM agent_actions ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM agent_actions ${whereClause}`, params
    );

    res.json({ actions: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    console.error('Agent actions error:', err);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

router.get('/actions/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agent_actions WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch action' });
  }
});

router.patch('/actions/:id', [
  body('status').optional().isIn(['pending', 'sent', 'skipped', 'failed', 'reviewed']),
  body('final_body').optional().trim(),
  body('agent_notes').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const updates = [];
  const params = [];
  let idx = 1;

  if (req.body.status) { updates.push(`status = $${idx++}`); params.push(req.body.status); }
  if (req.body.final_body) { updates.push(`final_body = $${idx++}`); params.push(req.body.final_body); }
  if (req.body.agent_notes) { updates.push(`agent_notes = $${idx++}`); params.push(req.body.agent_notes); }
  updates.push(`updated_at = NOW()`);

  if (!params.length) return res.status(400).json({ error: 'No updates provided' });

  try {
    await pool.query(
      `UPDATE agent_actions SET ${updates.join(', ')} WHERE id = $${idx}`,
      [...params, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update action' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const cached = await redis.get('agent:stats');
    if (cached) return res.json(JSON.parse(cached));

    const statusResult = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM agent_actions GROUP BY status`
    );
    const categoryResult = await pool.query(
      `SELECT category, COUNT(*)::int as count FROM agent_actions GROUP BY category ORDER BY count DESC`
    );
    const todayResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM agent_actions WHERE created_at >= CURRENT_DATE`
    );

    const stats = {
      byStatus: Object.fromEntries(statusResult.rows.map(r => [r.status, r.count])),
      byCategory: Object.fromEntries(categoryResult.rows.map(r => [r.category, r.count])),
      today: todayResult.rows[0].count,
      total: statusResult.rows.reduce((s, r) => s + r.count, 0),
    };

    await redis.setEx('agent:stats', 60, JSON.stringify(stats));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/rules', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM auto_reply_rules ORDER BY priority DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

router.post('/rules', [
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('match_type').isIn(['all', 'subject', 'from', 'category']),
  body('match_pattern').optional().trim(),
  body('exclude_pattern').optional().trim(),
  body('reply_subject_template').optional().trim(),
  body('reply_body_template').trim().notEmpty(),
  body('lang').optional().isIn(['ar', 'en', 'tr']),
  body('priority').optional().isInt({ min: 0, max: 100 }),
  body('is_active').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, match_type, match_pattern, exclude_pattern, reply_subject_template, reply_body_template, lang, priority, is_active } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO auto_reply_rules (name, match_type, match_pattern, exclude_pattern, reply_subject_template, reply_body_template, lang, priority, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, match_type, match_pattern || null, exclude_pattern || null, reply_subject_template || null,
       reply_body_template, lang || 'ar', priority || 0, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

router.patch('/rules/:id', async (req, res) => {
  const fields = ['name', 'is_active', 'match_type', 'match_pattern', 'exclude_pattern',
                   'reply_subject_template', 'reply_body_template', 'lang', 'priority'];
  const updates = [];
  const params = [];
  let idx = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${idx++}`);
      params.push(req.body[f]);
    }
  }

  if (!updates.length) return res.status(400).json({ error: 'No updates provided' });

  try {
    await pool.query(`UPDATE auto_reply_rules SET ${updates.join(', ')} WHERE id = $${idx}`, [...params, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM auto_reply_rules WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

export default router;
