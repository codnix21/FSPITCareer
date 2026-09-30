# FSP IT Career

Русскоязычная платформа **обратного подбора** IT-специалистов с подтверждёнными достижениями Федерации спортивного программирования (ФСП).

> Работодатель формирует требования → система находит подходящих специалистов → работодатель отправляет предложение → кандидат принимает или отклоняет.

## Архитектура

```text
apps/
  web/          — Next.js (UI, русский интерфейс)
  api/          — NestJS + Prisma (REST API, JWT, matching)
  ml-service/   — FastAPI (семантический matching, mock готов к ML)
packages/
  shared/       — общие константы
  types/        — общие типы
infra/
  nginx/        — reverse proxy
docs/           — документация
```

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | NestJS, Prisma, PostgreSQL, JWT, bcrypt, Swagger |
| ML | FastAPI, deterministic mock → sentence-transformers + pgvector |
| Infra | Docker Compose, Nginx, Redis |

## Быстрый старт (Docker)

```bash
cp .env.example .env
# Обязательно задайте сильные POSTGRES_PASSWORD и JWT_SECRET (32+ символов)
docker compose up -d --build
```

После запуска:

| Сервис | URL |
|--------|-----|
| Приложение (Nginx) | http://localhost |
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api |
| Health | http://localhost:3001/api/health |
| Swagger | только если `SWAGGER_ENABLED=true` |
| ML service | http://localhost:8000/docs |

Для первичного наполнения локальной БД: `SEED_ON_START=true` в `.env` **или** вручную `npm run prisma:seed -w apps/api`. В production seed при старте **выключен**.

## Локальная разработка

### 1. База данных

```bash
docker compose up -d postgres redis ml-service
```

### 2. Backend

```bash
cp .env.example .env
# DATABASE_URL=...@localhost:5432/...
# NODE_ENV=development
# SWAGGER_ENABLED=true

cd apps/api
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

### 3. Frontend

```bash
cd apps/web
npm install
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev
```

## Аккаунты после seed (только локально)

| Роль | Email | Пароль |
|------|-------|--------|
| Работодатель | employer@fsp-career.ru | Demo123! |
| Соискатель | candidate@fsp-career.ru | Demo123! |
| Администратор | admin@fsp-career.ru | Demo123! |

Не публикуйте эти учётки в UI продукта. Пароли в БД — только bcrypt.

## Production checklist

- [ ] `NODE_ENV=production`
- [ ] Уникальные `JWT_SECRET` и `POSTGRES_PASSWORD`
- [ ] `SEED_ON_START=false`, `SWAGGER_ENABLED=false`
- [ ] `CORS_ORIGIN` только на домены продукта
- [ ] TLS на reverse proxy (Nginx/Ingress)
- [ ] Бэкапы Postgres и том `uploads`
- [ ] Мониторинг `/api/health`

## Главный сценарий продукта

1. Зарегистрировать работодателя → онбординг компании → вакансия
2. **Поиск** по требованиям → открыть профиль → отправить предложение
3. Соискатель принимает или отклоняет в кабинете

### Реализовано

- Онбординг соискателя и работодателя
- Полный профиль кандидата, резюме с применением к профилю
- Профиль компании и публичная страница `/companies/:id`
- Тесты компетенций, уведомления, офферы
- Matching + semantic blend, Redis rate limit
- Админ: пользователи, CSV, закрытие вакансий
- Настройки аккаунта, восстановление пароля (UI), legal pages
- Security headers, Helmet, healthcheck, fail-fast JWT в prod
- Поиск по вакансии, редактирование вакансий, грейды/статусы на русском

## Matching

Веса:

- roleMatch 25%
- skillsMatch 30%
- experienceMatch 15%
- gradeMatch 10%
- salaryMatch 10%
- workFormatMatch 5%
- fspMatch 5%

Показатель означает соответствие требованиям вакансии, а не «ценность» человека.

## Интеграции

- ФСП: `GET /api/fsp/participants/:id` — синхронизация достижений в профиль
- ML: semantic matching через `ML_SERVICE_URL` с fallback при недоступности

## Основные URL UI

- `/` — лендинг
- `/login`, `/register`, `/forgot-password`
- `/privacy`, `/terms`, `/support`
- `/employer/*`, `/candidate/*`, `/admin`
- `/vacancies`, `/specialists`

## API (кратко)

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/change-password`
- `GET/PUT /api/candidates/:id`
- `GET/POST/PUT /api/vacancies`
- `POST /api/matching/search`
- `POST/GET/PATCH /api/offers`
- `POST /api/resumes/upload`, `POST /api/resumes/:id/analyze`, `POST /api/resumes/:id/apply`

Документация Swagger: `/api/docs` (если включена).

## Переменные окружения

См. `.env.example`. Критичные: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `ML_SERVICE_URL`.

## Тесты

```bash
cd apps/api && npm test
cd apps/web && npm test
# E2E при живом API + seed:
cd apps/api
set E2E_DATABASE_URL=1
set E2E_API_URL=http://localhost:3001/api
npm run test:e2e
```

## Deployment

`docker compose up -d --build` после заполнения `.env`. См. также `docs/deployment.md`.

## Troubleshooting

**API не стартует** — проверьте `DATABASE_URL`, `JWT_SECRET` (32+), `docker compose ps`.

**Frontend не видит API** — `NEXT_PUBLIC_API_URL` должен указывать на доступный backend.

**Пустые списки локально** — `npm run prisma:seed -w apps/api`.

## Ограничения текущей версии

- Парсер резюме и semantic ML работают по встроенным правилам; готовы к замене на LLM / sentence-transformers.
- Письма (восстановление пароля, офферы) — UI/очередь; внешний SMTP подключается отдельно.
- TLS и managed secrets — на стороне инфраструктуры деплоя.
