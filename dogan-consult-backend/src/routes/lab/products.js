import { Router } from 'express';
import pool from '../../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM lab_products WHERE is_active = true ORDER BY sort_order, created_at'
    );
    res.json({ products: rows });
  } catch (err) {
    console.error('GET /api/lab/products error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM lab_products WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: rows[0] });
  } catch (err) {
    console.error('GET /api/lab/products/:slug error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
