# Remaining Tasks & Notes

This file lists what is still open after the latest implementation pass. Use it to plan the next sprint.

## SendGrid Event Webhook
- Endpoint implemented: `POST /api/callbacks/sendgrid/` (no auth).
- Configure in SendGrid: Settings → Mail Settings → Event Webhook → set URL to `https://<backend-host>/api/callbacks/sendgrid/` (use ngrok for local HTTPS).
- Select events: **Delivered**, **Bounce**, **Dropped**, **Spam Report**.
- Behavior: bounce/dropped/spamreport → mark EmailRecipient failed, create suppression, increment failed counts; delivered → mark sent. Response: `{"status":"ok","failed_updated":X,"updated":Y}`.
- If access to SendGrid is unavailable now, defer configuration; bounce/failed status will rely only on send results until webhook is wired.

## Email UX Gaps
- Batch/retry settings are env-only (`EMAIL_BATCH_SIZE`, `EMAIL_BATCH_DELAY_SECONDS`, `EMAIL_RETRY_DELAY_SECONDS`, `EMAIL_MAX_RETRIES`); no UI editor yet.
- Per-recipient details: attachment/error visibility is basic; could add file links and clearer errors in Email Job detail.
- Exclusions are shown post-send as a list; no per-recipient granular view.
- Engagement reporting exists only in contact detail; no broader analytics page.

## Templates & Seed
- Default template seeder: `manage.py seed_default` (idempotent, production-safe) ensures one default email template per org with `{{unsubscribe_link}}`, approved/by/at.
- Migrations pending: templates_app (0004 footer/default, 0005 merge, 0006 rename index), messaging 0013 (email job template/footer).

## Environment Notes
- Set `UNSUBSCRIBE_URL` to the backend host (e.g., `http://localhost:8000` for dev) in `backend/.env`, then restart backend. Fallbacks: `SITE_URL`, `UNSUBSCRIBE_MAILTO`; final fallback is mailto:recipient.
- Other envs used: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `FERNET_KEY`, `OUTBOUND_PER_MINUTE_LIMIT`, email batch/retry settings, optional `ALERTS_EMAIL_TO`, assistant/calendar keys.

## UX Change: Recipient Selector (Send Message → Recipients)
- Add a search input above the recipient list; local filtering only (name match). If no results, show “No recipients found.”
- Recipient list must sit in a fixed-height, scrollable container (vertical scroll, smooth; selection remains available).
- Align spacing/padding with the rest of the form. No backend changes required.
## Permissions & compliance
- Finalize role matrix across all actions (template approve, inbound reply/link, outbound send, assistant). Add audit logs of approvals/sends.
- Expand suppression/opt-out handling (per-channel keywords, global opt-out list, manual review queue).


## Calendar integration
- Expand beyond Google Calendar basic create/update/delete: add attendee sync, reminders, and support for Microsoft Graph if needed. Surface sync errors in UI.

## Assistant/LLM
- Replace KB stub with retrieval + LLM provider (`ASSISTANT_PROVIDER`), add safety checks, prompt/response logging, and org-scoped KB CRUD.
## Frontend wiring
- Use the new monitoring summary/metrics endpoints for dashboards by channel; add charts for callback latency/failure reasons.
- Better inbound workflows: contact creation/linking UX, reply channel selection, and confirmation toasts.

## Data & ops
- Ensure migrations are applied in order (organizations before contacts/messaging/bookings). Add seed data script for a demo org/user.
- Configure Celery + Redis for async sends in non-eager mode; add retry backoff config in settings.

## Config
- Provide real credentials in `.env` for channels, calendar, assistant; keep secrets out of VCS. Document provider-specific settings as they are added.