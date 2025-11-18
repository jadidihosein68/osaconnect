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

## Auth & Multi-tenancy
- JWT via SimpleJWT (`/api/auth/token/`, `/api/auth/token/refresh/`), plus session/basic for admin.
- Every API call should include `X-Org-ID` for the organization; if the user has only one membership, the backend will default to it. Multiple memberships still require the header.
- Frontend stores token in localStorage; a 401 clears token and redirects to `/login`. Token/org are hydrated on refresh; metrics and data fetches require a valid org.

## Key Endpoints
- Contacts: `GET/POST /api/contacts/`, `POST /api/contacts/{id}/mark_inbound/`
- Templates: `GET/POST /api/templates/`, `POST /api/templates/{id}/render/`, `POST /api/templates/{id}/approve/`
- Outbound: `GET/POST /api/outbound/` (validates contact status & identifier; throttled; suppression-aware)
- Inbound log: `GET /api/inbound/` (read-only)
- Inbound webhooks: `POST /api/webhooks/{channel}/` (channel=whatsapp|email/telegram/instagram; logs payload, enriches contact if matched)
- Provider callbacks: `POST /api/callbacks/{channel}/` (provider status updates; marks suppressions on failure/bounce)
- Bookings: `GET/POST /api/bookings/` (calendar stub writes `external_calendar_id`; updates/cancels sync the stub)
- Assistant: `POST /api/assistant/` (KB-backed stub, requires auth/org)
- Health: `/health/`; Metrics: `/api/metrics/` (counts, failures, retrying) – requires JWT + `X-Org-ID`
- Monitoring summary KPIs: `/api/monitoring/summary/` (today totals, success rate, inbound today)
- Admin: `/admin/`

## Important Config
- `.env` keys: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `ASSISTANT_KB_PATH`, `OUTBOUND_PER_MINUTE_LIMIT`.
- Channel keys: `WHATSAPP_API_TOKEN`, `EMAIL_API_KEY`, `TELEGRAM_BOT_TOKEN`, `INSTAGRAM_APP_TOKEN`
- Calendar and assistant keys: `CALENDAR_PROVIDER`, `CALENDAR_API_KEY`, `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY`
- Celery runs eagerly by default (`CELERY_TASK_ALWAYS_EAGER=true`) for local simplicity.
- Throttling: per-minute send ceiling per channel via `OUTBOUND_PER_MINUTE_LIMIT`.

## Frontend Pages
- Login, Dashboard (metrics + counts), Contacts, Templates, Messaging (send form + log), Bookings, AI Assistant.
- Vite dev proxy forwards `/api`, `/health`, `/metrics` to `localhost:8000`.

## Current Behaviors
- Multi-tenancy: all core models are scoped to `Organization`; access is filtered by `X-Org-ID` header + membership.
- Outbound send: validates contact active + channel identifier, throttles, dispatches to stub channel senders (`messaging/channels.py`), records status/trace_id, updates last_outbound_at. Provider callbacks mark delivered/read/failed and create suppressions on bounce/fail.
- Inbound webhook: logs payload, attempts contact match on identifiers, triggers contact enrichment for the matched org; ignores unmatched orgs.
- Opt-out: inbound webhook marks contacts unsubscribed if text includes STOP/UNSUBSCRIBE/CANCEL/OPTOUT.
- Media validation: outbound media URL must be http(s) and one of jpg/png/pdf/mp4/mp3.
- Templates: variables must have matching `{{var}}` placeholders in body.
- Metrics: aggregates counts/failures/retrying and today aggregates; monitoring summary provides today totals, success rate, inbound today.
- Bookings: calendar stub writes `external_calendar_id` when provider keys set.

## Known Gaps vs PRD (future work)
- Real channel integrations (WA/Email/Telegram/IG) with callbacks, media validation, opt-out keyword detection.
- Stronger compliance: audit logging, richer role matrix, org-scoped RBAC on every action.
- Template versioning, promotion, richer approval states.
- Calendar provider real integration (Google/Microsoft) and user-facing confirmations.
- AI assistant: real retrieval + LLM with safety/guardrails replacing stub.
- Monitoring dashboard UI, structured logging, alerting, callback latency.

## Debug Pointers
- If 401s occur in the UI, re-login; 401 auto-clears token and redirects.
- If 500s on list endpoints, ensure migrations ran and backend is up.
- To bypass throttling in dev, raise `OUTBOUND_PER_MINUTE_LIMIT` or set high value.
