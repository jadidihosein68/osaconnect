1. Scope & Objectives

Implement Google Calendar integration in CORBI (Django + React) so that:

Users, admins, rooms, and devices are all schedulable via Google Calendar.

CORBI stays in two-way sync with Google Calendar (UI + webhooks).

AI agents (ElevenLabs / CORBI AI) can safely create/manage meetings via internal CRUD APIs.

Existing logging, SendGrid, Twilio (WhatsApp), and “connection” models are reused.

Best practices are followed for OAuth2, sync, webhooks, auditing, and multi-tenant safety. 
Google for Developers
+2
Google for Developers
+2

2. Actors & Roles

End User

Books / edits meetings.

Books rooms and devices.

Views their own calendar and bookings.

Admin User

Onboards rooms and devices.

Views calendars for all rooms/devices.

Manages Google connection for the tenant (if necessary).

AI Agent (ElevenLabs / CORBI AI)

Uses internal CRUD APIs to create/reschedule/cancel AI-owned meetings only.

System / Scheduler Jobs

Syncs with Google via webhooks + incremental sync.

Executes nightly “no-show” evaluation.

3. Functional Requirements
3.1 Google Auth & Connection Management

FR-1. Reuse existing Google connection

System must read Google Calendar credentials (access token, refresh token, scopes, expiry, etc.) from the existing connection records in DB, not create a new schema.

If calendar scope is missing, the system must trigger a re-consent flow.

FR-2. OAuth 2.0 with offline access

Use OAuth 2.0 with access_token + refresh_token and offline access to call Google Calendar even when user is not online. 
qalbit.com

Store tokens encrypted at rest in DB (following existing secrets policy).

FR-3. Least privilege scopes

Use https://www.googleapis.com/auth/calendar.events (or tighter if possible) rather than full calendar scope, unless room/device provisioning requires more. 
Google Cloud

FR-4. Token refresh

Backend must automatically refresh access tokens on 401/invalid_grant and persist the new tokens.

All calendar calls must be wrapped in a common service that handles token refresh and error mapping.

FR-5. Multi-tenant isolation

All calls must be scoped by tenant & connection ID; no tokens shared across tenants.

3.2 Room / Device Onboarding

FR-6. Onboard room/device

Admin can onboard a room or device in CORBI with:

Name, type (room/device), capacity (for room), description.

Associated Google Calendar ID (either:

Select from user’s accessible calendars, or

Create a dedicated calendar via API if allowed by workspace). 
Google Cloud

Store mapping in DB: resource_id, resource_type, gcal_calendar_id, tenant_id.

FR-7. Validation

On save, system must validate that the given Google calendar ID is accessible with current credentials (via a simple calendars.get). 
Google Cloud

FR-8. Disable/retire resource

Admin can disable a room/device. Disabled resources:

Remain in DB for history.

Cannot be booked for new meetings.

3.3 Meeting CRUD (Set / Edit / Delete) + Policies

FR-9. Create meeting (CORBI)

Users (or AI) can create meetings via CORBI UI/API with:

Title, description, start/end time, time zone, participants (emails), room/device, location, meeting link (if any), custom metadata (e.g. tags, correlationId).

System:

Creates event in Google Calendar using events.insert for both:

User primary calendar (if required) and/or

Resource calendar for room/device. 
Google Cloud

Persists local event record with:

local_event_id, gcal_event_id, calendar_id, resource_id, created_by, created_by_type (AI|Human), status, timestamps, etag/sync_token or updated fields.

FR-10. Edit meeting

Editable fields: title, description, time, participants, room/device, meeting link.

Editing from CORBI updates both:

Google Calendar event via events.update/patch.

Local DB record with updated metadata + audit log.

If Google rejects update (e.g., permissions), we must log and show user error.

FR-11. Delete / cancel meeting

Business rule:

Meetings created by AI: can be cancelled by AI or user within CORBI.

Meetings created by human in CORBI: cannot be cancelled automatically by AI; only:

The human via CORBI UI, or

Any actor via Google’s own UI (we mirror the change).

System must:

Call events.delete or set status=cancelled depending on business preference, but maintain local status as CANCELLED. 
Google Cloud

Audit “cancelled_by” (AI, human, external Google UI via webhook).

FR-12. External deletions / changes

If Google Calendar event is deleted/updated externally, webhook + incremental sync must:

Detect the change.

Update local DB to reflect new status/time.

Trigger notification logic (e.g. cancellation notices) if configured.

FR-13. Track created / updated / deleted

For each meeting, maintain a change log:

event_change_id, event_id, change_type (CREATED|UPDATED|CANCELLED|RESCHEDULED), actor_type (USER|AI|SYSTEM|EXTERNAL), timestamp, diff snapshot.

Log entries must be written using existing logging framework and stored in DB for analytics.

3.4 Calendar UI (Rooms & Devices)

FR-14. Resource calendar view

React UI to:

Select Room OR Device.

See all bookings for selected resource in a weekly/daily view:

Time slots, current status (Booked, Available, No-Show, Cancelled, Completed).

Meeting title and organizer.

FR-15. Slot selection & booking

User can:

Pick date and time slot on selected resource’s calendar.

Create a new event (see FR-9) from that slot.

UI must prevent overlapping bookings:

Use Google Calendar freebusy.query or existing event list to validate before final confirmation. 
Google for Developers

FR-16. Admin overview

Admin can:

Filter by resource (room/device) and date range.

View occupancy analytics (e.g., number of bookings per day).

3.5 Webhooks & Sync with Google Calendar

FR-17. Google Calendar webhooks

Implement webhook endpoint(s) to receive push notifications from Google Calendar via events.watch on each relevant calendar (user primary / resource calendars). 
Google for Developers
+2
Google for Developers
+2

Endpoint must:

Verify headers (X-Goog-Channel-ID, X-Goog-Resource-ID, etc.).

Log receipt and quickly return 2xx to avoid retries.

FR-18. Incremental sync

On each webhook notification:

Use events.list with syncToken or updatedMin (last sync time) to fetch changed events. 
Latenode Official Community
+4
Google for Developers
+4
Google Developers Blog
+4

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