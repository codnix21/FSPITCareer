# Итоговый производственный аудит — FSP IT Career

**Дата:** 2026-10-11

## Архитектура

```text
Браузер → Nginx → Next.js 15 (web)
                 → NestJS (api) → PostgreSQL (Prisma)
                                → Redis (лимиты)
                                → FastAPI ML (семантика + детерминированный fallback)
```

**Основной поток**

```text
Авторизация → подтверждение email → онбординг → тест → категория → AVAILABLE
  → вакансия → matching → оффер | отклик → раскрытие контактов
```

**Дополнительно**

```text
Кандидат → технические задания → результат → безопасная сводка для работодателя
```

## Соответствие требованиям

См. `docs/requirements-compliance.md`.

| Область | Статус |
|---|---|
| Регистрация + согласие + email | **PASS** |
| Категоризация | **PASS** |
| Assessment Engine | **PASS** |
| Веса matching Σ=1.0 | **PASS** |
| Отклики | **PASS** |
| Офферы (снимок / срок) | **PASS** |
| Раскрытие контактов | **PASS** |
| Challenges | **PASS** |
| Абстракция ФСП | **PASS** |
| Privacy / RBAC / IDOR | **PASS** |
| Античит / запуск кода | **N/A** |
| Живой внешний ФСП | **N/A** без URL |
| Production SMTP | **PARTIAL** |

## Безопасность

| Проверка | Результат |
|---|---|
| JWT + RolesGuard | **PASS** |
| Ключ ответов Assessment / Challenge скрыт | **PASS** |
| IDOR попыток | **PASS** |
| IDOR откликов + гонка дублей | **PASS** |
| Владение оффером + запрет accept после EXPIRED | **PASS** |
| Админ-эндпоинты только ADMIN | **PASS** |
| Аудит без PII | **PASS** |
| Человекочитаемые ошибки на фронте | **PASS** |

## Приватность

Публичный профиль без email/phone/путей файлов. Контакты только через `ContactRevealService`  
(`ACCEPTED_OFFER` | `SELF_APPLICATION` | `ADMIN`).

## Matching

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

Источник: `apps/api/src/matching/matching.engine.ts`. Фронтенд не задаёт итоговый score.

## Миграции

1. `20260326000000_init`
2. `20260326120000_onboarding`
3. `20261001120000_reference_catalogs`
4. `20261001140000_external_reference_ids`
5. `20261008010000_privacy_audit`
6. `20261008020000_taxonomy_email_verification`
7. `20261008030000_assessment_engine`
8. `20261008040000_offer_fsp_hardening`
9. `20261008050000_applications`
10. `20261008060000_challenges`

## Тесты

| Набор | Результат |
|---|---|
| API Jest | **109/109 PASS** |
| Web Vitest | **34/34 PASS** |
| TypeScript | **PASS** |
| Сборка API | **PASS** |
| Сборка Web | **PASS** |

## Известные ограничения

1. Внешний ФСП не live без production URL.
2. SMTP требует credentials провайдера.
3. Challenges без запуска кода / прокторинга / AI-оценки.
4. Нет продвинутого античита.
5. Истечение офферов/заданий — при обращении (без фонового sweeper).
6. Matching загружает полный набор AVAILABLE (оптимизация при нагрузке).
7. Админ Challenges: API + seed, без отдельного CMS.
8. ML — детерминированный fallback до реальной модели.

## Готовность к демо

| Пункт | Статус |
|---|---|
| Демо-аккаунты = seed | **ДА** (`*@fsp-career.ru` / `Demo123!`) |
| Кандидат: verify → тест → AVAILABLE | **ДА** |
| Работодатель: вакансия → matching → профиль | **ДА** |
| Отклик / оффер / контакты | **ДА** |
| Challenges + сводка работодателю | **ДА** |

## Итоговый статус

**ГОТОВО К ДЕМОНСТРАЦИИ**
