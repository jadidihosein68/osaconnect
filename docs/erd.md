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
  - Related: many **IdentityConflict** rows (not surfaced in UI yet) to capture attempted conflicting updates.

## Templates
- **MessageTemplate** (templates_app): belongs to `organization`.
  - Fields: `name`, `channel`, `language`, `subject`, `body`, `variables` (array), `approved`, `approved_by`, `approved_at`.
  - Related to **OutboundMessage** via optional FK when rendering a send.

## Messaging
- **OutboundMessage** (messaging): belongs to `organization`, FK to `contact`, optional FK to `template`.
  - Fields: `channel`, `body`, `variables`, `media_url`, `scheduled_for`, `status` (pending/sent/retrying/failed/delivered/read), `retry_count`, `error`, `trace_id`, `provider_message_id`, `provider_status`, timestamps.
  - Behavior: schedule send, throttling, suppression checks.
- **InboundMessage** (messaging): belongs to `organization`, optional FK to `contact`.
  - Fields: `channel`, `payload` (JSON), `media_url`, `received_at`.
  - Behavior: enrich contact identifiers on save.
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
- **Campaign** (messaging): belongs to `organization`, optional FK to `template`.
  - Fields: `name`, `channel` (email/whatsapp/telegram/instagram), `target_count`, `sent/delivered/read/failed/unsubscribed` counts, `estimated_cost`, `status` (draft/queued/sending/completed/failed), `group_ids` (JSON), `upload_used` flag, `created_by`, timestamps.
- **CampaignRecipient** (messaging): belongs to `campaign` and `organization`, optional FK to `contact`.
  - Fields: contact identifiers (email/phone/instagram_user_id), `status` (queued/sent/delivered/read/failed/unsubscribed), `error_reason`, sent/delivered/read timestamps.

## Bookings
- **Booking** (bookings): belongs to `organization`, FK to `contact`, optional FK to `created_by_user`.
  - Fields: `title`, `start_time`, `end_time`, `status` (pending/confirmed/cancelled), `location`, `notes`, `external_calendar_id`, `created_by`, timestamps.
  - Behavior: calendar stub integration on create/update/delete.

## Integrations
- **Integration** (integrations): belongs to `organization`.
  - Fields: `provider` (sendgrid/whatsapp/telegram/instagram/google_calendar), encrypted `token`, `extra` (JSON for provider metadata), `is_active`, timestamps. Tokens are never returned by the API; connect/disconnect via `/api/integrations/{provider}/...`.

## Assistant
- **KB file** (assistant): configured via `ASSISTANT_KB_PATH`; no DB model yet. Assistant responses are org-scoped and logged only via audit logger.

## Monitoring
- Metrics are computed from messaging/bookings/contacts; no dedicated table yet. Monitoring summary aggregates today’s counts and success rate.

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
Organization 1---* Booking *---1 Contact
Booking *---0..1 User (created_by_user)
Organization 1---* Integration
```

Notes:
- All business records are scoped by `organization`; API requires `X-Org-ID` or falls back to sole membership.
- Cascades: deleting an organization cascades to its data. Deleting a contact cascades outbound messages; inbound uses `SET_NULL` on contact.
- Roles: `IsOrgMemberWithRole` enforces membership; non-viewers can write.
