# Copilot Guide — Corbi MVP

This repo implements a Django + React MVP aligned to the PRD in `README.md`. Use this as a quick orientation and handoff.

## Stack & Structure
- Backend: Django 5, DRF, SimpleJWT auth, Celery stubs, Redis config (optional). Default DB is SQLite for dev; Postgres is supported via `.env`.
- Frontend: React 18, Vite, Tailwind, React Query.
- Layout: `backend/` Django project `corbi`; apps: `contacts`, `templates_app`, `messaging`, `bookings`, `assistant`, `monitoring`, `integrations`, `organizations`. Frontend lives in `frontend/` (Figma-derived UI).

## Setup (local dev)
Backend:
```
cd backend
python -m venv env && source env/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo      # optional demo data (Demo Org, demo user demo/changeme123)
python manage.py seed_default   # production-safe defaults (default email template per org with footer/unsubscribe)
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
- Campaigns: `GET/POST /api/campaigns/` (create/list), `GET /api/campaigns/{id}/` (detail incl. recipients), `GET /api/campaigns/throttle/` (per-channel send caps), `GET /api/campaigns/costs/` (hard-coded pricing with actual+markup; UI uses markup for estimation). Channels supported: email, whatsapp, telegram, instagram. Create payload accepts `group_ids` (multi) and `upload_contacts` (CSV rows) and dedupes contacts. Estimated cost = targets × channel outbound markup.
- Bookings: `GET/POST /api/bookings/` (Google Calendar sync uses integration tokens; updates/cancels patch/delete events)
- Assistant: `POST /api/assistant/` (KB-backed stub, requires auth/org)
- Health: `/health/`; Metrics: `/api/metrics/` (counts, failures, retrying) – requires JWT + `X-Org-ID`
- Monitoring summary KPIs: `/api/monitoring/summary/` (today totals, success rate, inbound today)
- Monitoring drilldown: `/api/monitoring/details/` (per-channel stats, failure reasons, callback latency, booking/AI failures)
- Monitoring streams: `/api/monitoring/events/` (provider event log) and `/api/monitoring/alerts/` (alert feed)
- Settings snapshot: `/api/settings/` (non-secret runtime config like limits/providers)
- Integrations: `GET /api/integrations/`, `POST /api/integrations/{provider}/connect/`, `DELETE /api/integrations/{provider}/` (org admin only; tokens encrypted, not returned). Test connection via `POST /api/integrations/{provider}/test/`. Google Calendar uses OAuth start `/api/integrations/google/start/`.
- Bookings/resources: `GET/POST /api/bookings/`, `GET/POST /api/resources/` (rooms/devices synced to Google). Booking detail includes Google ids and `htmlLink` when created.
- Admin: `/admin/`

## Important Config
- `.env` keys: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `ASSISTANT_KB_PATH`, `OUTBOUND_PER_MINUTE_LIMIT`.
- Integrations (WhatsApp, SendGrid, Telegram, Instagram, Google Calendar) are configured per org via `/api/integrations/...`; env vars now only hold Django/Celery defaults. Ensure `FERNET_KEY` is set for encryption. `ALERTS_EMAIL_TO` (optional) enables email notifications for monitoring alerts. Assistant settings still use `ASSISTANT_PROVIDER/API_KEY`.
- Celery runs eagerly by default (`CELERY_TASK_ALWAYS_EAGER=true`) for local simplicity.
- Throttling: per-minute send ceiling per channel via `OUTBOUND_PER_MINUTE_LIMIT`.

## Frontend Pages
- Login
- Dashboard (metrics + counts)
  - Uses `/api/metrics/` (requires JWT + `X-Org-ID`) to show totals for contacts, bookings, inbound/outbound messages. Monitoring summary endpoints supply today’s success rate and inbound counts.
  - Monitoring dashboards use `/api/monitoring/summary/` and `/api/monitoring/details/` for per-channel stats, failure reasons, and callback latency; `/api/monitoring/events/` and `/api/monitoring/alerts/` provide streams/alerts.
- Contacts:
  - List with search by name/email/phone, filter by status and by groups; pagination; actions include view/edit/delete.
  - Group management: create/edit/delete org-scoped groups, assign/unassign on list or in the contact drawer; group filter in the list.
  - Detail drawer shows identifiers (email, WhatsApp, Telegram, Instagram), status, tags/segments, notes, last inbound/outbound, and engagement history (ContactEngagements).
  - Validation: identifiers must be unique within the same org (email/WhatsApp/Telegram chat/Instagram ids). Duplicate identifiers return “Contact identifiers must be unique and non-conflicting.”
  - Telegram onboarding tab lists contacts with invite tokens; can issue invites and track onboarding status.
  - Identity conflicts are recorded internally but not yet surfaced in UI.
- Templates
- Messaging (send form + log)
- Bookings
- AI Assistant
- Vite dev proxy forwards `/api`, `/health`, `/metrics` to `localhost:8000`.

## Templates (frontend + backend)
- Entity: `MessageTemplate` (org-scoped). Fields: `name`, `channel` (email/whatsapp/telegram/instagram), `language`, `subject`, `body`, `variables` (list of `{name,fallback}`), `category`, `footer`, `is_default`, `approved`, `approved_by/at`, timestamps.
- API: `/api/templates/` list/create/update/delete; `/api/templates/{id}/render/` (POST data → rendered body with fallbacks); `/api/templates/{id}/approve/` (marks approved, records user).
- Uniqueness: `name` is unique per org; only one `is_default` per org+channel (enforced on save).
- Placeholders: `variables` intended to match `{{var}}` tokens in body; editor validates variables list; body placeholder validation is currently weak (see technical gaps).
- Footer & unsubscribe: email channel uses footer and inserts unsubscribe link in outbound jobs when templates are applied.
- Frontend: Templates page lists cards (channel badge, status, variables count). Create/edit modal supports variables (add/remove), language/channel, category, footer, default/approve toggles. “Render” action used when previewing in messaging/campaign flows.
- Approved state: Approve button hides once approved; approved_by/approved_at shown in detail card; status badges (Draft/Approved) visible on cards and detail.
- Default template seed: `manage.py seed_default` seeds a default email template with unsubscribe link per org.

## Messaging & Campaign Flows (frontend + backend)
- Send Message page:
  - Channels: Email (SendGrid), WhatsApp (Twilio), Telegram Bot, Instagram DM; channel list is filtered by active integrations for the org.
  - Recipients: pick contacts (org-scoped) and groups; Telegram send list only shows onboarded contacts; WhatsApp/Email respect contact status (active only) and suppressions. Attachment upload allowed for email (validated types/size) and media URLs for WhatsApp/Telegram.
  - Validation/throttling: backend enforces per-minute limits, suppression checks, and unique identifiers; outbound status updates come from provider callbacks and are reflected in conversation threads (sent/delivered/read/failed where supported).
  - Unsubscribe: email sends append a footer with a signed unsubscribe link; `/unsubscribe/` marks the contact unsubscribed and adds suppression.
  - Inbound logs: `/api/inbound/` shows captured inbound across channels; webhook POST `/api/webhooks/{channel}/` records payloads and enriches contacts when identifiers match.
- Campaigns:
  - Create at `/messaging/campaign/create`: select channel, template, groups (multi), optional CSV upload; target count and estimated cost computed client-side using `/campaigns/costs` (markup only).
  - Backend dedupes contacts within org, applies exclusions (invalid/unsubscribed/blocked/bounced) and returns exclusion reasons. Sends are batched with delay/retry per env config; recipient statuses updated via SendGrid webhook or provider callbacks.
  - Detail page shows KPIs (sent/delivered/read/failed/unsubscribed), per-recipient statuses and errors; retry-failed exists for email jobs.
- Email jobs:
  - `/api/email-attachments/` for uploads; `/api/email-jobs/` create/list/detail; `/api/email-jobs/{id}/retry_failed/`.
  - Status per `EmailRecipient` (queued/sent/failed/skipped/read) updated by SendGrid Event Webhook (`/api/callbacks/sendgrid/`), including bounce/dropped/spamreport → suppressions.
- Provider callbacks:
  - `/api/callbacks/{channel}/` records `ProviderEvent` (status, payload, latency) and updates OutboundMessage state; failure events add suppressions for bounces/opt-outs.
- Suppressions/opt-out:
  - Stored per channel/identifier; inbound STOP/UNSUBSCRIBE/CANCEL/OPTOUT toggles contact status and suppression. Outbound send blocks suppressed identifiers.
- Inbound (webhooks + logs):
  - Webhooks land on `/api/webhooks/{channel}/` (whatsapp/email/telegram/instagram); payload is stored as `InboundMessage` with channel, payload JSON, media URL if present, and optional contact.
  - Contact enrichment: if payload contains identifiers (email, phone_whatsapp, telegram_chat_id, instagram_scoped_id) and a contact is matched in the org, the contact is updated (mark_inbound) and `last_inbound_at` set. Unmatched payloads remain logged without a contact.
  - UI: `/inbound` page lists inbound messages with channel, time, and payload preview; org-scoped only. No edits, read-only audit trail.
- Outbound Logs:
  - `/api/outbound/` returns outbound messages across channels; includes contact, channel, status, provider_message_id, error, timestamps. Provider callbacks update status to delivered/read/failed when supported.
  - UI: Outbound Logs page lists sends with filters; status badge reflects callback updates. Attachments/media URLs shown when present.
  - Drill-down per channel is also surfaced in Monitoring (failure reasons, latency from ProviderEvent).
- Monitoring (frontend + backend):
  - Summary KPIs: `/api/monitoring/summary/` returns today’s totals (sent/failed/inbound) and success rate; used on dashboards.
  - Details: `/api/monitoring/details/` returns per-channel stats, failure reasons, callback latency percentiles (p95/p99), booking/AI failures.
  - Streams: `/api/monitoring/events/` exposes ProviderEvent history (status, payload snippet, latency); `/api/monitoring/alerts/` lists alert feed (category, severity, message).
  - UI: Monitoring page shows totals, latency cards, and tables for recent provider events and alerts; date-range filter is partial (see gaps).
- Billing:
  - Entity: `BillingLog` records AI/LLM usage per org with fields: feature_tag, model, mode, tokens_prompt/completion/total, raw_cost, billable_cost, request_id, status (sent/succeeded/failed/canceled), metadata (pipeline_id/stage/retry), error.
  - API: `GET/POST /api/billing/logs/` (list/create); `POST /api/billing/logs/{id}/result/` to update status, tokens, cost, request_id on completion/failure.
  - Flow: log `status=sent` before calling provider; on success/fail/cancel, update via `result` endpoint with usage and costs; billable_cost = markup applied to raw_cost.
  - UI: Billing page lists logs with filters (org-scoped) and shows per-call details (model, tokens, cost, status).
- Settings (Integrations & Branding):
  - Endpoint: `GET /api/settings/` returns non-secret runtime config; integrations managed via `/api/integrations/` endpoints.
  - Integrations UI (per org, admin-only):
    - WhatsApp Business, SendGrid (Email), Telegram Bot, Instagram Messaging, Google Calendar, ElevenLabs Voice Agent.
    - Connect flow: POST `/api/integrations/{provider}/connect/` with required tokens/metadata; tokens stored encrypted and not returned. Disconnect: DELETE `/api/integrations/{provider}/`.
    - Test connection: POST `/api/integrations/{provider}/test/` (where implemented) uses stored secrets server-side; UI should not expose tokens after save.
    - Google Calendar: OAuth flow starts at `/api/integrations/google/start/`, tokens stored on connect; test endpoint creates a test event; resources (rooms/devices) synced to `Resource` when provided.
    - ElevenLabs Voice Agent: store API key, agent id, phone number id, webhook secret, test_to_number; after connect, only test_to_number is editable until “Edit” is clicked.
  - Branding UI: Company info display + logo upload; logo intended for navbar usage (per org). Endpoint uses `OrganizationBranding` model (image requires Pillow).

## Current Behaviors
- Multi-tenancy: all core models are scoped to `Organization`; access is filtered by `X-Org-ID` header + membership.
- Outbound send: validates contact active + channel identifier, throttles, and dispatches to provider adapters powered by integration settings (`messaging/channels.py` uses Twilio, SendGrid, Telegram Bot API, Instagram Graph). Provider callbacks mark delivered/read/failed and create suppressions on bounce/fail.
- Inbound webhook: logs payload, attempts contact match on identifiers, triggers contact enrichment for the matched org; ignores unmatched orgs.
- Opt-out: inbound webhook marks contacts unsubscribed if text includes STOP/UNSUBSCRIBE/CANCEL/OPTOUT.
- Media validation: outbound media URL must be http(s) and one of jpg/png/pdf/mp4/mp3.
- Templates: variables must have matching `{{var}}` placeholders in body.
- Email jobs (SendGrid): `/api/email-jobs/` create/list/detail, `/api/email-jobs/{id}/retry_failed/`. Jobs created from selected contacts/groups (org-scoped), queued via Celery with batching/delay, per-recipient status logged. Subject and per-recipient personalization (`{{first_name}}`, `{{last_name}}`, `{{full_name}}`, `{{company_name}}`). Unsubscribe footer with signed token link: set `UNSUBSCRIBE_URL` (preferred) or `SITE_URL` fallback, or `UNSUBSCRIBE_MAILTO`; `/unsubscribe/` marks contact unsubscribed and adds email suppression. HTML + text parts are sent so the unsubscribe button is clickable.
- Email SendGrid webhook: `/api/callbacks/sendgrid/` accepts SendGrid Event Webhook payloads; marks `EmailRecipient` failed on bounce/dropped/spamreport, updates job failed_count, and creates email suppressions.
- Email exclusions: jobs store exclusions (reason) for skipped recipients; create response returns `exclusions` and `excluded_count`; job detail shows batch config (batch size/delay/retries).
- Email attachments: `POST /api/email-attachments/` (multipart) uploads validated files (pdf/jpg/png/docx/xlsx/zip up to 10MB) and returns ids; include `attachment_ids` when creating email jobs. S3-like storage not configured; uses Django media. Job detail lists attachments with download links.
- Email batching config via env: `EMAIL_BATCH_SIZE`, `EMAIL_BATCH_DELAY_SECONDS`, `EMAIL_MAX_RETRIES`, `EMAIL_RETRY_DELAY_SECONDS`. Shown in EmailJob detail; not editable via UI.
- Metrics: aggregates counts/failures/retrying and today aggregates; monitoring summary provides today totals, success rate, inbound today.
- Campaigns UI: `/messaging/campaign` list (cards, filters), `/messaging/campaign/create` (multi-group selection, CSV upload, template selection, channel chosen from active integrations). Campaign detail `/messaging/campaign/:id` shows summary and recipient statuses. Target count and cost recompute client-side from selected groups/uploads using `/campaigns/costs` markup rates. Channels displayed as “Email (SendGrid)”, WhatsApp, Telegram, Instagram.
- Bookings: Google Calendar integration creates/updates/deletes events using stored OAuth token + calendar_id (resource calendar preferred when set). Booking model has optional resource, organizer_email, attendees (JSON), timezone, Google metadata (event id, calendar id, etag, sequence, iCalUID, htmlLink stored in `hangout_link`). Free/busy check is performed; conflicts add a note. BookingChangeLog records create/update/cancel events.
- Assistant: now requires auth/org and returns KB snippets; replace with real LLM provider when ready.
- Billing: `/api/billing/logs/` (list/create) and `/api/billing/logs/{id}/result/` (update status/tokens/cost). Records per-call AI usage with org scoping, feature_tag, model, tokens, raw_cost, billable_cost. Log a row on dispatch (`status=sent`), then update on success/fail/cancel. Filterable by feature_tag/model/status/date range.

## Known Gaps vs PRD (future work)
- Deeper provider coverage: rich media, per-channel compliance rules, delivery receipts beyond current adapters.
- Stronger compliance: audit logging, richer role matrix, org-scoped RBAC on every action.
- Template versioning, promotion, richer approval states.
- Calendar provider real integration (Google/Microsoft) and user-facing confirmations.
- AI assistant: real retrieval + LLM with safety/guardrails replacing stub.
- Monitoring dashboard UI, structured logging, alerting, callback latency.
- Billing summaries/dashboards, markup configuration per org, and validation allowlists per feature/model.

## Debug Pointers
- If 401s occur in the UI, re-login; 401 auto-clears token and redirects.
- If 500s on list endpoints, ensure migrations ran and backend is up.
- To bypass throttling in dev, raise `OUTBOUND_PER_MINUTE_LIMIT` or set high value.

## E2E / BDD Tests (Playwright + Behave)
- Location: `tests/e2e/features/` (PO-owned Gherkin) and `tests/e2e/steps/` (glue), hooks in `tests/e2e/environment.py`.
- Install once: `pip install -r tests/requirements.txt` then `python -m playwright install`.
- Run: `behave tests/e2e --tags=@smoke` (smoke), `behave tests/e2e` (full), or a single feature `behave tests/e2e/features/login.feature`.
- Env vars: set `E2E_BASE_URL=http://localhost:3000`, `E2E_USER=<user>`, `E2E_PASS=<pass>`.
- Best practices:
  - Use stable selectors (id/name/data-testid), not brittle text.
  - Fill all required fields; generate unique data to avoid dedupe clashes.
  - Wait for clear success signals (toast or new row) and assert; fail on error banners.
  - Keep steps readable; POs edit only `.feature` files; engineers extend step glue.
  - Tag fast flows as `@smoke`; deeper cases as `@regression`.
