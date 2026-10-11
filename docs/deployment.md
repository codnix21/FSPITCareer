# Развёртывание

## Docker Compose (рекомендуется)

```bash
cp .env.example .env
# задайте сильные JWT_SECRET и POSTGRES_PASSWORD
docker compose up -d --build
```

Сервисы: `postgres`, `redis`, `ml-service`, `backend`, `frontend`, `nginx`.

Публичная точка входа: порт `80` (nginx).  
Прямой доступ: frontend `:3000`, API `:3001/api`, health `:3001/api/health`.

## Миграции и seed

При старте backend-контейнера:

1. `prisma migrate deploy`
2. при `SEED_ON_START=true` — `prisma db seed`
3. запуск NestJS

Повторный seed без пересборки:

```bash
docker compose exec backend npx prisma db seed
```

Демо-аккаунты после seed:

| Роль | Email | Пароль |
|------|-------|--------|
| Работодатель | employer@fsp-career.ru | Demo123! |
| Соискатель | candidate@fsp-career.ru | Demo123! |
| Администратор | admin@fsp-career.ru | Demo123! |

## Чеклист production

- [ ] Сменить `JWT_SECRET`, `POSTGRES_PASSWORD`
- [ ] `SEED_ON_START=false`, `SWAGGER_ENABLED=false`
- [ ] Ограничить CORS доменами продукта
- [ ] Настроить HTTPS (внешний reverse proxy)
- [ ] Подключить реальный SMTP / внешний ФСП при наличии
- [ ] Бэкапы PostgreSQL и тома uploads
- [ ] Мониторинг `/api/health`

## Дальнейшее масштабирование

- Вынести matching workers
- pgvector embeddings для кандидатов/вакансий
- Очередь для анализа резюме
- Observability (OpenTelemetry / Prometheus)
