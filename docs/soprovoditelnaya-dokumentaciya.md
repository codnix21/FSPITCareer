# Сопроводительная документация решения  
## FSP IT Career — платформа обратного подбора IT-специалистов

Документ закрывает обязательные требования к сопроводительной документации.

| Требование | Раздел |
|---|---|
| Функциональная и компонентная архитектура | §1 |
| Механика тестирования кандидатов и устойчивость к распространению заданий | §2 |
| Механика подбора и логика категоризации | §3 |
| Процедура валидации и результаты | §4 |
| Схема интеграции с реестром ФСП | §5 |
| Описание API | §6 |
| Библиотеки и компоненты с версиями | §7 |
| Сборка, развёртывание и локальный запуск | §8 |

Дополнительно: `docs/architecture.md`, `docs/api.md`, `docs/assessment-engine.md`, `docs/categorization.md`, `docs/deployment.md`, `docs/final-production-audit.md`.

---

## 1. Функциональная и компонентная архитектура

### 1.1. Назначение

Платформа **обратного подбора**: работодатель задаёт требования к вакансии, система подбирает кандидатов с подтверждённым уровнем, работодатель отправляет предложение или рассматривает отклик. Контакты кандидата открываются только по правилам доступа.

### 1.2. Компонентная схема

```text
                    ┌─────────────┐
                    │   Браузер   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │  :80  (/ → web, /api → backend)
                    └──────┬──────┘
              ┌────────────┼────────────┐
              ▼                         ▼
     ┌────────────────┐       ┌─────────────────┐
     │ Next.js 15 web │:3000  │ NestJS API      │:3001
     │ React 19       │       │ JWT + RBAC      │
     └────────────────┘       └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
     ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
     │ PostgreSQL 16  │      │ Redis 7        │      │ FastAPI ML     │:8000
     │ Prisma ORM     │      │ rate limit     │      │ semantic match │
     └────────────────┘      └────────────────┘      └────────────────┘
```

### 1.3. Функциональные модули API

| Модуль | Функция |
|---|---|
| Auth | регистрация, вход, JWT, подтверждение email |
| Candidates / Companies / Vacancies | профили, вакансии, онбординг |
| Taxonomy | отрасль → специализация → категория |
| Assessments | основное техническое тестирование и категоризация |
| Challenges | регулярные задания (дополнительно, без смены категории) |
| Matching | взвешенный подбор + semantic blend |
| Offers | предложения со снимком зарплаты и сроком |
| Applications | самостоятельные отклики кандидатов |
| Privacy / ContactReveal | контроль раскрытия email/телефона |
| FSP | абстракция реестра достижений ФСП |
| Reference | справочники и autocomplete |
| Admin | администрирование |

### 1.4. Основной пользовательский поток

```text
Регистрация → подтверждение email → онбординг → Assessment → категория → AVAILABLE
  → matching / вакансия → оффер или отклик → раскрытие контактов
```

---

## 2. Механика тестирования кандидатов и устойчивость к распространению заданий

### 2.1. Два контура

| Контур | Роль |
|---|---|
| **Assessment** | основной механизм категоризации и допуска в `AVAILABLE` |
| **Challenge** | регулярные задания; **не** меняют категорию автоматически |

Подробности: `docs/assessment-engine.md`, `docs/challenges.md`.

### 2.2. Как устроено Assessment

1. Тест привязан к **специализации** и публикуется как `PUBLISHED`.
2. При старте backend формирует **снимок** попытки: случайная выборка вопросов по blueprint-разделам (навык, вес, число вопросов).
3. Кандидат получает вопросы **только после start**; в списке тестов банка нет.
4. Правильные ответы (`correctOptionIndexes`) **никогда** не отдаются клиенту.
5. Балл и `recommendedGrade` считает **только сервер**; клиентский score игнорируется.
6. Таймер авторитетен на backend (`expiresAt`); после истечения — `EXPIRED`.
7. После сдачи действует **cooldown** (повторный старт ограничен).
8. Пороги баллов → уровень (Intern…Senior) → категория специалиста.

### 2.3. Обоснование устойчивости к распространению заданий

Механика снижает ценность «слива» заданий на рынке:

