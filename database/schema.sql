\set ON_ERROR_STOP on

BEGIN;

-- Перечисление ролей пользователей: обычный клиент или администратор.
DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Перечисление статусов заявки: новая, в работе, выполнена.
DO $$
BEGIN
  CREATE TYPE app_status AS ENUM ('new', 'work', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE user_role IS 'Роль пользователя в системе: user или admin.';
COMMENT ON TYPE app_status IS 'Статус жизненного цикла заявки: new, work, done.';

-- Пользователи системы. Пароль хранится только как bcrypt-хеш.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Каталог услуг веб-студии.
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Работы портфолио. Каждая работа может быть связана с одной услугой.
CREATE TABLE IF NOT EXISTS portfolio (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  service_id INT REFERENCES services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Заявки клиентов. Центральная таблица, связывает пользователя и выбранную услугу.
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  status app_status NOT NULL DEFAULT 'new',
  contact_name VARCHAR(120),
  contact_email VARCHAR(120),
  contact_phone VARCHAR(32),
  comment TEXT,
  status_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- История изменений статусов заявок для аудита действий пользователя или администратора.
CREATE TABLE IF NOT EXISTS application_status_history (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  old_status app_status,
  new_status app_status NOT NULL,
  changed_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы ускоряют просмотр истории конкретной заявки и сортировку по времени изменения.
CREATE INDEX IF NOT EXISTS idx_app_status_history_application_id
  ON application_status_history (application_id);

CREATE INDEX IF NOT EXISTS idx_app_status_history_changed_at
  ON application_status_history (changed_at DESC);

COMMENT ON TABLE users IS 'Пользователи веб-сервиса: клиенты и администраторы.';
COMMENT ON COLUMN users.id IS 'Первичный ключ пользователя.';
COMMENT ON COLUMN users.login IS 'Уникальный логин пользователя для входа.';
COMMENT ON COLUMN users.password_hash IS 'Хеш пароля, исходный пароль в базе не хранится.';
COMMENT ON COLUMN users.role IS 'Роль пользователя: user или admin.';
COMMENT ON COLUMN users.created_at IS 'Дата и время создания учетной записи.';

COMMENT ON TABLE services IS 'Справочник услуг веб-студии.';
COMMENT ON COLUMN services.id IS 'Первичный ключ услуги.';
COMMENT ON COLUMN services.name IS 'Название услуги.';
COMMENT ON COLUMN services.price IS 'Стоимость услуги.';
COMMENT ON COLUMN services.category IS 'Категория услуги для фильтрации в каталоге.';
COMMENT ON COLUMN services.description IS 'Описание услуги для страницы каталога.';
COMMENT ON COLUMN services.created_at IS 'Дата и время добавления услуги.';

COMMENT ON TABLE portfolio IS 'Портфолио выполненных или демонстрационных работ студии.';
COMMENT ON COLUMN portfolio.id IS 'Первичный ключ записи портфолио.';
COMMENT ON COLUMN portfolio.title IS 'Название кейса в портфолио.';
COMMENT ON COLUMN portfolio.image_url IS 'Путь к изображению кейса.';
COMMENT ON COLUMN portfolio.service_id IS 'Внешний ключ на услугу; при удалении услуги значение становится NULL.';
COMMENT ON COLUMN portfolio.description IS 'Описание кейса.';
COMMENT ON COLUMN portfolio.created_at IS 'Дата и время добавления кейса.';

COMMENT ON TABLE applications IS 'Заявки клиентов на услуги веб-студии.';
COMMENT ON COLUMN applications.id IS 'Первичный ключ заявки.';
COMMENT ON COLUMN applications.user_id IS 'Внешний ключ на автора заявки; при удалении пользователя удаляются его заявки.';
COMMENT ON COLUMN applications.service_id IS 'Внешний ключ на выбранную услугу; услугу нельзя удалить, если на нее есть заявки.';
COMMENT ON COLUMN applications.status IS 'Текущий статус заявки: new, work или done.';
COMMENT ON COLUMN applications.contact_name IS 'Контактное имя клиента.';
COMMENT ON COLUMN applications.contact_email IS 'Контактная электронная почта клиента.';
COMMENT ON COLUMN applications.contact_phone IS 'Контактный телефон клиента.';
COMMENT ON COLUMN applications.comment IS 'Комментарий клиента к заявке.';
COMMENT ON COLUMN applications.status_updated_at IS 'Дата и время последнего изменения статуса.';
COMMENT ON COLUMN applications.updated_at IS 'Дата и время последнего обновления заявки.';
COMMENT ON COLUMN applications.created_at IS 'Дата и время создания заявки.';

COMMENT ON TABLE application_status_history IS 'Журнал изменения статусов заявок.';
COMMENT ON COLUMN application_status_history.id IS 'Первичный ключ записи истории.';
COMMENT ON COLUMN application_status_history.application_id IS 'Внешний ключ на заявку; история удаляется вместе с заявкой.';
COMMENT ON COLUMN application_status_history.old_status IS 'Предыдущий статус заявки; NULL при создании заявки.';
COMMENT ON COLUMN application_status_history.new_status IS 'Новый статус заявки.';
COMMENT ON COLUMN application_status_history.changed_by_user_id IS 'Пользователь, который изменил статус; при удалении пользователя значение становится NULL.';
COMMENT ON COLUMN application_status_history.changed_at IS 'Дата и время изменения статуса.';

COMMENT ON INDEX idx_app_status_history_application_id IS 'Индекс для быстрого получения истории одной заявки.';
COMMENT ON INDEX idx_app_status_history_changed_at IS 'Индекс для сортировки истории по дате изменения.';


COMMIT;
