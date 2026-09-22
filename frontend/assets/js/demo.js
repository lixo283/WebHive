/* Browser-only sandbox: it never authenticates against or writes to the live API. */
(function (root) {
  const KEY = 'webhive:demo:v1';
  const services = [
    ['Landing Page', 45000, 'Landing', 'Лендинг с формой заявки и блоками для презентации продукта.'],
    ['Корпоративный сайт', 85000, 'Corporate', 'Многостраничный сайт компании с услугами и кейсами.'],
    ['Интернет-магазин', 120000, 'Store', 'Каталог, фильтрация, карточка товара и форма заказа.'],
    ['UI/UX Redesign', 60000, 'Design', 'Редизайн интерфейса с улучшением навигации и структуры.'],
    ['Landing + Ads', 70000, 'Landing', 'Лендинг под рекламный трафик с аналитикой и вариантами страниц.'],
    ['B2B Каталог', 145000, 'Store', 'Каталог услуг или товаров с фильтрами и формой заявки.'],
    ['Brand Platform', 210000, 'Brand', 'Имиджевый сайт с контентной стратегией и визуальной системой.'],
    ['SEO + Контент', 68000, 'Support', 'Обновление контента и развитие структуры страниц.'],
    ['Техническая поддержка', 55000, 'Support', 'Обновления, исправления и сопровождение сайта.'],
  ].map(([name, price, category, description], index) => ({ id: index + 1, name, price, category, description }));
  const portfolio = [
    ['OPTIC LAB', 'opitclab.webp', 2, 'Демонстрация страницы сети салонов оптики.'],
    ['Ragaza', 'ragaza.webp', 1, 'Демонстрация промо-сайта с презентацией проектов.'],
    ['ST Logistic', 'Stllogistik.webp', 2, 'Демонстрация сайта транспортной компании.'],
    ['Dealer Cars', 'image 6.webp', 3, 'Демонстрация каталога автомобилей.'],
  ].map(([title, image, service_id, description], index) => ({ id: index + 1, title, image_url: `assets/img/${image}`, service_id, description }));
  const clone = value => JSON.parse(JSON.stringify(value));
  const failure = (message, status = 400) => Object.assign(new Error(message), { status });
  function initialState() {
    const created_at = '2026-01-12T10:00:00.000Z';
    const applications = ['new', 'work', 'done'].map((status, index) => ({
      id: index + 1, user_id: 1, login: 'demo.client', service_id: index + 1, status,
      client_application_number: index + 1, contact_name: 'Демо-клиент', contact_email: 'client@example.com',
      contact_phone: '+7 (000) 000 00 00', comment: 'Тестовая заявка для знакомства с интерфейсом.',
      final_price: index ? 95000 : null, admin_note: index ? 'Пример согласованной оценки проекта.' : null,
      created_at, updated_at: created_at, status_updated_at: created_at,
    }));
    return clone({ version: 1, services, portfolio, applications, history: applications.map(row => ({
      id: row.id, application_id: row.id, old_status: null, new_status: row.status,
      changed_by_login: 'demo.client', changed_at: created_at,
    })) });
  }
  function createStore(storage) {
    function read() {
      let raw;
      try { raw = storage.getItem(KEY); } catch (_) { throw failure('Браузер запретил локальное хранилище. Разрешите его для демо.'); }
      if (!raw) return initialState();
      try {
        const state = JSON.parse(raw);
        if (state.version !== 1 || !['services', 'portfolio', 'applications', 'history'].every(key => Array.isArray(state[key]))) throw new Error();
        return state;
      } catch (_) { throw failure('Демо-данные повреждены. Нажмите «Сбросить демо».'); }
    }
    function save(state) {
      try { storage.setItem(KEY, JSON.stringify(state)); }
      catch (_) { throw failure('Не удалось сохранить демо. Проверьте доступное место и разрешения браузера.'); }
    }
    function reset() { storage.removeItem(KEY); }
    function request(path, options = {}, user) {
      const url = new URL(path, 'https://demo.invalid');
      const [resource, rawId, action] = url.pathname.split('/').filter(Boolean);
      const method = options.method || 'GET';
      const id = rawId ? Number(rawId) : null;
      const body = options.body || {};
      const state = read();
      const collection = state[resource];
      if (!['services', 'portfolio', 'applications'].includes(resource)) throw failure('Операция недоступна в демо.', 404);
      if (resource === 'applications' && !user) throw failure('Unauthorized', 401);
      if (method !== 'GET' && !(resource === 'applications' && method === 'POST') && user?.role !== 'admin') throw failure('Admin access required', 403);
      const row = id ? collection.find(item => item.id === id) : null;
      if (id && !row) throw failure('Запись не найдена.', 404);
      if (resource === 'applications' && row && user.role !== 'admin' && row.user_id !== user.id) throw failure('forbidden', 403);
      const hydrate = item => ({ ...item, service_name: state.services.find(service => service.id === item.service_id)?.name || 'Услуга удалена' });
      if (method === 'GET') {
        if (action === 'history') return clone(state.history.filter(item => item.application_id === id));
        if (row) return clone(row);
        let rows = collection;
        if (resource === 'services') {
          const search = (url.searchParams.get('search') || '').toLowerCase();
          const category = url.searchParams.get('category');
          rows = rows.filter(item => (!category || item.category === category)
            && `${item.name} ${item.description}`.toLowerCase().includes(search)
            && (!url.searchParams.has('minPrice') || item.price >= Number(url.searchParams.get('minPrice')))
            && (!url.searchParams.has('maxPrice') || item.price <= Number(url.searchParams.get('maxPrice'))));
        }
        if (resource === 'applications') rows = rows.filter(item => (user.role === 'admin' || item.user_id === user.id)
          && (!url.searchParams.get('status') || item.status === url.searchParams.get('status')));
        return clone(rows.map(hydrate).sort((a, b) => b.id - a.id));
      }
      if (method === 'POST' && resource === 'applications') {
        if (!state.services.some(service => service.id === Number(body.service_id))) throw failure('service not found', 404);
        if (collection.length >= 50) throw failure('Лимит демо — 50 заявок. Сбросьте демо, чтобы начать заново.');
        const now = new Date().toISOString();
        const created = { id: Math.max(0, ...collection.map(item => item.id)) + 1, user_id: user.id,
          login: user.login, service_id: Number(body.service_id), status: 'new',
          client_application_number: collection.filter(item => item.user_id === user.id).length + 1,
          contact_name: 'Демо-клиент', contact_email: 'client@example.com', contact_phone: '+7 (000) 000 00 00',
          comment: String(body.comment || '').slice(0, 4000), final_price: null, admin_note: null,
          created_at: now, updated_at: now, status_updated_at: now };
        collection.push(created);
        state.history.push({ id: state.history.length + 1, application_id: created.id, old_status: null,
          new_status: 'new', changed_by_login: user.login, changed_at: now });
        save(state); // One write commits the application and its initial history together.
        return clone(created);
      }
      if (resource === 'applications' && method === 'PATCH' && action === 'status') {
        if (!['new', 'work', 'done'].includes(body.status)) throw failure('Недопустимый статус.');
        const rawPrice = Object.hasOwn(body, 'final_price') ? body.final_price : row.final_price;
        const price = rawPrice === null || rawPrice === '' ? null : Number(rawPrice);
        if (price !== null && (!Number.isFinite(price) || price <= 0 || price > 999999999.99)) throw failure('final_price must be a positive number');
        if (String(body.admin_note || '').length > 1000) throw failure('admin_note must contain at most 1000 characters');
        const now = new Date().toISOString();
        if (row.status !== body.status) {
          state.history.push({ id: state.history.length + 1, application_id: id, old_status: row.status,
            new_status: body.status, changed_by_login: user.login, changed_at: now });
          row.status_updated_at = now;
        }
        Object.assign(row, { status: body.status, final_price: price, admin_note: Object.hasOwn(body, 'admin_note') ? body.admin_note || null : row.admin_note, updated_at: now });
        save(state);
        return clone(row);
      }
      if (resource !== 'applications' && ['POST', 'PUT', 'DELETE'].includes(method)) {
        if (method !== 'POST' && !row) throw failure('Запись не найдена.', 404);
        if (method === 'DELETE') {
          if (resource === 'services' && state.applications.some(item => item.service_id === id)) throw failure('Услуга связана с заявками.', 409);
          state[resource] = collection.filter(item => item.id !== id);
          if (resource === 'services') state.portfolio.forEach(item => { if (item.service_id === id) item.service_id = null; });
          save(state);
          return { success: true, id };
        }
        if (collection.length >= 100 && method === 'POST') throw failure('Лимит демо — 100 записей. Сбросьте демо.');
        let record;
        if (resource === 'services') {
          const price = Number(body.price);
          if (!Number.isFinite(price) || price <= 0 || price > 99999999.99) throw failure('Некорректная цена.');
          if (!['Landing', 'Corporate', 'Store', 'Design', 'Brand', 'Support'].includes(body.category)) throw failure('Некорректная категория.');
          if (String(body.name || '').trim().length < 3 || String(body.description || '').trim().length < 10) throw failure('Заполните название и описание услуги.');
          record = { name: String(body.name).trim().slice(0, 255), description: String(body.description).trim().slice(0, 2000), price, category: body.category };
        } else {
          if (String(body.title || '').trim().length < 2 || String(body.description || '').trim().length < 10) throw failure('Заполните название и описание кейса.');
          if (!/^\/?assets\/img\/[\w ./-]+\.(webp|png|jpg|svg)$/i.test(body.image_url || '')) throw failure('В демо используйте локальное изображение assets/img/*.webp.');
          const serviceId = body.service_id ? Number(body.service_id) : null;
          if (serviceId && !state.services.some(item => item.id === serviceId)) throw failure('service not found', 404);
          record = { title: String(body.title).trim().slice(0, 255), description: String(body.description).trim().slice(0, 2000), image_url: String(body.image_url).replace(/^\//, ''), service_id: serviceId };
        }
        record.id = row?.id || Math.max(0, ...collection.map(item => item.id)) + 1;
        if (row) Object.assign(row, record); else collection.push(record);
        save(state);
        return clone(record);
      }
      throw failure('Операция недоступна в демо.', 404);
    }
    return { request, reset };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createStore, KEY };
  else root.WebHiveDemo = { createStore };
})(typeof window !== 'undefined' ? window : globalThis);
