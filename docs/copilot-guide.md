# Copilot Guide — Corbi MVP

This repo implements a Django + React MVP aligned to the PRD in `README.md`. Use this as a quick orientation and handoff.

## Stack & Structure
- Backend: Django 5, DRF, SimpleJWT auth, Celery stubs, Redis config (optional), SQLite (default).
- Frontend: React 18, Vite, Tailwind, React Query.
- Layout: `backend/` Django project `corbi`; apps: `contacts`, `templates_app`, `messaging`, `bookings`, `assistant`, `monitoring`. Frontend lives in `frontend/` (Figma-derived UI).

## Setup (local dev)
Backend:
```
cd backend
python -m venv env && source env/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver  # http://localhost:8000
# optional async worker
celery -A corbi worker --loglevel=info
```
Frontend:
```
cd frontend
npm install
npm run dev  # http://localhost:5173 proxied to backend
```

## Auth
- JWT via SimpleJWT (`/api/auth/token/`, `/api/auth/token/refresh/`), plus session/basic for admin.
- Frontend stores token in localStorage; a 401 clears token and redirects to `/login`.

## Key Endpoints
- Contacts: `GET/POST /api/contacts/`, `POST /api/contacts/{id}/mark_inbound/`
- Templates: `GET/POST /api/templates/`, `POST /api/templates/{id}/render/`
- Outbound: `GET/POST /api/outbound/` (validates contact status & identifier; throttled)
- Inbound log: `GET /api/inbound/` (read-only)
- Inbound webhooks: `POST /api/webhooks/{channel}/` (channel=whatsapp|email|telegram|instagram; logs payload, enriches contact if matched)
- Bookings: `GET/POST /api/bookings/`
- Assistant: `POST /api/assistant/` (KB stub at `backend/knowledge_base.md`)
- Health: `/health/`; Metrics: `/metrics/` (counts, failures, retrying)
- Admin: `/admin/`

## Important Config
- `.env` keys: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `ASSISTANT_KB_PATH`, `OUTBOUND_PER_MINUTE_LIMIT`.
- Celery runs eagerly by default (`CELERY_TASK_ALWAYS_EAGER=true`) for local simplicity.
- Throttling: per-minute send ceiling per channel via `OUTBOUND_PER_MINUTE_LIMIT`.

## Frontend Pages
- Login, Dashboard (metrics + counts), Contacts, Templates, Messaging (send form + log), Bookings, AI Assistant.
- Vite dev proxy forwards `/api`, `/health`, `/metrics` to `localhost:8000`.

## Current Behaviors
- Outbound send: validates contact active + channel identifier, throttles, dispatches to stub channel senders (`messaging/channels.py`), records status/trace_id, updates last_outbound_at.
- Inbound webhook: logs payload, attempts contact match on identifiers, triggers contact enrichment.
- Opt-out: inbound webhook marks contacts unsubscribed if text includes STOP/UNSUBSCRIBE/CANCEL/OPTOUT.
- Media validation: outbound media URL must be http(s) and one of jpg/png/pdf/mp4/mp3.
- Templates: variables must have matching `{{var}}` placeholders in body.
- Metrics: aggregates counts and failure/retrying stats.

## Known Gaps vs PRD (future work)
- Real channel integrations (WA/Email/Telegram/IG) with callbacks, media validation, opt-out keyword detection.
- Stronger compliance: unsubscribe/bounce handling, audit logging, roles/permissions beyond basic JWT.
- Template approval workflow, variable validation, versioning.
- Calendar provider integration (Google/Microsoft) and messaging confirmations.
- AI assistant: real retrieval + LLM with safety/guardrails replacing stub.
- Monitoring dashboard UI, structured logging, alerting.

## Debug Pointers
- If 401s occur in the UI, re-login; 401 auto-clears token and redirects.
- If 500s on list endpoints, ensure migrations ran and backend is up.
- To bypass throttling in dev, raise `OUTBOUND_PER_MINUTE_LIMIT` or set high value.
