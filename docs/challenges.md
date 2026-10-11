# Технические задания (Challenges)

Регулярные задания для кандидатов. **Не заменяют** основное техническое тестирование и **не меняют** автоматически категорию / `recommendedGrade`.

## Домен

| Модель | Назначение |
|---|---|
| `Challenge` | Метаданные задания (статус, сложность, лимиты) |
| `ChallengeQuestion` | Вопросы SINGLE/MULTIPLE_CHOICE; правильные индексы только на сервере |
| `ChallengeAttempt` | Попытка кандидата; таймер `expiresAt` авторитетен на backend |
| `ChallengeAttemptQuestion` | Снимок порядка вопросов |
| `ChallengeAnswer` | Выборы кандидата; балл считает backend |

### Статусы задания

`DRAFT` → `PUBLISHED` → `CLOSED` / `ARCHIVED`

### Машина состояний попытки

```text
IN_PROGRESS → SUBMITTED | EXPIRED | CANCELLED
```

Конечные статусы неизменяемы. Возобновляется единственная попытка `IN_PROGRESS`; частичный уникальный индекс на `(candidateId, challengeId) WHERE status = IN_PROGRESS`.

## Оценивание

```text
score = round(earnedPoints / maxPoints * 100)
passed = score >= challenge.passingScore
```

Клиентские `score` / `passed` игнорируются.

## API кандидата

| Метод | Путь |
|---|---|
| GET | `/challenges` |
| GET | `/challenges/:id` |
| POST | `/challenges/:id/start` |
| GET | `/challenges/attempts/:attemptId` |
| POST | `/challenges/attempts/:attemptId/answers` |
| POST | `/challenges/attempts/:attemptId/submit` |
| GET | `/challenges/results/me` |
| GET | `/challenges/:id/results/me` |

Вопросы отдаются **только** после старта. Публичный DTO без ключа ответов.

## API администратора

`/admin/challenges` — создание, обновление, вопросы, смена статуса.

Админ: **backend API + seed** (отдельный CMS не добавлялся).

## Вид работодателя

В публичном профиле кандидата — агрегат `challenges`:

- число пройденных, всего сданных
- последние результаты: название, сложность, специализация, навык, балл, passed, дата

Без ответов, ID вопросов и внутренностей попытки. Только при праве видеть профиль (`AVAILABLE` + privacy).

## Аудит

`CHALLENGE_STARTED` | `CHALLENGE_SUBMITTED` | `CHALLENGE_EXPIRED` | `CHALLENGE_PASSED` | `CHALLENGE_FAILED`

Metadata: идентификаторы + score/passed. Без ответов и PII.

## Ограничения

- нет запуска кода / песочницы / AI-проверки / прокторинга
- нет фонового cron (истечение проверяется при обращении)
- нет влияния на MATCH_WEIGHTS и категорию
