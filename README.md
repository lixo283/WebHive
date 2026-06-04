# WebHive (Node.js + PostgreSQL + Vanilla JS)

Учебный веб-сервис студии с каталогом услуг, заявками, личным кабинетом и административной панелью.

Стек проекта:

- Frontend: HTML5, CSS3, Vanilla JS (`fetch`, `async/await`)
- Backend: Node.js + Express
- Database: PostgreSQL

## Структура

```text
pm05/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── db/
│   ├── package.json
│   └── .env.example
├── database/
│   ├── schema.sql
│   └── seed.sql
├── frontend/
│   ├── index.html
│   ├── catalog.html
│   ├── service.html
│   ├── portfolio.html
│   ├── login.html
│   ├── register.html
│   ├── cabinet.html
│   ├── admin.html
│   └── assets/
│       ├── css/style.css
│       ├── js/main.js
│       └── img/
└── docs/
```

## Быстрый запуск (одной командой)

В корне проекта:

```bash
./up.sh
```

Что делает скрипт:

1. Проверяет `node`, `npm`, `psql`.
2. Создает `backend/.env` (если его нет).
3. Генерирует локальный `JWT_SECRET`, если секрет отсутствует или небезопасен.
4. Устанавливает зависимости backend (если нет `node_modules`).
5. Проверяет подключение к PostgreSQL.
6. Создает БД `webstudio` (если отсутствует).
7. Применяет `database/schema.sql` и `database/seed.sql`.
8. Запускает backend (`npm run dev`).



## Ручной запуск (если нужен)

```bash
cd backend
npm install
cp .env.example .env
```

Замените `JWT_SECRET` в `backend/.env` на случайную строку длиной от 32 символов, затем примените SQL-файлы:

```bash
psql -U postgres -d webstudio -f ../database/schema.sql
psql -U postgres -d webstudio -f ../database/seed.sql
npm run dev
```

## API

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Services
- `GET /api/services`
- `GET /api/services/:id`
- `POST /api/services` (admin)
- `PUT /api/services/:id` (admin)
- `DELETE /api/services/:id` (admin)

### Portfolio
- `GET /api/portfolio`
- `POST /api/portfolio` (admin)
- `PUT /api/portfolio/:id` (admin)
- `DELETE /api/portfolio/:id` (admin)

### Applications
- `POST /api/applications` (auth)
- `GET /api/applications` (auth, для admin поддерживает `?status=new|work|done`)
- `GET /api/applications/:id/history` (auth)
- `PATCH /api/applications/:id/status` (admin)
