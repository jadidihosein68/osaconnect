# Installation Guide — Corbi MVP

This guide walks through backend/frontend setup, environment configuration, migrations, and provider webhooks so the full messaging stack works end-to-end.

---

## Prerequisites
- Python 3.11+ (virtualenv recommended)
- Node.js 18+ and npm
- Redis (optional, for Celery async; dev runs eager by default)
- Git, curl

---

## Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
- Set `DJANGO_SECRET_KEY` to a strong value.
- Set `FERNET_KEY` (use the generator hint in .env.example).
- Set `DJANGO_ALLOWED_HOSTS` (dev: `*`).
- If using Redis/Celery: `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`.
- Set `SITE_URL` or `UNSUBSCRIBE_URL` to your public base URL (used for unsubscribe links).
- For media in WhatsApp/Telegram/Instagram: set `MEDIA_EXTERNAL_BASE_URL` to your public host (e.g., your ngrok base).

Apply migrations:
```bash
python manage.py migrate
```
If you see an error like `no such table: monitoring_monitoringalert`, ensure the monitoring app migrations are applied:
```bash
python manage.py migrate monitoring
```

Seed (optional):
```bash
# Demo org/user/content
python manage.py seed_demo
# Default email template/footer for production
python manage.py seed_default
```

Create admin user:
```bash
python manage.py createsuperuser
```

Run server:
```bash
python manage.py runserver  # http://127.0.0.1:8000
```

Optional Celery worker (if not using eager):
```bash
celery -A corbi worker --loglevel=info
```

---

## Frontend Setup
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

---

## Auth & Org Header
- Obtain JWT via `POST /api/auth/token/` (username/password).
- Frontend stores `corbi_token`, `corbi_refresh`, and `corbi_org` in localStorage.
- All API calls must include `Authorization: Bearer <token>` and `X-Org-ID` (if user has multiple orgs).

---

## Provider Integrations (connect via API)
Use `/api/integrations/{provider}/connect/` with `X-Org-ID` to store tokens (admin role required). Tokens are encrypted at rest.
- Providers: `sendgrid`, `whatsapp`, `telegram`, `instagram`, `google_calendar`.
- Example: `POST /api/integrations/sendgrid/connect/` body: `{"token":"SG.x", "extra":{"from_email":"you@example.com"}}`
- Disconnect: `DELETE /api/integrations/{provider}/`

---

## Webhooks / Callbacks
Point providers to your public URL (replace `https://your-public-host`).

**Twilio WhatsApp**
- Inbound webhook: `POST https://your-public-host/api/webhooks/twilio/whatsapp/`
- Status callback URL: `POST https://your-public-host/api/callbacks/twilio/whatsapp/status/`
- Ensure `MEDIA_EXTERNAL_BASE_URL` resolves for attachments.

**Telegram (bot)**
- Set webhook to: `https://your-public-host/api/webhooks/telegram/onboard/`
- Bot token stored via integrations (`telegram`).

**Instagram Messaging (Meta Graph)**
- Inbound webhook: `POST https://your-public-host/api/webhooks/instagram/`
- Ensure verification token/app config on Meta side; tokens stored via integrations (`instagram`).

**SendGrid (Email)**
- Event Webhook URL: `POST https://your-public-host/api/callbacks/sendgrid/`
- Configure events: delivered, bounce, dropped, spamreport, open (for read tracking).

**Generic Provider Callback (if used)**
- `POST https://your-public-host/api/callbacks/<channel>/` where `<channel>` matches adapter (whatsapp/telegram/instagram/email).

**Unsubscribe**
- Links in email footer point to `/unsubscribe/` on your host; requires `UNSUBSCRIBE_URL` or `SITE_URL` set.

---

## Media Serving
- Django serves media under `/media/`. For WhatsApp/Telegram/Instagram attachments, configure a public base via `MEDIA_EXTERNAL_BASE_URL` so providers can fetch files.
- In dev, you may need ngrok to expose `http://localhost:8000/media/...`.

---

## Logging
- Logs in `backend/logs/` with daily rotation (`corbi.log.YYYY-MM-DD`, `corbi-errors.log.YYYY-MM-DD`). Adjust in `corbi/settings.py` if needed.

---

## Migrations to Apply (current set)
- contacts: up to 0013 (instagram fields, whatsapp opt-in)
- messaging: up to 0022 (campaigns, channel messages, email job campaign/read_at)
- templates_app: up to 0003 (approval fields)
- bookings/organizations as usual

Run:
```bash
python manage.py migrate
```

---

## Quick Test Flow
1) Create org + user (or seed_demo).
2) Login via frontend, select org.
3) Connect SendGrid via integrations (token + from_email).
4) Create a template for Email channel.
5) Add contacts with email.
6) Send an Email job or Campaign (Email channel) — verify SendGrid webhook updates delivered/failed/open counts.
7) For WhatsApp/Telegram/Instagram, connect integrations and set webhooks; send messages and verify inbound/outbound logs.

---

## Common Issues
- 401 token invalid: re-login after ensuring `DJANGO_SECRET_KEY` stable; clear localStorage tokens.
- Media not loading in WhatsApp/Telegram: set `MEDIA_EXTERNAL_BASE_URL` to your public URL.
- SendGrid events not updating counts: ensure Event Webhook points to `/api/callbacks/sendgrid/` and events include delivered/bounce/drop/spamreport/open.
- Webhook 404: confirm the exact URL matches the routes above and that `ALLOWED_HOSTS` includes your public host.

---

## Production Notes
- Use Postgres/MySQL instead of SQLite.
- Serve Django via gunicorn/uvicorn behind Nginx.
- Use HTTPS for all webhooks.
- Configure Celery + Redis with non-eager mode for real async sends/retries.
- Store secrets in env/secret manager, not in VCS.




To run e2e test : 
Make sure to install requiremenmt, and you should be in an environment 




how to run : 

cd "D:\WS\AI autogenerate\OSAConnect\osaconnect\tests\e2e"
$env:E2E_BASE_URL="http://localhost:3000"
$env:E2E_USER="test"
$env:E2E_PASS="test@corbi"
behave --tags=@smoke


