# Technical Gaps & Risks (to be addressed)

This file tracks known gaps or practices that need improvement. Use it as a punch list for future hardening.

## Monitoring & Dashboard
- Metrics/monitoring numbers can remain zero if `ProviderEvent` latency data or alerts are missing; failure/latency charts are sparse without populated events.
- Range-aware filtering is inconsistent: events/alerts endpoints do not fully filter by date range, which can mislead dashboards.
- Alert acknowledgement/resolve flows are missing both in API and UI.
- CSP warnings in dev persist; production CSP is not defined.
- Alerts model lacks status (open/ack/closed) and lifecycle actions; monitoring UI cannot update alert state.

## Bookings & Calendar
- Google Calendar sync is one-way: external edits/cancels aren’t pulled back; no webhook/reconciliation implemented.
- Recurrence (RRULE) and attendee RSVP status are not supported; timezone handling relies on client-reported tz and can drift if not set.
- Resources/room metadata is basic; capacity/availability windows and conflicts are not fully enforced.
- Organizer allow-list and attendee expansion (groups/contacts → emails) are not fully validated server-side.

## Contacts & Identity
- Duplicate/conflict prevention across channels is incomplete; identifier validation/enrichment rules are uneven per channel.
- IdentityConflict audit rows are not surfaced in UI; duplicate errors are generic and do not guide remediation.
- Global opt-out UI and richer suppression management are missing.

## Notifications
- Notifications plumbing exists, but events (campaigns/integrations/alerts) do not emit notifications; UI will stay empty.

## Security & Secrets
- Token encryption/refresh flows need revalidation after recent changes; ensure `FERNET_KEY` stability and consistent decrypt/refresh paths.
- CSP not locked down for production; dev warnings remain.
- Webhook signature verification (SendGrid/Twilio/Telegram/etc.) is not enforced; callbacks accept unsigned payloads.

## Templates
- The serializer defines `validate` twice; the second overrides the first, so placeholder-to-variable validation is effectively disabled. Body/variable consistency should be enforced in one consolidated validator.

## Outbound Logs / Callbacks
- Provider callbacks are accepted without signature verification; outbound status could be spoofed. Add signature checks per provider (SendGrid Event Webhook, Twilio, Telegram, Instagram).
- No retry/backoff on callback fetch failures; logs/latency charts stay empty if callbacks are blocked.

## Testing
- E2E coverage is thin: create-contact flow is brittle; no coverage for calendar/integration journeys; multi-tenant uniqueness (email across orgs) still causes errors.
- No automated tests for Google Calendar create/update/delete or webhook flows.

## Documentation
- OAuth/Calendar setup steps need a clear, final guide (redirect URIs, scopes, organizer allow-list, room resources).
- Remaining tasks and migration order are not documented; many migrations are dirty/pending and need sequencing.

## Billing
- BillingLog does not enforce model allowlists per feature; markup configuration is static and not org-configurable. No summaries/aggregations surfaced beyond per-call logs.

## Settings / Integrations
- Branding/logo upload depends on Pillow; failure to install blocks migrations. No fallback or validation of logo dimensions/size.
- Signature verification for inbound provider calls (webhooks) is missing; callbacks accept unsigned payloads. UI exposes error strings directly from provider test calls.
