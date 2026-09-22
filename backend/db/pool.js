const { Pool } = require('pg');

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'webstudio',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

const pool = new Pool({ ...config, connectionTimeoutMillis: 5000, statement_timeout: 8000, max: 10 });
pool.on('error', (err) => console.error('Idle database connection failed:', err.code || err.name));

module.exports = pool;
