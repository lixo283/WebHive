# Публикация WebHive

## GitHub Pages: рекомендуемый вариант для просмотра портфолио

Демо работает целиком в браузере. Каждый посетитель получает собственное состояние, роли переключаются без паролей. Live backend и PostgreSQL для этого не нужны.

1. Отправьте проверенные исходники в `main` репозитория `lixo283/WebHive`.
2. Откройте **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Дождитесь успешного workflow **Checks**.
4. В **Actions → Publish portfolio demo → Run workflow** выберите `main`.
5. После успешной публикации возьмите адрес из результата deploy-job. Для стандартного project site ожидается `https://lixo283.github.io/WebHive/`.
6. В GitHub **About → Website** укажите опубликованное демо. Описание репозитория: `Web studio CRM demo: Vanilla JS, Express, PostgreSQL, client requests and admin estimates`.

До выполнения этих шагов ссылка на Pages не считается опубликованной. Workflow подготовлен локально; сам по себе файл не включает Pages в настройках репозитория.

Публикуется исключительно `dist/`, собранная из browser assets. Нельзя указывать корень репозитория как каталог публикации: там backend и SQL. На другом статическом хостинге используйте команду `node scripts/build-demo.js` и output directory `dist`.

Официальная инструкция: [GitHub Pages с собственным workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Live: Node.js + PostgreSQL

Существующая ссылка проекта: [WebHive на Render](https://webhive.onrender.com). Доступность и конфигурация этого внешнего сервиса не подтверждены локальными тестами.

Для нового сервиса:

- Root directory: корень репозитория.
- Build command: `npm ci --prefix backend --omit=dev`.
- Start command: `npm --prefix backend start`.
- Runtime: Node.js 22 или новее; используйте поддерживаемую LTS-версию.
- Environment: `WEBHIVE_MODE=live`, `NODE_ENV=production`, `DATABASE_URL`, случайный `JWT_SECRET` длиной минимум 32 символа.
- `PORT` предоставляет хостинг.
- Health check: `/api/ready`, чтобы проверять доступность БД, а не только процесса.
- Frontend и API обслуживаются одним origin. Для обычного запуска `CORS_ORIGIN` не требуется.
- `TRUST_PROXY_HOPS=1` задавайте только если перед приложением действительно один доверенный reverse proxy. Ошибочная настройка влияет на IP rate limiting.

До запуска явно примените `database/schema.sql` и `database/seed.sql` через `psql` к целевой БД (или `npm --prefix backend run db:setup` в окружении с `psql`). Используйте TLS и параметры подключения, которые требует провайдер PostgreSQL. Приложение не отключает проверку сертификатов.

Создайте собственный аккаунт и назначьте администратора через `admin:promote`. Не публикуйте административные пароли и не открывайте общую live-админку посетителям портфолио — для этого есть изолированное демо.

## Обновление старой учебной базы

Старый seed создавал учебные аккаунты с фиксированными хешами и перезаписывал их при старте. Новый seed этого не делает, но **существующие аккаунты он не удаляет и пароли не меняет**.

Перед использованием старой БД на публичном live-сервисе проверьте её аккаунты и роли, замените старые учебные учётные данные или создайте новую БД. Для отзыва ранее выданных JWT смените `JWT_SECRET` в настройках сервера. Это отдельная операция владельца окружения; локальная подготовка портфолио не меняет удалённую БД.
