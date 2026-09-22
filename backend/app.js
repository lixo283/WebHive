const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

function createApp({ mode = 'live' } = {}) {
  if (!['live', 'demo'].includes(mode)) throw new Error('WEBHIVE_MODE must be live or demo');
  const app = express();
  app.disable('x-powered-by');
  // Set only for the actual reverse proxy topology, never blindly trust all clients.
  if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map(v => v.trim()) }));
  app.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data: https:; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.get('/assets/js/config.js', (_req, res) => {
    res.type('js').set('Cache-Control', 'no-store').send(`window.WEBHIVE_MODE = ${JSON.stringify(mode)};`);
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'webhive', mode }));
  if (mode === 'live') {
    require('./config/security').getJwtSecret();
    const pool = require('./db/pool');
    app.get('/api/ready', async (_req, res, next) => {
      try {
        await pool.query('SELECT 1 FROM applications LIMIT 1');
        res.json({ ok: true });
      } catch (err) { next(err); }
    });
    app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    app.use('/api/auth', rateLimit({
      windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
      message: { error: 'Слишком много попыток. Повторите через 15 минут.' },
    }), require('./routes/auth'));
    app.use('/api/services', require('./routes/services'));
    app.use('/api/portfolio', require('./routes/portfolio'));
    app.use('/api/applications', require('./routes/applications'));
  }
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
  app.use(express.static(path.join(__dirname, '..', 'frontend'), {
    setHeaders(res, filePath) {
      res.set('Cache-Control', /\.(html|css|js)$/.test(filePath) ? 'no-cache' : 'public, max-age=3600');
    },
  }));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    if (['23503', '23001'].includes(err.code)) return res.status(409).json({ error: 'Запись связана с другими данными. Обновите страницу.' });
    const unavailable = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '53300', '57014'].includes(err.code)
      || /timeout|Connection terminated/i.test(err.message);
    console.error('Request failed:', err.code || err.name);
    res.status(unavailable ? 503 : 500).json({ error: unavailable
      ? 'База данных временно недоступна. Повторите позже.' : 'Внутренняя ошибка сервера.' });
  });
  return app;
}
module.exports = { createApp };
