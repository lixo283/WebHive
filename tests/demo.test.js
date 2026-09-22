const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStore, KEY } = require('../frontend/assets/js/demo');
const client = { id: 1, login: 'demo.client', role: 'user' };
const admin = { id: 2, login: 'demo.admin', role: 'admin' };
function fixture() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  return { values, storage, store: createStore(storage) };
}
test('demo client → application → admin estimate → history survives reload', () => {
  const { storage, store } = fixture();
  const created = store.request('/applications', { method: 'POST', body: { service_id: 1, contact_email: 'private@invalid.example' } }, client);
  assert.equal(created.contact_email, 'client@example.com');
  store.request(`/applications/${created.id}/status`, { method: 'PATCH', body: { status: 'work', final_price: 72000, admin_note: 'Estimate' } }, admin);
  store.request(`/applications/${created.id}/status`, { method: 'PATCH', body: { status: 'done' } }, admin);
  const restored = createStore(storage);
  const app = restored.request('/applications', {}, client).find(row => row.id === created.id);
  assert.equal(app.final_price, 72000);
  assert.equal(app.status, 'done');
  assert.deepEqual(restored.request(`/applications/${created.id}/history`, {}, client).map(row => row.new_status), ['new', 'work', 'done']);
});
test('demo writes fail visibly without leaving a partially created application', () => {
  const { storage, store } = fixture();
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => store.request('/applications', { method: 'POST', body: { service_id: 1 } }, client), /сохранить/);
  assert.equal(store.request('/applications', {}, client).length, 3);
});
test('reset deletes only this project state and corrupt state has an actionable error', () => {
  const { values, store } = fixture();
  values.set('another-app', 'untouched');
  values.set(KEY, '{');
  assert.throws(() => store.request('/services'), /Сбросить/);
  store.reset();
  assert.equal(values.get('another-app'), 'untouched');
  assert.equal(store.request('/services').length, 9);
});
test('demo filters and permissions match intended UI behavior', () => {
  const { store } = fixture();
  assert.equal(store.request('/services?category=Landing&maxPrice=50000').length, 1);
  assert.equal(store.request('/services?search=zzzz').length, 0);
  assert.throws(() => store.request('/applications'), /Unauthorized/);
  assert.throws(() => store.request('/services/1', { method: 'DELETE' }, client), /Admin/);
  assert.throws(() => store.request('/services/1', { method: 'DELETE' }, admin), /связана/);
  assert.throws(() => store.request('/applications/1/status', { method: 'PATCH', body: { status: 'work', final_price: -1 } }, admin), /positive/);
});
test('demo service and portfolio CRUD persist and reject external images', () => {
  const { store } = fixture();
  const service = store.request('/services', { method: 'POST', body: { name: 'Test service', price: 100, category: 'Design', description: 'A sufficiently long description' } }, admin);
  const project = store.request('/portfolio', { method: 'POST', body: { title: 'Test', image_url: '/assets/img/ragaza.webp', service_id: service.id, description: 'A sufficiently long description' } }, admin);
  assert.equal(project.image_url, 'assets/img/ragaza.webp');
  store.request(`/services/${service.id}`, { method: 'DELETE' }, admin);
  assert.equal(store.request('/portfolio').find(row => row.id === project.id).service_id, null);
  assert.throws(() => store.request('/portfolio', { method: 'POST', body: { ...project, image_url: 'https://external.invalid/test.png' } }, admin), /локальное/);
});
