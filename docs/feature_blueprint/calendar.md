## Scope & Objectives

Current implementation focuses on Google Calendar integration for a multi-tenant SaaS with two meeting modes:
- **Custom meeting** (user-organized) with organizer email chosen from org-level Google connections.
- **Room/device meeting** using onboarded Google resource calendars.

Key goals implemented:
- Use org-scoped Google credentials from the Integrations (Google Calendar) card; tokens are persisted and refreshed automatically.
- Create/update/cancel events in Google Calendar and mirror them locally in `bookings` with meeting_type (`custom` or `room`).
- UI shows a Google-like calendar (week/day/month) with hover, scroll, and time window controls; selecting a slot pre-fills the create form.
- Booking list is paginated (backend paginator on bookings only); dashboard uses its own non-paginated snapshot endpoint.
- Attendees can be selected from contacts/groups and added manually as comma-separated emails; organizer email is a dropdown sourced from stored Google integrations for the org.

## Actors & Roles
- **End user**: creates/edits/cancels meetings; books rooms/devices; sees calendar and list.
- **Admin**: onboards Google integration and resources (room/device calendars).
- **System**: refreshes tokens, syncs bookings, writes audit logs.

## Functional Summary (Implemented)
### Auth & Connections
- Reuse stored Google integration per tenant (access/refresh, expiry, scopes). Tokens refreshed on 401 and persisted. Scopes: calendar events. Org isolation enforced.

### Resources (Rooms/Devices)
- Resources stored with `gcal_calendar_id`, `resource_type` (room/device). Validation via calendar get. Disabled resources cannot be booked.

### Booking CRUD
- Two meeting types:
  - **custom**: title, notes, start/end, organizer_email (dropdown from org integrations), attendees (contacts, groups, manual emails). Location optional.
  - **room**: resource dropdown (Google calendar), title, notes, start/end; location auto-filled from resource; organizer implicitly resource; contacts/status fields hidden.
- Status managed internally; edit/delete call Google and update local booking.
- Google links: after create/test we surface an “Open in Google Calendar” URL.

### UI
- Calendar (React Big Calendar) styled like Google; scrollable time grid; time-window dropdown (6-hour slices) with auto-scroll to current time; hover highlights.
- Slot click deep-links to `/bookings/new` with prefilled start/end.
- Booking list paginated; delete/edit supported; detail view fetches single booking.

### Dashboard
- Uses a dedicated `/bookings/dashboard/` endpoint (non-paginated) returning `{count, results}` for upcoming bookings; dashboards do not reuse paginated APIs.

## Webhooks / Sync (planned or partial)
- Events mirror to Google on create/update/delete. Full webhook/sync still follows original design (verify headers, use syncToken/updatedMin) but may need expansion.

## Gaps / Notes
- Notifications for calendar events are currently disabled per user request.
- Secure storage of Google keys was temporarily disabled for troubleshooting; plan to re-enable Fernet encryption.
- Full two-way webhook sync and resource auto-provisioning are partially implemented; see technicalgap.md for follow-ups.

Update local DB records accordingly (insert/update/delete).

Maintain syncToken per calendar, persisted in DB. If token expires (410 GONE), run a full sync then store new token.

FR-19. Channel management

System must:

Register channels with a reasonable TTL where supported.

Renew channels before expiration.

Track active channels in DB (channel_id, resource_id, expiration, status).

FR-20. Idempotent handling

Webhook processing must be idempotent:

Use combination of resourceId + event Id + updated timestamp/etag to avoid double-processing.

3.6 No-Show Mechanism

FR-21. Show / No-Show endpoint

Provide internal endpoint (e.g., POST /meetings/{id}/show) callable by:

Room tablet/device.

CORBI UI or another integration.

When called within a configured window (e.g., start_time to start_time + 2h), meeting status becomes ATTENDED.

FR-22. Automatic no-show

If show endpoint has not been called for a meeting:

Nightly scheduler job:

For each past meeting whose start_time + 2h < current time AND status is SCHEDULED:

Mark as NO_SHOW.

