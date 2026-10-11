# API

Swagger UI: `/api/docs` (если включён `SWAGGER_ENABLED=true`)

## Авторизация

Все защищённые методы: `Authorization: Bearer <token>`

### POST /api/auth/register

Тело: email, password, firstName, lastName, role (`CANDIDATE` | `EMPLOYER`), companyName (для работодателя).

### POST /api/auth/login

Тело: email, password → `{ accessToken, user }`

### Подтверждение email

- `POST /api/auth/verify-email` — `{ token }`
- `POST /api/auth/resend-verification` — JWT
- `POST /api/auth/resend-verification-email` — `{ email }` (без раскрытия существования аккаунта)

## Кандидаты

- `GET /api/candidates`
- `GET /api/candidates/:id`
- `PUT /api/candidates/:id`
- `GET /api/candidates/:id/achievements`
- `GET /api/candidates/me`
- `GET /api/candidates/me/completion`
- раскрытие контакта — через политику ContactReveal (после оффера/отклика)

## Вакансии

- `GET /api/vacancies`
- `POST /api/vacancies`
- `GET /api/vacancies/:id`
- `PUT /api/vacancies/:id`
- `GET /api/vacancies/employer/stats`
- `GET /api/vacancies/:vacancyId/applications`

## Matching

- `POST /api/matching/search`
- `GET /api/matching/vacancies/:vacancyId`
- `GET /api/matching/candidates/:candidateId/vacancies`
- `POST /api/v1/matching/semantic`

## Предложения (Offers)

- `POST /api/offers`
- `GET /api/offers`
- `PATCH /api/offers/:id` (`status`: ACCEPTED | REJECTED | WITHDRAWN)

## Отклики (Applications)

- `POST /api/applications`
- `GET /api/applications/me`
- `GET /api/applications/:id`
- `POST /api/applications/:id/withdraw`
- `PATCH /api/applications/:id/review`

## Техническое тестирование (Assessments)

- `GET /api/assessments`
- `GET /api/assessments/:id`
- `POST /api/assessments/:id/start`
- `GET /api/assessments/attempts/:attemptId`
- `POST /api/assessments/attempts/:attemptId/answers`
- `POST /api/assessments/attempts/:attemptId/submit`
- `GET /api/assessments/results/me`

## Технические задания (Challenges)

- `GET /api/challenges`
- `GET /api/challenges/:id`
- `POST /api/challenges/:id/start`
- `GET /api/challenges/attempts/:attemptId`
- `POST /api/challenges/attempts/:attemptId/answers`
- `POST /api/challenges/attempts/:attemptId/submit`
- `GET /api/challenges/results/me`

## ФСП

- `GET /api/fsp/participants`
- `GET /api/fsp/participants/:id`
- `GET /api/v1/fsp/participants/:id`

## Резюме

- `POST /api/resumes/upload` (multipart `file`)
- `POST /api/resumes/:id/analyze`

## Админ

Требует роль ADMIN:

- `/api/admin/stats|users|companies|candidates|vacancies|achievements`
- `/api/admin/assessments`, `/api/admin/challenges`

## Ошибки

```json
{
  "statusCode": 400,
  "message": "Текст на русском",
  "error": "Некорректный запрос",
  "timestamp": "..."
}
```
