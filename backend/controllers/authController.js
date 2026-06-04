const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { getJwtSecret } = require('../config/security');

const LOGIN_RE = /^[a-z0-9._-]{3,32}$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, login: user.login, role: user.role },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

async function register(req, res, next) {
  try {
    const { login, password } = req.body;
    const normalizedLogin = String(login || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedLogin || !normalizedPassword) {
      return res.status(400).json({ error: 'login and password are required' });
    }

    if (!LOGIN_RE.test(normalizedLogin)) {
      return res.status(400).json({ error: 'login must contain 3-32 latin letters, digits, dots, underscores or hyphens' });
    }

    if (normalizedPassword.length < 8 || normalizedPassword.length > 72) {
      return res.status(400).json({ error: 'password must contain 8-72 characters' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE LOWER(login) = $1', [normalizedLogin]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'login already exists' });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    const created = await pool.query(
      `INSERT INTO users (login, password_hash, role)
       VALUES ($1, $2, 'user')
       RETURNING id, login, role`,
      [normalizedLogin, passwordHash]
    );

    const user = created.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { login, password } = req.body;
    const normalizedLogin = String(login || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedLogin || !normalizedPassword) {
      return res.status(400).json({ error: 'login and password are required' });
    }

    if (!LOGIN_RE.test(normalizedLogin) || normalizedPassword.length < 8 || normalizedPassword.length > 72) {
      return res.status(400).json({ error: 'invalid login or password format' });
    }

    const found = await pool.query(
      'SELECT id, login, role, password_hash FROM users WHERE LOWER(login) = $1',
      [normalizedLogin]
    );

    if (found.rowCount === 0) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const user = found.rows[0];
    const valid = await bcrypt.compare(normalizedPassword, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, login: user.login, role: user.role } });
  } catch (err) {
    return next(err);
  }
}

function logout(_req, res) {
  return res.json({ success: true });
}

module.exports = {
  register,
  login,
  logout,
};
