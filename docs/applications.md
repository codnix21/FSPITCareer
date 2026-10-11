# Отклики кандидатов (self-apply)

## Жизненный цикл

```text
Кандидат → активная вакансия → Отклик (SUBMITTED)
  → REVIEWING (работодатель)
  → ACCEPTED | REJECTED (работодатель)
  или WITHDRAWN (кандидат из SUBMITTED / REVIEWING)
```

## Машина состояний

| Из | В |
|---|---|
| SUBMITTED | REVIEWING, ACCEPTED, REJECTED, WITHDRAWN |
| REVIEWING | ACCEPTED, REJECTED, WITHDRAWN |
| ACCEPTED / REJECTED / WITHDRAWN | конечные |

Кандидат не может выставить ACCEPTED/REJECTED. Работодатель не отзывает отклик за кандидата.

## Авторизация

- Кандидат: создать / список своих / отозвать свой / читать свой
- Работодатель: список откликов по своим вакансиям / смена статуса
- IDOR блокируется на чтении, отзыве, ревью и списке по вакансии

## Условия отклика

- роль CANDIDATE
- `profileStatus === AVAILABLE`
- вакансия `ACTIVE`
- не своя вакансия компании
- нет активного дубля (SUBMITTED | REVIEWING)

## Дубли и гонки

Частичный уникальный индекс PostgreSQL:

```sql
UNIQUE (candidateId, vacancyId) WHERE status IN ('SUBMITTED','REVIEWING')
```

Сервис ловит Prisma `P2002` → `409 APPLICATION_DUPLICATE`.

## Раскрытие контактов

Расширяет `ContactRevealService`:

| Причина | Условие |
|---|---|
| `ACCEPTED_OFFER` | оффер ACCEPTED и работодатель — владелец |
| `SELF_APPLICATION` | отклик SUBMITTED \| REVIEWING \| ACCEPTED на вакансию работодателя |
| `ADMIN` | администратор |

Контакты не попадают в matching / публичный профиль / DTO вакансии. В DTO отклика для работодателя поле `contact` только если разрешено.

## API

| Метод | Путь |
|---|---|
| POST | `/applications` |
| GET | `/applications/me` |
| GET | `/applications/for-vacancy/:vacancyId` |
| GET | `/applications/:id` |
| POST | `/applications/:id/withdraw` |
| PATCH | `/applications/:id/review` |
| GET | `/vacancies/:vacancyId/applications` |

## Аудит

`APPLICATION_CREATED`, `APPLICATION_REVIEWED`, `APPLICATION_ACCEPTED`, `APPLICATION_REJECTED`, `APPLICATION_WITHDRAWN`, `APPLICATION_STATUS_CHANGED`, `CONTACT_REVEALED` — без PII в metadata.

## Связь с офферами

ACCEPTED отклика ≠ ACCEPTED оффера. Автоматическое создание оффера не выполняется.

## Уведомления

Граница: аудит `APPLICATION_STATUS_CHANGED`. Полноценная email-рассылка — отдельный этап.
