const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('../backend/node_modules/jsonwebtoken');
const { createApp } = require('../backend/app');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
// Never touch a developer database implicitly. Integration uses a separate disposable database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://test:test@127.0.0.1:1/webhive_unavailable';
const pool = require('../backend/db/pool');
let server;
let base;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); await pool.end(); });
async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
test('health works independently of the database, unknown API routes return JSON 404', async () => {
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/missing')).status, 404);
});
test('JWT rejects unsigned, tampered, and expired tokens before querying the database', async () => {
  const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"id":1,"role":"admin"}').toString('base64url')}.`;
  const expired = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
  const forged = jwt.sign({ id: 1, role: 'admin' }, 'wrong-signing-secret');
  for (const token of [unsigned, expired, forged]) assert.equal((await request('/applications', { token })).status, 401);
  assert.equal((await request('/services', { method: 'POST', body: {} })).status, 401);
});
test('UTF-8 password byte limit and malformed JSON return 400', async () => {
  const invalid = await request('/auth/register', { method: 'POST', body: { login: 'validname', password: 'я'.repeat(37) } });
  assert.equal(invalid.status, 400);
  const response = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
});
test('connection failure is passed to Express from both transaction handlers', async () => {
  const original = pool.connect;
  pool.connect = async () => { throw Object.assign(new Error('offline'), { code: 'ECONNREFUSED' }); };
  const { createApplication, updateApplicationStatus } = require('../backend/controllers/applicationsController');
  try {
    for (const [handler, req] of [
      [createApplication, { body: { service_id: 1, contact_name: 'Test', contact_email: 'test@example.com', contact_phone: '70000000000', comment: '' }, user: { id: 1 } }],
      [updateApplicationStatus, { params: { id: '1' }, body: { status: 'work' } }],
    ]) {
      let forwarded;
      await handler(req, {}, err => { forwarded = err; });
      assert.equal(forwarded.code, 'ECONNREFUSED');
    }
  } finally { pool.connect = original; }
});
test('live client/admin lifecycle, isolation and concurrent status history', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const suffix = crypto.randomBytes(4).toString('hex');
  const password = 'Integration-Test-Password!';
  const createdUsers = [];
  let serviceId;
  try {
    async function register(prefix) {
      const response = await request('/auth/register', { method: 'POST', body: { login: `${prefix}_${suffix}`, password } });
      assert.equal(response.status, 201);
      createdUsers.push(response.body.user.id);
      return response.body;
    }
    const client = await register('client');
    const other = await register('other');
    const admin = await register('admin');
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.user.id]);
    const serviceBody = { name: `Integration ${suffix}`, price: 100, category: 'Design', description: 'Integration test service description' };
    assert.equal((await request('/services', { method: 'POST', body: serviceBody, token: client.token })).status, 403);
    const service = await request('/services', { method: 'POST', body: serviceBody, token: admin.token });
    assert.equal(service.status, 201);
    serviceId = service.body.id;
    const app = await request('/applications', { method: 'POST', token: client.token, body: { service_id: serviceId, contact_name: 'Test Client', contact_email: 'test@example.com', contact_phone: '70000000000', comment: 'Integration test application' } });
    assert.equal(app.status, 201);
    // A failed history insert must roll back the application in the same transaction.
    const beforeCount = (await pool.query('SELECT count(*)::int AS total FROM applications')).rows[0].total;
    const originalConnect = pool.connect;
    pool.connect = async () => {
      const connection = await originalConnect.call(pool);
      return {
        query: (sql, params) => {
          if (String(sql).includes('INSERT INTO application_status_history')) throw new Error('injected history failure');
          return connection.query(sql, params);
        },
        release: () => connection.release(),
      };
    };
    try {
      let forwarded;
      await require('../backend/controllers/applicationsController').createApplication({ user: client.user, body: {
        service_id: serviceId, contact_name: 'Test', contact_email: 'test@example.com', contact_phone: '70000000000',
      } }, {}, err => { forwarded = err; });
      assert.match(forwarded.message, /injected/);
    } finally { pool.connect = originalConnect; }
    assert.equal((await pool.query('SELECT count(*)::int AS total FROM applications')).rows[0].total, beforeCount);

    assert.equal((await request(`/applications/${app.body.id}/history`, { token: other.token })).status, 403);
    assert.equal((await request('/applications', { token: other.token })).body.length, 0);
    const updates = await Promise.all(['work', 'done'].map(status => request(`/applications/${app.body.id}/status`, { method: 'PATCH', token: admin.token, body: { status, final_price: 150, admin_note: 'Approved estimate' } })));
    assert.ok(updates.every(result => result.status === 200));
    const history = await request(`/applications/${app.body.id}/history`, { token: client.token });
    assert.equal(history.body.length, 3);
    assert.equal(history.body[1].old_status, 'new');
    assert.equal(history.body[2].old_status, history.body[1].new_status);
    assert.equal((await request(`/services/${serviceId}`, { method: 'DELETE', token: admin.token })).status, 409);
    await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [admin.user.id]);
    assert.equal((await request('/services', { method: 'POST', body: serviceBody, token: admin.token })).status, 403);
    const duplicate = await request('/auth/register', { method: 'POST', body: { login: client.user.login.toUpperCase(), password } });
    assert.equal(duplicate.status, 409);
  } finally {
    await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [createdUsers]);
    if (serviceId) await pool.query('DELETE FROM services WHERE id = $1', [serviceId]);
  }
});
test('auth attempts are rate limited', async () => {
  let response;
  for (let i = 0; i < 31; i++) response = await request('/auth/login', { method: 'POST', body: {} });
  assert.equal(response.status, 429);
});
