import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../db/pool.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sbg-secret-key-change-in-production';

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}

router.post('/register', async (req, res) => {
  const { email, password, full_name, company, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const existing = await pool.query('SELECT id FROM sbg_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO sbg_users (email, password_hash, full_name, company, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role`,
      [email, hash, full_name || null, company || null, phone || null]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const result = await pool.query('SELECT * FROM sbg_users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    await pool.query('UPDATE sbg_users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, company: user.company }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, company, phone, avatar_url, metadata, created_date FROM sbg_users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.patch('/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { full_name, company, phone, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE sbg_users SET full_name = COALESCE($1, full_name), company = COALESCE($2, company),
       phone = COALESCE($3, phone), avatar_url = COALESCE($4, avatar_url), updated_date = NOW()
       WHERE id = $5 RETURNING id, email, full_name, role, company, phone, avatar_url`,
      [full_name, company, phone, avatar_url, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
