# Движок технического тестирования (Assessment)

## 1. Домен

```text
Assessment (PUBLISHED)
  ├── AssessmentBlueprint + разделы (навык, вес, число вопросов)
  ├── AssessmentQuestion (банк вопросов)
  ├── AssessmentGradeThreshold (балл → уровень)
  └── AssessmentAttempt
        ├── AssessmentAttemptQuestion (снимок набора)
        ├── AssessmentAnswer
        └── AssessmentResult (неизменяемый)
```

Устаревшие `Test` / `TestQuestion` / `TestAttempt` оставлены для совместимости; основной путь — Assessment.

## 2. Assessment

Поля: название, описание, отрасль, специализация, версия, статус (`DRAFT` | `PUBLISHED` | `ARCHIVED`), лимит времени, проходной балл, cooldown.

Стартовать можно только `PUBLISHED`. Версия фиксируется в попытке (`assessmentVersion`).

## 3. Blueprint

Разделы в БД: навык, вес (сумма ≈ 1), число вопросов, опционально сложность.

Вопросы выбираются случайно по разделу из активного банка — не фиксированный список.

## 4. Банк вопросов

`AssessmentQuestion`: навык, сложность (`EASY` | `MEDIUM` | `HARD`), тип (`SINGLE_CHOICE` | `MULTIPLE_CHOICE`), варианты, `correctOptionIndexes`, пояснение, баллы.

Кандидату **никогда** не отдаются `correctOptionIndexes` и пояснение правильного ответа.

## 5. Попытка

`POST /assessments/:id/start`

Условия: JWT, подтверждённый email, совпадение специализации, статус PUBLISHED, cooldown, не более одной `IN_PROGRESS`.

Статусы: `IN_PROGRESS → SUBMITTED | EXPIRED | CANCELLED` (обратно нельзя).

Таймер: `expiresAt` авторитетен на backend.

## 6. Оценивание

Взвешенная точность по разделам → итоговый балл 0–100 (`ScoringService`).

Клиент не может передать score / isCorrect / points как истину.

## 7. Пороги уровней

| Уровень | Балл |
|---|---|
| INTERN | 0–49 |
| JUNIOR | 50–69 |
| MIDDLE | 70–84 |
| SENIOR | 85–100 |

## 8. Рекомендуемый уровень

`recommendedGrade` считается по порогам. Самооценка остаётся в `CandidateProfile.grade`.

Категория = `resolveCategory(specializationId, recommendedGrade)`.

## 9. Категория

Используется существующий `CandidateCategoryService` — без второй системы категорий.

## 10. Cooldown

После SUBMITTED/EXPIRED повторный старт блокируется до `+ cooldownHours`.

Ответ: `409` / `ASSESSMENT_COOLDOWN` + `retryAt`.

## 11. Безопасность

- JWT на всех эндпоинтах
- владение попыткой
- работодатель видит только сводку (балл, статус, recommendedGrade) — без ответов и банка
- лимиты частоты на start / answers / submit
- аудит: STARTED / SUBMITTED / PASSED / FAILED (без содержимого ответов)

## 12. API

| Метод | Путь |
|---|---|
| GET | `/assessments` |
| GET | `/assessments/:id` |
| POST | `/assessments/:id/start` |
| GET | `/assessments/attempts/:attemptId` |
| POST | `/assessments/attempts/:attemptId/answers` |
| POST | `/assessments/attempts/:attemptId/submit` |
| GET | `/assessments/results/me` |
| Админ | `/admin/assessments` |

## 13. Версионирование

Попытка хранит `assessmentVersion`. Исторические результаты не пересчитываются при изменении банка — публикуется новая версия.

## 14. Античит (будущее)

Архитектура допускает метаданные позже. Подтверждённый античит **не заявлен**.

## Matching

- `gradeMatch` использует `recommendedGrade`, если он есть
- вес `assessmentMatch` = 0.05 (см. `MATCH_WEIGHTS`)
- в поиск работодателя попадают только `profileStatus = AVAILABLE` (нужен PASSED assessment)
