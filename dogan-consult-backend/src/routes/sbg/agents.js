import { Router } from 'express';
import pool from '../../db/pool.js';
import { chat } from '../../services/claude.js';

const router = Router();

router.post('/conversations', async (req, res) => {
  try {
    const { title, agent_id } = req.body;
    const userId = req.user?.id || null;
    const result = await pool.query(
      `INSERT INTO sbg_conversations (title, user_id, messages, metadata)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title || 'New Conversation', userId, '[]', JSON.stringify({ agent_id })]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sbg_conversations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const conv = result.rows[0];
    if (typeof conv.messages === 'string') conv.messages = JSON.parse(conv.messages);
    res.json(conv);
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { content, role } = req.body;
    const convResult = await pool.query('SELECT * FROM sbg_conversations WHERE id = $1', [req.params.id]);
    if (convResult.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

    const conv = convResult.rows[0];
    let messages = typeof conv.messages === 'string' ? JSON.parse(conv.messages) : (conv.messages || []);
    messages.push({ role: role || 'user', content, timestamp: new Date().toISOString() });

    let aiReply = null;
    if (role !== 'assistant') {
      try {
        const chatMessages = messages.map(m => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content }));
        const result = await chat(chatMessages);
        aiReply = result.reply;
        messages.push({ role: 'assistant', content: aiReply, timestamp: new Date().toISOString() });
      } catch (err) {
        console.error('AI reply failed:', err.message);
      }
    }

    await pool.query(
      `UPDATE sbg_conversations SET messages = $1, updated_date = NOW() WHERE id = $2`,
      [JSON.stringify(messages), req.params.id]
    );

    res.json({ messages, reply: aiReply });
  } catch (err) {
    console.error('Add message error:', err);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router;
