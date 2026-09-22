const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { getJwtSecret } = require('../config/security');

function extractBearer(req) {
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (!Number.isInteger(payload.id) || payload.id < 1) return res.status(401).json({ error: 'Invalid token' });
    req.authUserId = payload.id;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  try {
    const found = await pool.query('SELECT id, login, role FROM users WHERE id = $1', [req.authUserId]);
    if (!found.rowCount) return res.status(401).json({ error: 'Invalid token' });
    req.user = found.rows[0];
    return next();
  } catch (err) { return next(err); }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