| Мера | Эффект |
|---|---|
| Банк вопросов + случайная выборка по разделам | у разных попыток разный набор; «шпаргалка на весь банк» не совпадает 1:1 с попыткой |
| Снимок порядка/состава на попытку | нельзя заранее выучить фиксированную последовательность |
| Answer key только server-side | утечка UI/HAR не содержит правильных ответов |
| Server-side scoring | подмена баллов с клиента бесполезна |
| Cooldown между попытками | снижает массовый перебор и обмен «свежими» сессиями |
| Привязка к специализации + ownership попытки (IDOR-защита) | чужую попытку нельзя прочитать/сдать |
| Challenges без автосмены категории | слив регулярных заданий не обходит основной Assessment |

**Честное ограничение:** полный античит, прокторинг и webcam **не заявлены**. Устойчивость достигается архитектурно (рандомизация, скрытый ключ, серверный scoring, cooldown), а не биометрией.

### 2.4. Challenges (кратко)

Типы: `SINGLE_CHOICE` / `MULTIPLE_CHOICE`. Одна активная `IN_PROGRESS` на пару кандидат+задание; `maxAttempts`; истечение при обращении. Работодатель видит только сводку (название, балл, passed), без ответов.

---

## 3. Механика подбора и логика категоризации

### 3.1. Категоризация

```text
Отрасль → Специализация → Уровень (Grade) → Категория кандидата
```

Пример: `IT → Backend Development → Middle → Backend Development · Middle`.

Статусы профиля:

| Статус | Смысл |
|---|---|
| `DRAFT` | онбординг не завершён |
| `ASSESSMENT_REQUIRED` | профиль есть, тест не пройден |
| `AVAILABLE` | доступен в поиске работодателю |
| `HIDDEN` | скрыт |

`AVAILABLE` выставляется **после успешного Assessment** (не после одного онбординга).  
Подробнее: `docs/categorization.md`.

### 3.2. Matching

Формула: `score = 100 × Σ(signalᵢ × weightᵢ)`.

| Сигнал | Вес |
|---|---|
| roleMatch | 0.10 |
| specializationMatch | 0.15 |
| skillsMatch | 0.25 |
| experienceMatch | 0.15 |
| gradeMatch | 0.10 |
| salaryMatch | 0.10 |
| workFormatMatch | 0.05 |
| fspMatch | 0.05 |
| assessmentMatch | 0.05 |
| **Сумма** | **1.00** |

- расчёт на backend (`matching.engine.ts`);
- UI показывает breakdown и причины («Почему подходит»);
- semantic ML — дополнительный blend; при недоступности ML работает детерминированный fallback;
- в поиск попадают только `AVAILABLE` кандидаты;
- общее слово «developer» не даёт ложного полного совпадения несвязанных специализаций.

---

## 4. Процедура валидации решения и результаты

### 4.1. Процедура

1. **Модульные / сервисные тесты API** (Jest) — privacy, IDOR, scoring, applications, offers, challenges, FSP, matching weights.
2. **Тесты web** (Vitest) — UI-хелперы, критичные компоненты.
3. **Проверка TypeScript** (`tsc --noEmit`) для api и web.
4. **Сборка** NestJS и Next.js.
5. **Миграции Prisma** — цепочка deploy на чистой БД.
6. **Seed + целостность** — каждый `AVAILABLE` имеет verified email, specialization, category, recommendedGrade, PASSED Assessment.
7. **Ручной smoke** — логин демо-аккаунтов, тест, matching, отклик/оффер, challenges.
8. **Docker Compose** — полный стек (postgres, redis, ml, api, web, nginx).

### 4.2. Результаты (зафиксированные)

| Проверка | Результат |
|---|---|
| Backend Jest | **109/109 PASS** |
| Frontend Vitest | **34/34 PASS** |
| TypeScript | **PASS** |
| Сборка API / Web | **PASS** |
| IDOR / RBAC / privacy (по спецификациям) | **PASS** |
| MATCH_WEIGHTS сумма = 1.00 | **PASS** |
| Seed integrity AVAILABLE | **PASS** |
| Docker | зависит от окружения (daemon/proxy на машине разработчика) |

Команды:

```bash
npm test -w apps/api
npm test -w apps/web
npx tsc --noEmit -p apps/api
npx tsc --noEmit -p apps/web
```

