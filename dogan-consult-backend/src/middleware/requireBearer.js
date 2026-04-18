const TOKENS = (process.env.BACKEND_API_TOKENS || '').split(',').map(s => s.trim()).filter(Boolean);

export function requireBearer(req, res, next) {
  if (TOKENS.length === 0) {
    return res.status(503).json({ error: 'BACKEND_API_TOKENS not configured; route disabled' });
  }
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return res.status(401).json({ error: 'missing bearer token' });
  if (!TOKENS.includes(m[1])) return res.status(403).json({ error: 'invalid token' });
  next();
}
