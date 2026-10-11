# Категоризация кандидатов

## Иерархия

```text
Отрасль (Industry)
  └── Специализация (Specialization)
        └── Уровень (Grade)
              └── Категория кандидата (CandidateCategory)
```

Пример: `IT → Backend Development → Middle → Backend Development · Middle`

## Сущности

| Сущность | Ключевые поля |
|---|---|
| Industry | name, slug, isActive |
| Specialization | industryId, name, slug |
| CandidateCategory | specializationId + grade (UNIQUE), slug, name |
| CandidateProfile | industryId, specializationId, candidateCategoryId, profileStatus |
| Vacancy | industryId, specializationId |

Поле `roleTitle` оставлено для отображения и совместимости, но **не** является источником истины для taxonomy.

## Статус профиля

| Статус | Значение |
|---|---|
| DRAFT | онбординг не завершён |
| ASSESSMENT_REQUIRED | отрасль/специализация/навыки есть, тест ещё не пройден |
| AVAILABLE | доступен работодателям |
| HIDDEN | скрыт |

`AVAILABLE` **не** выставляется автоматически после онбординга (без фиктивного теста).

## API

- `GET /reference/industries`
- `GET /reference/specializations?industryId=`
- `GET /reference/categories?specializationId=&grade=`
- `GET /candidates/me/completion`
- `PUT /candidates/:id` — проверяет согласованность, резолвит категорию

## Matching

В breakdown добавлен сигнал `specializationMatch`. Backend / Frontend / DevOps не считаются полным совпадением только из‑за общего слова «developer».

## Связь с тестированием

После успешного Assessment: `profileStatus = AVAILABLE`, обновляются `recommendedGrade` и категория.
