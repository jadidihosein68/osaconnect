## Corbi MVP Dev Guide

This repository contains a Django + React monorepo implementing the Corbi MVP described in `README.md`.

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis (for Celery broker / result; optional when `CELERY_TASK_ALWAYS_EAGER=true`)

### Backend (Django + DRF)
1. `cd backend`
2. `python -m venv env && source env/bin/activate`
3. `pip install -r requirements.txt`
4. `cp .env.example .env`
5. `python manage.py migrate`
6. `python manage.py createsuperuser` (for Django admin)
7. `python manage.py runserver`

Celery worker (optional for async send):
```bash
celery -A corbi worker --loglevel=info
```

Key endpoints:
- `/api/contacts/` CRUD + `POST /api/contacts/{id}/mark_inbound/`
- `/api/templates/` CRUD + `POST /api/templates/{id}/render/`
- `/api/outbound/` create/send messages (safety: only active contacts)
- `/api/inbound/` read-only log
- `/api/bookings/` scheduling
- `/api/assistant/` KB-backed stub
- `/api/auth/token/` obtain JWT (SimpleJWT) and `/api/auth/token/refresh/`
- `/health/` service diagnostics

### Frontend (React + Tailwind + Vite)
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173`

The frontend is intentionally lightweight to demonstrate flows across messaging, contacts, templates, bookings, and the AI assistant.

### Notes
- SQLite is the default DB; swap `DATABASES` in `backend/corbi/settings.py` for MySQL later.
- Celery is configured to run eagerly by default for ease of local dev; set `CELERY_TASK_ALWAYS_EAGER=false` for async workers.
- Knowledge base lives in `backend/knowledge_base.md`; plug an LLM provider in `assistant/views.py`.
- Authentication defaults to JWT (SimpleJWT) + session auth. Create a user (`createsuperuser`) and obtain a token via `/api/auth/token/`. Pass `Authorization: Bearer <token>` on API calls.
