# Remaining Tasks and Next Steps

This file lists what is still open after the latest implementation pass. Use it to plan the next sprint.

## Channel adapters & callbacks
- Replace stub senders (WA/Email/Telegram/IG) with real provider clients; surface provider response bodies and timestamps.
- Harden callback parsing per provider schemas (delivery/read/fail/bounce/opt-out) and persist latency for monitoring.
- Enforce per-channel compliance (WA template checks, IG transactional, Telegram bot-blocked handling) and richer media validation.

## Permissions & compliance
- Finalize role matrix across all actions (template approve, inbound reply/link, outbound send, assistant). Add audit logs of approvals/sends.
- Expand suppression/opt-out handling (per-channel keywords, global opt-out list, manual review queue).

## Calendar integration
- Swap booking calendar stubs for real Google/Microsoft provider calls; handle updates/cancels, attendee responses, and error propagation to UI.

## Monitoring & observability
- Expose dedicated metrics endpoints for dashboard cards by channel and status; add callback latency and error buckets.
- Add structured logging, tracing IDs end-to-end, and optional alerting hooks (webhook/email).

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
