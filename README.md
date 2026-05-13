# WebHive (Node.js + PostgreSQL + Vanilla JS)

Проект переписан под новый стек:

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
│   ├── schema.sql
│   ├── package.json
│   └── .env.example
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
3. Устанавливает зависимости backend (если нет `node_modules`).
4. Проверяет подключение к PostgreSQL.
5. Создает БД `webstudio` (если отсутствует).
6. Применяет `backend/schema.sql`.
7. Запускает backend (`npm run dev`).

После запуска сайт доступен по адресу:

- `http://localhost:3000`

## Ручной запуск (если нужен)

```bash
cd backend
npm install
cp .env.example .env
psql -U postgres -d webstudio -f schema.sql
npm run dev
```

## API

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

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
- `GET /api/applications` (auth)
- `PATCH /api/applications/:id/status` (admin)

## Seed users

После применения `schema.sql` создаются пользователи:

- admin
- client1
- client2

Пароль seed-пользователей: `password`
