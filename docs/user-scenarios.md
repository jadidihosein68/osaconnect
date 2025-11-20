# User Scenarios (Corbi MVP)

Share this with stakeholders to explain how users interact with the system end to end.

## 1) Onboarding & Auth
- Create an account (admin) and log in via `/login`.
- Select or switch organization (via org dropdown, `X-Org-ID` header set automatically).
- Optional: run `seed_demo` for demo org/user (demo/changeme123) during setup.

## 2) Configure Integrations (Settings → Integrations)
- Admins connect providers per org: WhatsApp (Twilio), SendGrid, Telegram, Instagram, Google Calendar.
- Actions: Connect (save token/metadata), Test Connection, Disconnect.
- These credentials power outbound sends and calendar sync for that org.

## 3) Contacts & Identities
- Create a contact with name (required) and optional identifiers: WhatsApp phone, email, Telegram client ID, Instagram scoped ID.
- View/edit/delete contacts; paginate and search. Status controls messaging eligibility (Active/Blocked/Unsubscribed/Bounced).
- Identity enrichment: inbound payloads update missing identifiers; conflicting updates are stored as conflicts.

## 4) Templates
- Create/edit/delete templates per channel (WhatsApp/Email/Telegram/Instagram) with `{variable}` placeholders and optional fallbacks.
- View templates grid; deep link to create (`/templates/new`) or edit (`/templates/{id}`).
- Approval: admin can approve templates (workflow stubbed).

## 5) Outbound Messaging
- From UI or API, select a contact + channel + body/template. System validates contact status, required identifiers, throttling, suppressions.
- Sends via configured provider: Twilio WhatsApp, SendGrid email, Telegram bot, Instagram Graph. Provider IDs and statuses recorded.

## 6) Inbound Capture & Linking
- Providers post to `/api/webhooks/{channel}/`; payloads are logged as inbound messages and enrich contacts if identifiers match.
- UI: view inbound list, search/filter, and link to contacts or send quick replies.

## 7) Bookings & Calendar
- Create/update/delete bookings tied to contacts. Statuses: pending/confirmed/cancelled.
- If Google Calendar integration is configured, events are created/updated/deleted via Google Calendar API; event IDs stored on bookings.

## 8) Monitoring & Alerts
- Dashboards show totals, per-channel delivery/failed counts, callback latency, booking errors, failure reasons.
- Event stream of provider callbacks and an alerts feed (failures, missing integrations). Optional email alerts via `ALERTS_EMAIL_TO`.
- Health endpoint `/health/` reports pending migrations and queue settings.

## 9) Admin & Permissions
- Org membership with roles (admin/staff/viewer). Admins manage integrations, approvals, deletions; viewers read-only.
- All API calls require auth and org context; multi-org users can switch orgs.

## 10) Assistant (Stub for now)
- Placeholder endpoint/UI for AI assistant; real KB/LLM to be integrated later per roadmap.

## Operational Notes
- Storage: SQLite by default; MySQL/Postgres recommended for production.
- Logs: written to rotating files under `backend/logs/`; provider events and alerts stored as metrics.
- Migrations: run `python manage.py migrate` (includes integrations, provider events, monitoring alerts). 
- Frontend: Vite React app; deep links for contacts/templates/bookings/inbound.
