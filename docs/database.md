# База данных проекта WebHive

## Технология

Проект использует PostgreSQL. Подключение backend выполняется через пакет `pg`, SQL-запросы параметризованы.

## SQL-файлы

- `database/schema.sql` — типы, таблицы, внешние ключи, индексы и комментарии.
- `database/seed.sql` — тестовые пользователи, услуги, кейсы, заявки и начальная история статусов.

Файлы применяются штатным скриптом `./up.sh` или вручную через `psql`.

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