Подробный аудит: `docs/final-production-audit.md`, матрица ТЗ: `docs/requirements-compliance.md`.

---

## 5. Схема предполагаемой интеграции с реестром ФСП

### 5.1. Абстракция

```text
FspService
    └── FspProvider (интерфейс)
            ├── LocalFspProvider   # seed / демо-данные (по умолчанию)
            └── ExternalFspProvider # HTTP к внешнему реестру
```

Выбор: `FSP_PROVIDER=local|external`, URL: `FSP_EXTERNAL_URL`.

### 5.2. Статусы провайдера

| Статус | Значение |
|---|---|
| `CONNECTED` | участник найден, данные доступны |
| `NOT_FOUND` | участник не найден |
| `UNAVAILABLE` | внешний сервис недоступен / URL не задан |

`UNAVAILABLE` **не ломает** профиль, поиск и matching: вклад ФСП в score = 0, UI показывает честную подпись (демо / недоступно).

### 5.3. Предполагаемый поток внешней интеграции

```text
1. Кандидат указывает fspParticipantId (или внешний идентификатор)
2. API → ExternalFspProvider.getStatus / getParticipant / getAchievements
3. Нормализация ответа во внутреннюю модель достижений
4. Сохранение/отображение в профиле (sourceType: FSP | DEMO)
5. Matching использует количество/наличие достижений как сигнал fspMatch
```

Эндпоинты: `GET /api/fsp/participants/:id`, синхронизация достижений в профиль.  
На демо по умолчанию работает **local**-провайдер с seed-данными (`isDemo=true`).

---

## 6. Описание API

Базовый префикс: `/api`. Swagger: `/api/docs` при `SWAGGER_ENABLED=true`.  
Защищённые методы: `Authorization: Bearer <JWT>`.

### Группы

