# База данных проекта WebHive

## Технология

Проект использует PostgreSQL. Подключение backend выполняется через пакет `pg`, SQL-запросы параметризованы.

## SQL-файлы

- `database/schema.sql` — типы, таблицы, внешние ключи, индексы и комментарии.
- `database/seed.sql` — только примеры услуг и кейсов; аккаунты, пароли и заявки не создаются.

Файлы применяются явно: `npm --prefix backend run db:setup` или вручную через `psql`. `./up.sh` запускает автономное демо и не меняет БД.

## Таблицы

| Таблица | Назначение |
| --- | --- |
| `users` | Пользователи и роли `user` / `admin` |
| `services` | Каталог услуг веб-студии |
| `portfolio` | Кейсы, связанные с услугами |
| `applications` | Заявки клиентов |
| `application_status_history` | История изменения статусов заявок |

## Связи

- `users` 1:M `applications`
- `services` 1:M `applications`
- `services` 1:M `portfolio`
- `applications` 1:M `application_status_history`
- `users` 1:M `application_status_history` через автора изменения

## Запуск

```bash
psql -U postgres -d webstudio -f database/schema.sql
psql -U postgres -d webstudio -f database/seed.sql
```
