\set ON_ERROR_STOP on

BEGIN;

-- Начальные данные нужны для демонстрации проекта после первого запуска.
INSERT INTO users (login, password_hash, role)
VALUES
  ('lixo', '$2a$10$N4XnycOY9hH8eicjTZNyI.UIJHOhN2KRQv0C.LFdaKG329SA0hya2', 'admin'),
  ('client1', '$2a$10$DVBHhWMXGLIgAFak/nWj3OOqHkuBNDWDdUD/tgSKwUzy73Zz9SZQ6', 'user'),
  ('client2', '$2a$10$DVBHhWMXGLIgAFak/nWj3OOqHkuBNDWDdUD/tgSKwUzy73Zz9SZQ6', 'user')
ON CONFLICT (login) DO NOTHING;

UPDATE users
SET login = 'lixo'
WHERE login = 'admin'
  AND NOT EXISTS (SELECT 1 FROM users WHERE login = 'lixo');

UPDATE users
SET password_hash = '$2a$10$N4XnycOY9hH8eicjTZNyI.UIJHOhN2KRQv0C.LFdaKG329SA0hya2',
    role = 'admin'
WHERE login = 'lixo';

UPDATE users
SET password_hash = '$2a$10$dpY7FojYKxlglaR2uRP.sO9Eg205h0dnnCR4lvQg9gcABQEA32Vbu'
WHERE login IN ('client1', 'client2');

-- Seed-услуги заполняются через WHERE NOT EXISTS, чтобы повторный запуск не создавал дубли.
INSERT INTO services (name, price, category, description)
SELECT 'Landing Page', 45000.00, 'Landing', 'Конверсионный лендинг с формой заявки и CTA блоками.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Landing Page');

INSERT INTO services (name, price, category, description)
SELECT 'Корпоративный сайт', 85000.00, 'Corporate', 'Многостраничный сайт компании с услугами и кейсами.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Корпоративный сайт');

INSERT INTO services (name, price, category, description)
SELECT 'Интернет-магазин', 120000.00, 'Store', 'Каталог, фильтрация, карточка товара и форма заказа.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Интернет-магазин');

INSERT INTO services (name, price, category, description)
SELECT 'UI/UX Redesign', 60000.00, 'Design', 'Редизайн интерфейса с улучшением UX и структуры.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'UI/UX Redesign');

INSERT INTO services (name, price, category, description)
SELECT 'Landing + Ads', 70000.00, 'Landing', 'Лендинг под рекламный трафик с аналитикой и сплит-тестами.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Landing + Ads');

INSERT INTO services (name, price, category, description)
SELECT 'B2B Каталог', 145000.00, 'Store', 'Каталог услуг или товаров с фильтрами, квизом и лид-формами.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'B2B Каталог');

INSERT INTO services (name, price, category, description)
SELECT 'Brand Platform', 210000.00, 'Brand', 'Имиджевый корпоративный сайт с контентной стратегией и сильным визуалом.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Brand Platform');

INSERT INTO services (name, price, category, description)
SELECT 'SEO + Контент', 68000.00, 'Support', 'Контентный апдейт, SEO-поддержка и развитие структуры страниц.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'SEO + Контент');

INSERT INTO services (name, price, category, description)
SELECT 'Техническая поддержка', 55000.00, 'Support', 'Ежемесячные обновления, исправления и улучшение конверсии по данным аналитики.'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Техническая поддержка');

-- Seed-портфолио связывается с услугами по названию, а не по жестко заданным id.
INSERT INTO portfolio (title, image_url, service_id, description)
SELECT
  'Fintech Dashboard',
  '/assets/img/opitclab.webp',
  (SELECT id FROM services WHERE name = 'Корпоративный сайт'),
  'Дашборд для финансового сервиса с акцентом на аналитику.'
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Fintech Dashboard');

INSERT INTO portfolio (title, image_url, service_id, description)
SELECT
  'Medical Landing',
  '/assets/img/ragaza.webp',
  (SELECT id FROM services WHERE name = 'Landing Page'),
  'Landing для медицинской компании с формой обращения.'
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Medical Landing');

INSERT INTO portfolio (title, image_url, service_id, description)
SELECT
  'Store Redesign',
  '/assets/img/Stllogistik.webp',
  (SELECT id FROM services WHERE name = 'UI/UX Redesign'),
  'Редизайн e-commerce интерфейса и пользовательского пути.'
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Store Redesign');

UPDATE portfolio
SET image_url = CASE title
  WHEN 'Fintech Dashboard' THEN '/assets/img/opitclab.webp'
  WHEN 'Medical Landing' THEN '/assets/img/ragaza.webp'
  WHEN 'Store Redesign' THEN '/assets/img/Stllogistik.webp'
END
WHERE title IN ('Fintech Dashboard', 'Medical Landing', 'Store Redesign');

-- Seed-заявки показывают разные статусы и заполняют контактные поля.
INSERT INTO applications (user_id, service_id, status, contact_name, contact_email, contact_phone, comment)
SELECT
  (SELECT id FROM users WHERE login = 'client1'),
  (SELECT id FROM services WHERE name = 'Landing Page'),
  'new',
  'Иван Петров',
  'client1@example.com',
  '+7 900 111-22-33',
  'Нужен лендинг для запуска рекламной кампании.'
WHERE NOT EXISTS (
  SELECT 1 FROM applications
  WHERE user_id = (SELECT id FROM users WHERE login = 'client1')
    AND service_id = (SELECT id FROM services WHERE name = 'Landing Page')
);

INSERT INTO applications (user_id, service_id, status, contact_name, contact_email, contact_phone, comment)
SELECT
  (SELECT id FROM users WHERE login = 'client1'),
  (SELECT id FROM services WHERE name = 'UI/UX Redesign'),
  'work',
  'Иван Петров',
  'client1@example.com',
  '+7 900 111-22-33',
  'Хотим обновить дизайн личного кабинета и форму заявки.'
WHERE NOT EXISTS (
  SELECT 1 FROM applications
  WHERE user_id = (SELECT id FROM users WHERE login = 'client1')
    AND service_id = (SELECT id FROM services WHERE name = 'UI/UX Redesign')
);

INSERT INTO applications (user_id, service_id, status, contact_name, contact_email, contact_phone, comment)
SELECT
  (SELECT id FROM users WHERE login = 'client2'),
  (SELECT id FROM services WHERE name = 'Корпоративный сайт'),
  'done',
  'Мария Смирнова',
  'client2@example.com',
  '+7 900 222-33-44',
  'Нужен корпоративный сайт с разделами услуг и портфолио.'
WHERE NOT EXISTS (
  SELECT 1 FROM applications
  WHERE user_id = (SELECT id FROM users WHERE login = 'client2')
    AND service_id = (SELECT id FROM services WHERE name = 'Корпоративный сайт')
);

-- Для каждой seed-заявки создается начальная запись истории статуса.
INSERT INTO application_status_history (application_id, old_status, new_status, changed_by_user_id, changed_at)
SELECT
  a.id,
  NULL,
  a.status,
  a.user_id,
  a.created_at
FROM applications a
WHERE NOT EXISTS (
  SELECT 1
  FROM application_status_history h
  WHERE h.application_id = a.id
);

COMMIT;
