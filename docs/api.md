# API

Swagger UI: `/api/docs`

## Авторизация

Все защищённые методы: `Authorization: Bearer <token>`

### POST /api/auth/register

Тело: email, password, firstName, lastName, role (`CANDIDATE`|`EMPLOYER`), companyName (для работодателя).

### POST /api/auth/login

Тело: email, password → `{ accessToken, user }`

## Кандидаты

- `GET /api/candidates`
- `GET /api/candidates/:id`
- `PUT /api/candidates/:id`
- `GET /api/candidates/:id/achievements`
- `GET /api/candidates/me`

## Вакансии

- `GET /api/vacancies`
- `POST /api/vacancies`
- `GET /api/vacancies/:id`
- `PUT /api/vacancies/:id`
- `GET /api/vacancies/employer/stats`

## Matching

- `POST /api/matching/search`
- `GET /api/matching/vacancies/:vacancyId`
- `GET /api/matching/candidates/:candidateId/vacancies`
- `POST /api/v1/matching/semantic`

## Offers

- `POST /api/offers`
- `GET /api/offers`
- `PATCH /api/offers/:id` (`status`: ACCEPTED|REJECTED|WITHDRAWN)

## FSP

- `GET /api/fsp/participants`
- `GET /api/fsp/participants/:id`
- `GET /api/v1/fsp/participants/:id`

## Резюме

- `POST /api/resumes/upload` (multipart `file`)
- `POST /api/resumes/:id/analyze`

## Admin

Требует роль ADMIN:

- `/api/admin/stats|users|companies|candidates|vacancies|achievements`

## Ошибки

Ответ:

```json
{
  "statusCode": 400,
  "message": "Текст на русском",
  "error": "Некорректный запрос",
  "timestamp": "..."
}
```