No-show status should be stored in DB and not necessarily propagated to Google Calendar (unless you want to reflect status using extendedProperties).

FR-23. No-show event logging

When status changes to NO_SHOW:

Log via existing logging mechanism.

Add an entry in event change log with change_type=NO_SHOW.

FR-24. External source

Requirement notes “no show will come from an endpoint”; ensure the endpoint is authenticated and authorized (e.g., device token, tenant context).

3.7 Notifications (SendGrid & WhatsApp via Twilio)

FR-25. Email notifications (SendGrid)

Reuse existing SendGrid integration (API key & templates).

On meeting creation / reschedule / cancellation (according to business rules):

Send templated email to participants including:

Title, time (with timezone), room/device, organizer.

Google Meet / external meeting link if present.

Link to CORBI meeting details page (internal).

Notification preferences should be configurable per tenant (on/off, template IDs).

FR-26. WhatsApp notifications (Twilio)

On meeting cancellation:

Send WhatsApp message (via existing Twilio integration) to client’s phone:

State meeting was cancelled.

Include meeting link / internal link for details or rescheduling.

Handle Twilio delivery callbacks for logging if already supported.

FR-27. Deduping notifications

Use an internal notification log to prevent duplicate email/WhatsApp messages for the same change event (especially when triggered via webhook sync).

3.8 Data Storage & Fields

FR-28. Store all relevant calendar fields

For each event, store:

gcal_event_id, gcal_calendar_id

Title, description, location

Start/end (UTC + timezone)

Organizer and attendees (email, name, responseStatus)

Room/device mapping

created, updated, status

Recurrence rule (if any)

hangoutLink / online meeting URL

Google specific identifiers (etag, iCalUID, sequence) for concurrency control. 
Google for Developers
+1

FR-29. Extended metadata

Store internal metadata:

tenant_id, created_by_user_id, created_by_type (AI|Human), source (CORBI|External), no-show status, last_sync_time, etc.

3.9 ElevenLabs CRUD API

FR-30. Internal calendar API for AI

Expose internal REST endpoints for ElevenLabs/CORBI AI:

POST /api/v1/calendar/events – create meeting.

PATCH /api/v1/calendar/events/{id} – reschedule/update.

POST /api/v1/calendar/events/{id}/cancel – cancel (only if created_by_type=AI).

GET /api/v1/calendar/events – list events (filters by time, resource, status).

All endpoints:

Authenticated via service-to-service mechanism (e.g., API key / JWT).

Enforce business rule that AI can only cancel AI-created meetings.

FR-31. Error semantics for AI

API responses must include:

Clear error codes (e.g., CALENDAR_PERMISSION_DENIED, CONFLICT, INVALID_SLOT).

Human-readable messages to be converted into speech by ElevenLabs.

4. Non-Functional & Technical Requirements

NFR-1. Logging & observability

All calendar operations (success/failure) must use existing logging mechanism:

Include correlation ID, tenant ID, user/AI ID, operation type, external call status, latency.

Sensitive data (tokens, full headers) must not be logged.

Expose metrics for:

Number of events synced per day.

Webhook errors.

No-show counts.

NFR-2. Security

Tokens encrypted at rest and redacted in logs.

Webhook endpoint must be HTTPS and validate X-Goog-* headers to prevent spoofing. 
Google for Developers
+1

Rate limiting and basic WAF rules applied on calendar endpoints.

NFR-3. Performance & scalability

Use incremental sync + webhooks to avoid heavy polling and bandwidth usage. 
Google for Developers
+2
Google for Developers
+2

Background workers (Celery) should handle webhook processing, not the HTTP request thread.

NFR-4. Resilience

If webhook fails or sync token expires:

Fallback to full sync with proper backoff.

Protect against duplicate or out-of-order webhook notifications (idempotency).

NFR-5. Auditing & compliance

Maintain history of all meeting changes and no-show status for audit purposes.

Ensure GDPR/PDPA considerations: allow tenant to delete calendar data from CORBI if requested; Google data remains managed by Google.