| Группа | Примеры |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/verify-email` |
| Кандидаты | `GET/PUT /candidates/:id`, `/candidates/me`, completion |
| Компании / вакансии | `GET/POST/PUT /vacancies` |
| Matching | `POST /matching/search` |
| Offers | `POST/GET/PATCH /offers` |
| Applications | `POST /applications`, `/applications/me`, review/withdraw |
| Assessments | start / answers / submit / results/me |
| Challenges | start / answers / submit / results/me |
| FSP | `/fsp/participants/:id` |
| Reference | industries, specializations, skills, cities |
| Admin | `/admin/*` (роль ADMIN) |

Полный перечень: `docs/api.md`.

Формат ошибок — JSON с русским `message` и `statusCode`.

---

## 7. Используемые библиотеки и компоненты (версии)

Версии по `package.json` / `requirements.txt` монорепозитория (диапазоны `^` — как в манифестах).

### Платформа

| Компонент | Версия / образ |
|---|---|
| Node.js | ≥ 20 (Docker: `node:22-alpine`) |
| PostgreSQL | 16 (образ `postgres:16-alpine`) |
| Redis | 7 (образ `redis:7-alpine`) |
| Nginx | 1.27 (образ `nginx:1.27-alpine`) |
| Python (ML) | 3.12 |

### Backend (`apps/api`)

| Пакет | Версия |
|---|---|
| `@nestjs/common` / `core` / `platform-express` | ^10.4.15 |
| `@nestjs/jwt` | ^10.2.0 |
| `@nestjs/passport` | ^10.0.3 |
| `@nestjs/swagger` | ^8.1.0 |
| `@nestjs/throttler` | ^6.3.0 |
| `@nestjs/config` | ^3.3.0 |
| `@prisma/client` / `prisma` | ^6.1.0 |
| `passport-jwt` | ^4.0.1 |
| `bcrypt` | ^5.1.1 |
| `class-validator` / `class-transformer` | ^0.14.1 / ^0.5.1 |
| `helmet` | ^8.3.0 |
| `ioredis` | ^5.11.1 |
| `rxjs` | ^7.8.1 |
| `typescript` | ^5.7.2 |
| `jest` / `ts-jest` | ^29.7.0 / ^29.2.5 |

### Frontend (`apps/web`)

| Пакет | Версия |
|---|---|
| `next` | ^15.1.3 |
| `react` / `react-dom` | ^19.0.0 |
| `typescript` | ^5.7.2 |
| `tailwindcss` | ^3.4.17 |
| `vitest` | ^2.1.8 |
| `@testing-library/react` | ^16.1.0 |

### ML-сервис (`apps/ml-service`)

| Пакет | Версия |
|---|---|
| `fastapi` | 0.115.6 |
| `uvicorn[standard]` | 0.34.0 |
| `pydantic` | 2.10.4 |

Python 3.12 (образ Docker).

### Инфраструктура

Docker Compose, Prisma Migrate, JWT, Redis throttling, Helmet, ValidationPipe.

---

## 8. Пошаговая инструкция: сборка, развёртывание, локальный запуск

### 8.1. Требования

- Docker Desktop (для полного стека) **или** Node.js ≥ 20 + локальные PostgreSQL и Redis
- Git
- Для локальной разработки без Docker: Python 3.12 (опционально, для ML)

### 8.2. Запуск через Docker Compose (рекомендуется)

```bash
# 1. Клонировать репозиторий и перейти в корень
cd FSPITCareer

# 2. Создать окружение
cp .env.example .env
# Обязательно задать сильные POSTGRES_PASSWORD и JWT_SECRET (≥ 32 символа)
# Для демо-наполнения БД: SEED_ON_START=true
# Для удобства UI через nginx: NEXT_PUBLIC_API_URL=http://localhost/api

# 3. Собрать и поднять
docker compose up -d --build

# 4. Проверить
docker compose ps
curl http://localhost:3001/api/health
# или через nginx:
curl http://localhost/api/health
```

Точки входа:

| Сервис | URL |
|---|---|
| Приложение (Nginx) | http://localhost |
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api |
| Swagger | http://localhost:3001/api/docs (если `SWAGGER_ENABLED=true`) |
| ML | http://localhost:8000/docs |

Повторный seed:

```bash
docker compose exec backend npx prisma db seed
```

Демо-аккаунты (пароль для всех `Demo123!`):

- работодатель: `employer@fsp-career.ru`
- соискатель: `candidate@fsp-career.ru`
- администратор: `admin@fsp-career.ru`

### 8.3. Локальный запуск без полного Docker

```bash
# Инфраструктура
docker compose up -d postgres redis ml-service

# Зависимости монорепозитория
npm install

# API
cp .env.example .env
# DATABASE_URL=...@localhost:5432/...
# REDIS_URL=redis://localhost:6379
# NODE_ENV=development
# SWAGGER_ENABLED=true
# NEXT_PUBLIC_API_URL=http://localhost:3001/api

cd apps/api
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# Web (второй терминал)
cd apps/web
npm run dev
```

### 8.4. Сборка production-артефактов

```bash
npm run build -w apps/api
npm run build -w apps/web
```

### 8.5. Тесты

```bash
npm test -w apps/api
npm test -w apps/web
```

### 8.6. Типичные проблемы

| Симптом | Решение |
|---|---|
| `Failed to fetch` при логине | nginx не запущен или `NEXT_PUBLIC_API_URL` указывает на недоступный хост; поднять nginx или использовать `http://localhost:3001/api` |
| Backend: `Cannot find module dist/main.js` | entrypoint — `dist/src/main.js` (см. Dockerfile / compose) |
| Пустые тесты / нет специализации | выполнить `npx prisma db seed` |
| Docker Hub / proxy errors | проверить proxy Docker Desktop (`127.0.0.1:10801` и т.п.) |

---

## Приложение. Карта документации

| Файл | Содержание |
|---|---|
| `docs/soprovoditelnaya-dokumentaciya.md` | **этот документ** (обязательный комплект) |
| `docs/architecture.md` | архитектура |
| `docs/api.md` | API |
| `docs/assessment-engine.md` | тестирование |
| `docs/challenges.md` | технические задания |
| `docs/categorization.md` | категоризация |
| `docs/applications.md` | отклики |
| `docs/email-verification.md` | email |
| `docs/reference-providers.md` | справочники |
| `docs/deployment.md` | развёртывание |
| `docs/requirements-compliance.md` | соответствие ТЗ |
| `docs/final-production-audit.md` | итоговый аудит |
