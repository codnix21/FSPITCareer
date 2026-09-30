# Архитектура FSP IT Career

## Принципы

1. Один рабочий продукт важнее сложной микросервисной сети.
2. Matching — отдельный модуль с явной формулой и объяснениями («Почему подходит»).
3. FSP и ML подключаются через стабильные API; на MVP допустимы mock.

## Компоненты

```text
Browser → Nginx → Next.js (web)
                → NestJS (api) → PostgreSQL
                               → Redis (rate limit / future cache)
                               → ML service (semantic matching)
```

## Доменные сущности

- User / Role (CANDIDATE, EMPLOYER, ADMIN)
- CandidateProfile, Skills, Experience, Education
- Company, Vacancy
- Match, Offer
- FSP Participant / Achievements
- Resume / ResumeAnalysis
- Tests / Attempts

## Matching

Модуль `apps/api/src/matching/matching.engine.ts` считает score 0–100.

ML-сервис принимает `candidate_id` + `vacancy_id` и возвращает `similarity`.
Если ML недоступен, API использует deterministic fallback на основе rule-based score.

## Безопасность

- bcrypt для паролей
- JWT Bearer
- RBAC через RolesGuard
- ValidationPipe + DTO
- Throttling на auth
- CORS whitelist
- секреты только в env
