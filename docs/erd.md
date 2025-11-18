# Corbi MVP – Entity Relationship Overview

This document summarizes the main entities and their relationships. It reflects the current Django models and multi-tenant scope.

## Tenancy and Membership
- **Organization** (organizations): owns all domain data.
  - Fields: `name`, `domain`.
- **Membership** (organizations): links `user` ↔ `organization` with `role` (admin/staff/viewer).

## Contacts & Identity
- **Contact** (contacts): belongs to `organization`.
  - Fields: `full_name`, `email`, `phone_whatsapp`, `telegram_chat_id`, `instagram_scoped_id`, `status` (active/blocked/unsubscribed/bounced), `tags`, `notes`, `last_inbound_at`, `last_outbound_at`.
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

## Bookings
- **Booking** (bookings): belongs to `organization`, FK to `contact`, optional FK to `created_by_user`.
  - Fields: `title`, `start_time`, `end_time`, `status` (pending/confirmed/cancelled), `location`, `notes`, `external_calendar_id`, `created_by`, timestamps.
  - Behavior: calendar stub integration on create/update/delete.

## Assistant
- **KB file** (assistant): configured via `ASSISTANT_KB_PATH`; no DB model yet. Assistant responses are org-scoped and logged only via audit logger.

## Monitoring
- Metrics are computed from messaging/bookings/contacts; no dedicated table yet. Monitoring summary aggregates today’s counts and success rate.

## Relationships Snapshot
```
Organization 1---* Membership *---1 User
Organization 1---* Contact
Organization 1---* MessageTemplate ---* OutboundMessage *---1 Contact
Organization 1---* OutboundMessage
Organization 1---* InboundMessage *---0..1 Contact
Organization 1---* Suppression
Organization 1---* Booking *---1 Contact
Booking *---0..1 User (created_by_user)
```

Notes:
- All business records are scoped by `organization`; API requires `X-Org-ID` or falls back to sole membership.
- Cascades: deleting an organization cascades to its data. Deleting a contact cascades outbound messages; inbound uses `SET_NULL` on contact.
- Roles: `IsOrgMemberWithRole` enforces membership; non-viewers can write.
