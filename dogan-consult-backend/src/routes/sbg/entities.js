import { Router } from 'express';
import pool from '../../db/pool.js';

const ENTITY_TABLE_MAP = {
  Product: 'sbg_products',
  Sector: 'sbg_sectors',
  Inquiry: 'sbg_inquiries',
  DemoRequest: 'sbg_demo_requests',
  Document: 'sbg_documents',
  Training: 'sbg_trainings',
  Conversation: 'sbg_conversations',
  Notification: 'sbg_notifications',
  ApprovalGate: 'sbg_approval_gates',
  ApprovalRequest: 'sbg_approval_requests',
  WorkflowRule: 'sbg_workflow_rules',
  VisitorSession: 'sbg_visitor_sessions',
  SectorCampaign: 'sbg_sector_campaigns',
  LeadMagnet: 'sbg_lead_magnets',
  CampaignLead: 'sbg_campaign_leads',
  AgentConfig: 'sbg_agent_configs',
  AgentRun: 'sbg_agent_runs',
  AgentNotification: 'sbg_agent_notifications',
  MarketplaceItem: 'sbg_marketplace_items',
  MarketplaceReview: 'sbg_marketplace_reviews',
  User: 'sbg_users',
};

function getTable(entityName) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table) throw new Error(`Unknown entity: ${entityName}`);
  return table;
}

function parseSortParam(sort) {
  if (!sort) return 'created_date DESC';
  const desc = sort.startsWith('-');
  const col = desc ? sort.slice(1) : sort;
  const safe = col.replace(/[^a-zA-Z0-9_]/g, '');
  if (safe === 'order') return `"order" ${desc ? 'DESC' : 'ASC'}`;
  return `${safe} ${desc ? 'DESC' : 'ASC'}`;
}

const router = Router();

router.get('/:entity', async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    const sort = parseSortParam(req.query.sort);
    const limit = Math.min(parseInt(req.query.limit) || 1000, 5000);
    const filterRaw = req.query.filter;

    let whereClause = '';
    const values = [];

    if (filterRaw) {
      try {
        const conditions = JSON.parse(filterRaw);
        const clauses = [];
        let idx = 1;
        for (const [key, val] of Object.entries(conditions)) {
          const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
          clauses.push(`${safeKey} = $${idx}`);
          values.push(val);
          idx++;
        }
        if (clauses.length > 0) {
          whereClause = `WHERE ${clauses.join(' AND ')}`;
        }
      } catch {}
    }

    const result = await pool.query(
      `SELECT * FROM ${table} ${whereClause} ORDER BY ${sort} LIMIT $${values.length + 1}`,
      [...values, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Entity list error:', err.message);
    res.status(err.message.includes('Unknown entity') ? 400 : 500).json({ error: err.message });
  }
});

router.get('/:entity/:id', async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Entity get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:entity', async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    const data = req.body;
    const keys = Object.keys(data).filter(k => k !== 'id');
    if (keys.length === 0) return res.status(400).json({ error: 'No data' });

    const cols = keys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '')).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const vals = keys.map(k => {
      const v = data[k];
      return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
    });

    const result = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
      vals
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Entity create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:entity/:id', async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    const data = req.body;
    const keys = Object.keys(data).filter(k => k !== 'id');
    if (keys.length === 0) return res.status(400).json({ error: 'No data' });

    const sets = keys.map((k, i) => `${k.replace(/[^a-zA-Z0-9_]/g, '')} = $${i + 1}`).join(', ');
    const vals = keys.map(k => {
      const v = data[k];
      return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
    });
    vals.push(req.params.id);

    const result = await pool.query(
      `UPDATE ${table} SET ${sets}, updated_date = NOW() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Entity update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:entity/:id', async (req, res) => {
  try {
    const table = getTable(req.params.entity);
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Entity delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
