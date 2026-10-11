# Справочники и внешние провайдеры

## Назначение

Автодополнение навыков, должностей и городов для онбординга и вакансий.
Источник подсказок — внешний провайдер (HeadHunter), с локальным fallback при недоступности.

## Архитектура

```text
UI → /reference/* → ReferenceService → ReferenceProvider (HeadHunter)
                                    → локальный каталог (fallback)
```

## Эндпоинты

- `GET /reference/skills?q=`
- `GET /reference/cities?q=`
- `GET /reference/roles?q=`
- `GET /reference/industries`
- `GET /reference/specializations?industryId=`
- `GET /reference/categories?specializationId=&grade=`

## Поведение при сбоях

Если внешний API недоступен:

- сервис не падает;
- возвращается урезанный локальный каталог / пустой список с понятным статусом;
- matching и профили продолжают работать.

## Безопасность

- публичные справочники не отдают PII;
- ключи внешних API только в env;
- ответы внешнего API не проксируются «как есть» с лишними полями.
