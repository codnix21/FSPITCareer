# Deployment

## Docker Compose (рекомендуется)

```bash
cp .env.example .env
# смените JWT_SECRET и пароли БД для продакшена
docker compose up -d --build
```

Сервисы: `postgres`, `redis`, `ml-service`, `backend`, `frontend`, `nginx`.

Публичная точка входа: порт `80` (nginx).

## Миграции и seed

При старте backend-контейнера выполняется:

1. `prisma migrate deploy`
2. `prisma db seed`
3. запуск NestJS

Для повторного seed без пересоздания контейнера:

```bash
docker compose exec backend npx prisma db seed
```

## Production checklist

- [ ] Сменить `JWT_SECRET`, `POSTGRES_PASSWORD`
- [ ] Ограничить CORS
- [ ] Настроить HTTPS (внешний reverse proxy / cloud LB)
- [ ] Подключить реальный ML и API ФСП
- [ ] Вынести seed из автозапуска (оставить migrate)
- [ ] Настроить бэкапы PostgreSQL

## Масштабирование (дальше)

- Вынести matching workers
- pgvector embeddings для кандидатов/вакансий
- Очередь для анализа резюме
- Observability (OpenTelemetry / Prometheus)
