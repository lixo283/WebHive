const { test, expect } = require('../../backend/node_modules/@playwright/test');

test('demo journey: client request, admin estimate, client history, reset; no API traffic', async ({ page }) => {
  const apiCalls = [];
  const errors = [];
  page.on('request', req => { if (new URL(req.url()).pathname.includes('/api/')) apiCalls.push(req.url()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('index.html');
  await page.getByRole('button', { name: 'Я клиент', exact: true }).click();
  await expect(page.locator('#cabinetTotalCount')).toHaveText('3');
  await page.goto('service.html?id=1');
  await expect(page.locator('#applicationContactEmail')).toHaveValue('client@example.com');
  await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click();
  await expect(page.locator('#applicationMessage')).toContainText('Демо-заявка');
  await page.goto('cabinet.html');
  await expect(page.locator('#cabinetTotalCount')).toHaveText('4');
  await page.getByRole('button', { name: 'Я администратор', exact: true }).click();
  await expect(page.locator('#adminApplicationsBody tr').first()).toBeVisible();
  await page.locator('[data-open-application]').first().click();
  await page.locator('[data-status-id]').first().selectOption('work');
  await page.locator('[data-final-price-input]').fill('123456');
  await page.locator('[data-admin-note-input]').fill('Тестовая оценка');
  await page.locator('[data-save-application-details]').click();
  await expect(page.locator('#adminMessage')).toContainText('сохран');
  await page.getByRole('button', { name: 'Я клиент', exact: true }).click();
  await expect(page.locator('#applicationsBody')).toContainText('123');
  await page.reload();
  await expect(page.locator('#applicationsBody')).toContainText('Тестовая оценка');
  await page.evaluate(() => localStorage.setItem('unrelated-app', 'keep'));
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Сбросить демо' }).click();
  await expect(page).toHaveURL(/index.html$/);
  expect(await page.evaluate(() => localStorage.getItem('unrelated-app'))).toBe('keep');
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test('catalog search, empty state, navigation keyboard and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('catalog.html');
  await expect(page.locator('#servicesGrid a')).toHaveCount(9);
  await page.locator('#searchInput').fill('zzzz');
  await expect(page.locator('#servicesGrid')).toContainText('не найдены');
  await page.locator('#searchInput').fill('Landing');
  await expect(page.locator('#servicesGrid a')).toHaveCount(2);
  await page.locator('#menuToggle').click();
  await expect(page.locator('#menuScreen')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#menuToggle')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#menuScreen a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menuToggle')).toBeFocused();
  for (const path of ['index.html', 'catalog.html', 'service.html', 'portfolio.html', 'login.html']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});

test('demo auth never asks for credentials and corrupt storage has recovery', async ({ page }) => {
  await page.goto('login.html');
  await expect(page.locator('#loginForm')).toBeHidden();
  await page.evaluate(() => localStorage.setItem('webhive:demo:v1', '{'));
  await page.goto('catalog.html');
  await expect(page.locator('#servicesGrid')).toContainText('Сбросить');
});

test('live catalog error is visible and retry never silently swaps in demo data', async ({ page }) => {
  await page.route('**/assets/js/config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.WEBHIVE_MODE = 'live';" }));
  let attempts = 0;
  await page.route('**/api/services?*', route => {
    attempts++;
    return route.fulfill(attempts === 1
      ? { status: 503, json: { error: 'База данных временно недоступна.' } }
      : { json: [{ id: 99, name: 'Live service', category: 'Design', price: 100, description: 'Service from live API' }] });
  });
  await page.goto('catalog.html');
  await expect(page.locator('#servicesGrid')).toContainText('База данных временно недоступна');
  await expect(page.locator('.demo-bar')).toHaveCount(0);
  await expect(page.locator('#servicesGrid a')).toHaveCount(0);
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.locator('#servicesGrid')).toContainText('Live service');
  expect(attempts).toBe(2);
});

test('late search responses cannot replace the current catalog results', async ({ page }) => {
  await page.route('**/assets/js/config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.WEBHIVE_MODE = 'live';" }));
  let slowRoute;
  await page.route('**/api/services?*', route => {
    const search = new URL(route.request().url()).searchParams.get('search');
    if (search === 'slow') { slowRoute = route; return; }
    return route.fulfill({ json: [{ id: 1, name: search === 'fast' ? 'Fresh service' : 'Initial service', category: 'Design', price: 100, description: 'Service from live API' }] });
  });
  await page.goto('catalog.html');
  await expect(page.locator('#servicesGrid')).toContainText('Initial service');
  await page.locator('#searchInput').fill('slow');
  await expect.poll(() => Boolean(slowRoute)).toBe(true);
  await page.locator('#searchInput').fill('fast');
  await expect(page.locator('#servicesGrid')).toContainText('Fresh service');
  await slowRoute.fulfill({ json: [{ id: 2, name: 'Old service', category: 'Design', price: 1, description: 'Stale service response' }] });
  await page.waitForTimeout(100);
  await expect(page.locator('#servicesGrid')).toContainText('Fresh service');
  await expect(page.locator('#servicesGrid')).not.toContainText('Old service');
});

test('a stalled live response times out and offers retry', async ({ page }) => {
  await page.route('**/assets/js/config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.WEBHIVE_MODE = 'live';" }));
  await page.route('**/api/services?*', () => {});
  await page.goto('catalog.html');
  await expect(page.locator('#servicesGrid')).toContainText('Сервер не ответил', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeVisible();
});
