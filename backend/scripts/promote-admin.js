const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../db/pool');
const login = String(process.argv[2] || '').trim().toLowerCase();
async function main() {
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) throw new Error('Usage: npm run admin:promote -- registered_login');
  const result = await pool.query("UPDATE users SET role = 'admin' WHERE login = $1 RETURNING id", [login]);
  if (!result.rowCount) throw new Error('Account not found. Register your own account first.');
  console.log(`Administrator role assigned to ${login}. Sign in again to update the interface.`);
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => pool.end());
