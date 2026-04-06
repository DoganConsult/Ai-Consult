import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { getGraphClient } from '../services/graph.js';
import pool from '../db/pool.js';
import redis from '../db/redis.js';

const router = Router();
const MAIL_USER = () => process.env.GRAPH_MAIL_FROM || 'info@doganconsult.com';

router.get('/inbox', async (req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  const top = Math.min(parseInt(req.query.top) || 25, 50);
  const skip = parseInt(req.query.skip) || 0;
  const filter = req.query.unread === 'true' ? '&$filter=isRead eq false' : '';
  const folder = req.query.folder || 'inbox';

  try {
    const result = await client
      .api(`/users/${MAIL_USER()}/mailFolders/${folder}/messages`)
      .top(top)
      .skip(skip)
      .orderby('receivedDateTime desc')
      .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,hasAttachments,importance,flag')
      .get();

    res.json({
      messages: result.value,
      count: result['@odata.count'] || result.value.length,
      nextLink: result['@odata.nextLink'] || null,
    });
  } catch (err) {
    console.error('Inbox error:', err.message);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

router.get('/folders', async (_req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  try {
    const result = await client
      .api(`/users/${MAIL_USER()}/mailFolders`)
      .top(50)
      .select('id,displayName,totalItemCount,unreadItemCount')
      .get();

    res.json(result.value);
  } catch (err) {
    console.error('Folders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

router.get('/message/:id', async (req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  try {
    const message = await client
      .api(`/users/${MAIL_USER()}/messages/${req.params.id}`)
      .select('id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,body,hasAttachments,importance,flag,conversationId')
      .get();

    res.json(message);
  } catch (err) {
    console.error('Message error:', err.message);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

router.get('/message/:id/attachments', async (req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  try {
    const result = await client
      .api(`/users/${MAIL_USER()}/messages/${req.params.id}/attachments`)
      .get();

    res.json(result.value.map(a => ({
      id: a.id,
      name: a.name,
      contentType: a.contentType,
      size: a.size,
      isInline: a.isInline,
    })));
  } catch (err) {
    console.error('Attachments error:', err.message);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

router.patch('/message/:id/read', async (req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  const isRead = req.body.isRead !== false;

  try {
    await client
      .api(`/users/${MAIL_USER()}/messages/${req.params.id}`)
      .update({ isRead });

    res.json({ success: true, isRead });
  } catch (err) {
    console.error('Mark read error:', err.message);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

router.patch('/message/:id/flag', async (req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  const flagStatus = req.body.flagged ? 'flagged' : 'notFlagged';

  try {
    await client
      .api(`/users/${MAIL_USER()}/messages/${req.params.id}`)
      .update({ flag: { flagStatus } });

    res.json({ success: true, flagStatus });
  } catch (err) {
    console.error('Flag error:', err.message);
    res.status(500).json({ error: 'Failed to flag message' });
  }
});

router.post('/message/:id/reply', [
  body('body').trim().notEmpty().isLength({ max: 50000 }),
  body('replyAll').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  const action = req.body.replyAll ? 'replyAll' : 'reply';

  try {
    await client
      .api(`/users/${MAIL_USER()}/messages/${req.params.id}/${action}`)
      .post({ comment: req.body.body });

    res.json({ success: true });
  } catch (err) {
    console.error('Reply error:', err.message);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

router.post('/message/:id/forward', [
  body('to').isEmail(),
  body('comment').optional().trim().isLength({ max: 50000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  try {
    await client
      .api(`/users/${MAIL_USER()}/messages/${req.params.id}/forward`)
      .post({
        comment: req.body.comment || '',
        toRecipients: [{ emailAddress: { address: req.body.to } }],
      });

    res.json({ success: true });
  } catch (err) {
    console.error('Forward error:', err.message);
    res.status(500).json({ error: 'Failed to forward message' });
  }
});

router.post('/send', [
  body('to').isArray({ min: 1 }),
  body('to.*').isEmail(),
  body('subject').trim().notEmpty().isLength({ max: 500 }),
  body('body').trim().notEmpty().isLength({ max: 100000 }),
  body('cc').optional().isArray(),
  body('importance').optional().isIn(['low', 'normal', 'high']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  const { to, subject, body: mailBody, cc, importance } = req.body;

  const message = {
    subject,
    body: { contentType: 'HTML', content: mailBody },
    toRecipients: to.map(addr => ({ emailAddress: { address: addr } })),
    importance: importance || 'normal',
  };

  if (cc?.length) {
    message.ccRecipients = cc.map(addr => ({ emailAddress: { address: addr } }));
  }

  try {
    await client.api(`/users/${MAIL_USER()}/sendMail`).post({ message, saveToSentItems: true });

    await pool.query(
      `INSERT INTO email_log (direction, mail_to, mail_from, subject, status)
       VALUES ('sent', $1, $2, $3, 'sent')`,
      [to.join(','), MAIL_USER(), subject]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Send error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.delete('/message/:id', async (req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  try {
    await client.api(`/users/${MAIL_USER()}/messages/${req.params.id}`).delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

router.post('/message/:id/move', [
  body('folder').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  try {
    await client
      .api(`/users/${MAIL_USER()}/messages/${req.params.id}/move`)
      .post({ destinationId: req.body.folder });

    res.json({ success: true });
  } catch (err) {
    console.error('Move error:', err.message);
    res.status(500).json({ error: 'Failed to move message' });
  }
});

router.get('/search', async (req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  const top = Math.min(parseInt(req.query.top) || 25, 50);

  try {
    const result = await client
      .api(`/users/${MAIL_USER()}/messages`)
      .search(`"${q}"`)
      .top(top)
      .select('id,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments')
      .get();

    res.json({ messages: result.value });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/stats', async (_req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Graph not configured' });

  try {
    const cached = await redis.get('mailbox:stats');
    if (cached) return res.json(JSON.parse(cached));

    const folders = await client
      .api(`/users/${MAIL_USER()}/mailFolders`)
      .select('displayName,totalItemCount,unreadItemCount')
      .get();

    const stats = {};
    for (const f of folders.value) {
      stats[f.displayName] = { total: f.totalItemCount, unread: f.unreadItemCount };
    }

    await redis.setEx('mailbox:stats', 60, JSON.stringify(stats));
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
