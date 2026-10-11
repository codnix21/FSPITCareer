# Подтверждение email

## Поток

```text
POST /auth/register
  → User.emailVerified = false
  → EmailVerificationToken (храним только хеш)
  → EmailProvider отправляет письмо

POST /auth/verify-email { token }
  → хеш → поиск → проверки срока и одноразовости
  → emailVerified = true
  → token.usedAt (повторно использовать нельзя)

POST /auth/resend-verification (JWT)
POST /auth/resend-verification-email { email }  # без enumeration
```

## Безопасность токена

- сырой токен в БД не хранится
- в БД — SHA-256 хеш
- TTL: `EMAIL_VERIFICATION_TTL_HOURS` (по умолчанию 24 часа)
- одноразовое использование
- повторная отправка ограничена по частоте
- токен не пишется в AuditLog

## Провайдеры

| Режим | Адаптер |
|---|---|
| `EMAIL_PROVIDER=console` (по умолчанию) | `ConsoleEmailProvider` — пишет ссылку в лог |
| `EMAIL_PROVIDER=resend` | `ResendEmailProvider` — Resend API (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) |
| `EMAIL_PROVIDER=smtp` | `SmtpEmailProvider` — граница для SMTP |

Для production (itcareer.netcorehub.ru):

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=support@cabinet.netcorehub.ru
PUBLIC_APP_URL=https://itcareer.netcorehub.ru
```

Домен отправителя должен быть верифицирован в Resend. Ссылка в письме строится как `${PUBLIC_APP_URL}/verify-email?token=...`.

## Ограничения продукта

Пока email не подтверждён:

- обновление онбординга кандидата → `403 EMAIL_NOT_VERIFIED`
- поиск matching работодателем → `403 EMAIL_NOT_VERIFIED`

Вход в систему доступен, чтобы пользователь мог запросить повторное письмо и подтвердить email.
