import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { chat } from '../services/claude.js';
import pool from '../db/pool.js';
import redis from '../db/redis.js';

const router = Router();

router.post('/', [
  body('messages').isArray({ min: 1, max: 50 }),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').trim().notEmpty().isLength({ max: 5000 }),
  body('lang').optional().isIn(['ar', 'en', 'tr']),
  body('sessionId').optional().trim().isLength({ max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { messages, lang, sessionId } = req.body;

  try {
    const result = await chat(messages, lang || 'en');

    const sid = sessionId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    pool.query(
      `INSERT INTO chat_sessions (session_id, last_user_message, last_agent_reply, lang, message_count, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_id)
       DO UPDATE SET last_user_message = $2, last_agent_reply = $3, message_count = chat_sessions.message_count + 1, metadata = $6, updated_at = NOW()`,
      [sid, messages[messages.length - 1]?.content, result.reply, lang || 'en', messages.length, JSON.stringify({ provider: result.provider })]
    ).catch(err => console.error('Chat log error:', err.message));

    res.json({
      reply: result.reply,
      sessionId: sid,
      usage: result.usage,
      provider: result.provider,
    });
  } catch (err) {
    console.error('Chat error:', err.message);

    if (err.message === 'All AI providers unavailable') {
      return res.status(503).json({ error: 'AI service temporarily unavailable' });
    }

    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

router.get('/sessions', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await pool.query(
      `SELECT session_id, lang, message_count, last_user_message, created_at, updated_at
       FROM chat_sessions ORDER BY updated_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
