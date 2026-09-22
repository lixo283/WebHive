const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in backend/.env to an existing database.');
for (const file of ['schema.sql', 'seed.sql']) {
  // Keep connection credentials out of the command line and diagnostic output.
  const result = spawnSync('psql', ['--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', path.join(__dirname, '../../database', file)], {
    env: { ...process.env, PGDATABASE: process.env.DATABASE_URL }, stdio: 'inherit',
  });
  if (result.error || result.status !== 0) process.exit(1);
}
