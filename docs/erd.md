# Corbi MVP – Entity Relationship Overview

This document summarizes the main entities and their relationships. It reflects the current Django models and multi-tenant scope.

## Tenancy and Membership
- **Organization** (organizations): owns all domain data.
  - Fields: `name`, `domain`.
- **Membership** (organizations): links `user` ↔ `organization` with `role` (admin/staff/viewer).

## Contacts & Identity
- **Contact** (contacts): belongs to `organization`.
  - Fields: `full_name`, `email`, `phone_whatsapp`, `whatsapp_blocked`, `telegram_chat_id`, `telegram_status`, `telegram_onboarded_at`, `instagram_scoped_id`/`instagram_user_id`, `instagram_opt_in`, `instagram_blocked`, `status` (active/blocked/unsubscribed/bounced), `tags`, `notes`, `last_inbound_at`, `last_outbound_at`.
  - Related: many-to-many **ContactGroup** (per-organization groups with `name`, `description`, `color`, contact counts).
  - Uniqueness: identifier constraints per org on email, WhatsApp phone, Telegram chat id, Instagram scoped/user ids; duplicates raise validation errors on create/update.
  - Related: many **ContactEngagement** rows (per-contact timeline of sent/failed interactions across channels).
  - Related: many **IdentityConflict** rows (not surfaced in UI yet) to capture attempted conflicting updates.

## Templates
- **MessageTemplate** (templates_app): belongs to `organization`.
  - Fields: `name`, `channel`, `language`, `subject`, `body`, `variables` (list of `{name,fallback}`), `category`, `footer`, `is_default`, `approved`, `approved_by`, `approved_at`, timestamps.
  - Constraints: unique `(organization, name)`; only one `is_default` per org+channel (enforced in viewset).
  - Related to **OutboundMessage** via optional FK when rendering a send.

## Messaging
- **OutboundMessage** (messaging): belongs to `organization`, FK to `contact`, optional FK to `template`.
  - Fields: `channel`, `body`, `variables`, `media_url`, `scheduled_for`, `status` (pending/sent/retrying/failed/delivered/read), `retry_count`, `error`, `trace_id`, `provider_message_id`, `provider_status`, timestamps.
  - Behavior: schedule send, throttling, suppression checks.
  - Related: many **ProviderEvent** rows capturing callback status/payload/latency per provider_message_id.
- **InboundMessage** (messaging): belongs to `organization`, optional FK to `contact`.
  - Fields: `channel`, `payload` (JSON), `media_url`, `received_at`.
  - Behavior: logs webhook payloads; when identifiers match a contact in the org, updates contact fields (email/phone/telegram/instagram) and `last_inbound_at`.
- **Suppression** (messaging): belongs to `organization`; unique on `(organization, channel, identifier)`.
  - Fields: `identifier`, `channel`, `reason`.
- Channel-specific logs (per org, FK to contact):
  - **TelegramMessage** (`direction`, `message_type`, `text`, `attachments`, `telegram_message_id`, `status`, timestamps)
  - **WhatsAppMessage** (`direction`, `message_type`, `text`, `attachments`, `twilio_message_sid`, `status`, `error_reason`, timestamps)
  - **InstagramMessage** (`direction`, `message_type`, `text`, `status`, timestamps)
  - **TelegramInviteToken** (invite tokens per contact for onboarding; status and expiry)
- **EmailJob**: bulk email job for SendGrid.
  - Fields: `subject`, `body_html/body_text`, `status`, counts (`total/sent/failed/skipped/excluded`), batch config (size/delay/retries), timestamps, `error`.
  - Related: many **EmailRecipient** rows (per-contact/email status, error, sent_at); many **EmailAttachment** rows (file path, size, name).
  - Webhooks: SendGrid events update recipient/job status; unsubscribe links mark contact + suppression.
  - **ProviderEvent**: stores provider callback payloads and latency per outbound message (status, provider_message_id, channel).
- **Campaign** (messaging): belongs to `organization`, optional FK to `template`.
  - Fields: `name`, `channel` (email/whatsapp/telegram/instagram), `target_count`, `sent/delivered/read/failed/unsubscribed` counts, `estimated_cost`, `status` (draft/queued/sending/completed/failed), `group_ids` (JSON), `upload_used` flag, `created_by`, timestamps.
