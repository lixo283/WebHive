const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { getJwtSecret } = require('./config/security');
const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const portfolioRoutes = require('./routes/portfolio');
const applicationsRoutes = require('./routes/applications');

getJwtSecret();

const app = express();

async function ensureDatabaseShape() {
  await pool.query(`
    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS final_price NUMERIC(12, 2);

    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS admin_note TEXT;
  `);
}

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((v) => v.trim())
  : '*';

app.use(cors({ origin: corsOrigin }));
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' http://localhost:3000; img-src 'self' data: https:; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'"
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'webstudio-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/applications', applicationsRoutes);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const port = Number(process.env.PORT || 3000);

ensureDatabaseShape()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Webstudio server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to prepare database schema', err);
    process.exit(1);
  });
