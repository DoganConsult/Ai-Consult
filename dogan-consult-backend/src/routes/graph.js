import { Router } from 'express';
import { getGraphClient } from '../services/graph.js';

const router = Router();

router.get('/users', async (_req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Microsoft Graph not configured' });

  try {
    const result = await client.api('/users').select('id,displayName,mail,jobTitle').top(50).get();
    res.json(result.value);
  } catch (err) {
    console.error('Graph users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/organization', async (_req, res) => {
  const client = getGraphClient();
  if (!client) return res.status(503).json({ error: 'Microsoft Graph not configured' });

  try {
    const result = await client.api('/organization').get();
    res.json(result.value?.[0] || {});
  } catch (err) {
    console.error('Graph org error:', err.message);
    res.status(500).json({ error: 'Failed to fetch organization info' });
  }
});

export default router;
