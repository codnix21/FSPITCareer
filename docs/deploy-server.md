# Развёртывание: itcareer.netcorehub.ru (FastPanel)

## Схема

```text
HTTPS → FastPanel TLS
      ├─ /api/ → 127.0.0.1:3021  (backend)
      └─ /     → 127.0.0.1:3020  (frontend)
```

Не проксируйте через docker-nginx `:8920` из FastPanel — на панели это даёт `400 Bad Request`.

Порты задаются в `.env.server.example` (`WEB_PUBLISH`, `API_PUBLISH`, …).

## Шаги

```bash
cd /opt/FSPITCareer
cp .env.server.example .env
# POSTGRES_PASSWORD, JWT_SECRET, пароль в DATABASE_URL

docker compose up -d --build
curl -sS http://127.0.0.1:3021/api/health
curl -sI http://127.0.0.1:3020/
```

FastPanel SSL `server`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3021;
    include /etc/nginx/proxy_params;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_set_header Upgrade "";
    client_max_body_size 12m;
}

location / {
    proxy_pass http://127.0.0.1:3020;
    include /etc/nginx/proxy_params;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_set_header Upgrade "";
}
```

HTTP → `return 301 https://$host$request_uri;`

```bash
nginx -t && systemctl reload nginx
curl -sI https://itcareer.netcorehub.ru/
curl -sS https://itcareer.netcorehub.ru/api/health
```

После первого seed: `SEED_ON_START=false` в `.env`, затем `docker compose up -d backend`.

### Письма подтверждения (Resend)

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=support@cabinet.netcorehub.ru
PUBLIC_APP_URL=https://itcareer.netcorehub.ru
```

```bash
docker compose up -d --build backend
docker compose logs backend --tail 50 | grep -i resend
```

Демо: `candidate@fsp-career.ru` / `Demo123!`
