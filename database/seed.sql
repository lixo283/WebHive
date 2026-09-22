\set ON_ERROR_STOP on
BEGIN;

-- Public sample content only. Accounts are created separately.
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


COMMIT;