- **CampaignRecipient** (messaging): belongs to `campaign` and `organization`, optional FK to `contact`.
  - Fields: contact identifiers (email/phone/instagram_user_id), `status` (queued/sent/delivered/read/failed/unsubscribed), `error_reason`, sent/delivered/read timestamps.

## Bookings
- **Resource** (bookings): belongs to `organization`.
  - Fields: `name`, `resource_type` (room/device), `capacity`, `description`, `gcal_calendar_id`, `is_active`, timestamps.
- **Booking** (bookings): belongs to `organization`, FK to `contact`, optional FK to `resource`, optional FK to `created_by_user`.
  - Fields: `title`, `start_time`, `end_time`, `status` (pending/confirmed/rescheduled/cancelled), `location`, `notes`, `timezone`, `organizer_email`, `attendees` (JSON list of emails), `recurrence`, `external_calendar_id`, Google metadata (`gcal_event_id`, `gcal_calendar_id`, `gcal_ical_uid`, `gcal_etag`, `gcal_sequence`), `hangout_link/htmlLink`, `created_by`, timestamps.
  - Behavior: on create/update/delete, syncs to Google Calendar using the org’s integration; prefers the resource’s `gcal_calendar_id` when set; free/busy check before create; stores htmlLink for “Open in Google Calendar”.
- **BookingChangeLog**: belongs to `booking`.
  - Fields: `change_type` (created/updated/cancelled/rescheduled/no_show), `actor_type`, `details` (JSON), `created_at`.

## Integrations
- **Integration** (integrations): belongs to `organization`.
  - Fields: `provider` (sendgrid/whatsapp/telegram/instagram/google_calendar), encrypted `token`, `extra` (JSON for provider metadata), `is_active`, timestamps. Tokens are never returned by the API; connect/disconnect via `/api/integrations/{provider}/...`.
  - Provider specifics: Google Calendar stores OAuth tokens and calendar metadata in `extra`; ElevenLabs/SendGrid/WhatsApp/Telegram/Instagram store provider ids/tokens in `extra` and `token` (encrypted).
- **OrganizationBranding** (organizations): belongs to `organization`.
  - Fields: company info + `logo` image for navbar/branding; stored per org.

## Assistant
- **KB file** (assistant): configured via `ASSISTANT_KB_PATH`; no DB model yet. Assistant responses are org-scoped and logged only via audit logger.

## Monitoring
- Metrics are computed from messaging/bookings/contacts; no dedicated table yet. Monitoring summary aggregates today’s counts and success rate; details API derives per-channel failures and latency from **ProviderEvent**.
- Alerts (monitoring) track category/severity/message/metadata; currently stored without status fields; UI lists open alerts.

## Billing
- **BillingLog** (billing): belongs to `organization`.
  - Fields: `feature_tag`, `model`, `mode`, `tokens_prompt`, `tokens_completion`, `tokens_total`, `raw_cost`, `billable_cost`, `currency`, `request_id`, `status` (sent/succeeded/failed/canceled), `metadata` (JSON for pipeline/stage/retry), `error`, timestamps.
  - Behavior: create on dispatch (`status=sent`), update via result endpoint on success/failure/cancel. Billable cost applies markup to raw cost.

## Relationships Snapshot
```
Organization 1---* Membership *---1 User
Organization 1---* Contact
Organization 1---* ContactGroup *---* Contact
Organization 1---* MessageTemplate ---* OutboundMessage *---1 Contact
Organization 1---* OutboundMessage
Organization 1---* InboundMessage *---0..1 Contact
Organization 1---* Suppression
Organization 1---* TelegramMessage *---1 Contact
Organization 1---* WhatsAppMessage *---1 Contact
Organization 1---* InstagramMessage *---1 Contact
Organization 1---* TelegramInviteToken *---1 Contact
Organization 1---* EmailJob *---* EmailRecipient *---0..1 Contact
EmailJob *---* EmailAttachment
Organization 1---* Campaign *---* CampaignRecipient *---0..1 Contact
Organization 1---* Resource
Organization 1---* Booking *---0..1 Contact
Booking *---0..1 Resource
Booking *---0..1 User (created_by_user)
Booking 1---* BookingChangeLog
Organization 1---* Integration
```

Notes:
- All business records are scoped by `organization`; API requires `X-Org-ID` or falls back to sole membership.
- Cascades: deleting an organization cascades to its data. Deleting a contact cascades outbound messages; inbound uses `SET_NULL` on contact.
- Roles: `IsOrgMemberWithRole` enforces membership; non-viewers can write.
