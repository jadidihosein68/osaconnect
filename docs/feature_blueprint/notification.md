1. Multi-Tenant Notification Bell – Product Requirements
1.1 Scope & Context

Corbi is org-scoped via X-Org-ID + JWT.

The notification bell is always per organization:

Badge count = unread notifications for current user in current org.

When user switches org (header/org switch), the bell must refresh and show that org’s count.

1.2 Bell Behavior

Bell in the top navigation (same bar as Dashboard / Contacts / Messaging).

Badge logic:

No badge if unread = 0.

Show numerical badge for 1–99.

Show “99+” for ≥100.

Click bell → open dropdown for current org, current user:

Show last 20 notifications.

Sorted by created_at desc.

“View all notifications” link → /notifications.

1.3 Notification Item UX

Each notification row shows:

Title (1 line, required).

Body/description (optional, 1–2 lines, truncated).

Type chip: e.g. System, Campaign, Bookings, Integrations, Billing, Monitoring.

Time (relative, e.g. “5 min ago” from ISO timestamp).

Read state:

Unread: bold title + subtle background/left border.

Read: normal text.

Click behavior:

Clicking row:

Marks notification as read.

Navigates to target_url if present (e.g. /messaging/campaign/8).

Optional overflow menu for “Mark as unread” (from detail page or dropdown).

1.4 Read / Unread Semantics

Per user, per org:

Read state is specific to (user, org, notification).

When:

User opens a notification detail (by clicking row) → mark read.

User hits “Mark all as read” in the dropdown or list page → mark all unread for that (user, org) as read.

Badge count and list must update in real time on:

New notification created for that (user, org).

Read/unread changes from any tab for same (user, org).

1.5 Notification Types & Corbi Events

Types (string/enum) should align with Corbi domains:

SYSTEM – global system messages (limits, system maintenance).

CAMPAIGN – campaign created, completed, partially failed.

OUTBOUND – send failures above threshold, throttling hit.

INBOUND – important inbound events (e.g. “New booking from contact X”, optional).

BOOKINGS – booking created/changed/cancelled.

INTEGRATION – provider disconnected, token expired, auth failure.

BILLING – AI usage spike, quota warnings.

MONITORING – alerts from /api/monitoring/alerts/ (e.g. provider failures).

Severity:

LOW | MEDIUM | HIGH | CRITICAL

CRITICAL (e.g. integration disconnected / error rate spike) may be pinned to top or highlighted.

1.6 Full Notifications Page

Route: /notifications (auth + X-Org-ID required).

Features:

List of notifications for (user, org).

Filters:

Type (multi-select).

Severity.

Read state (All, Unread only).

Date range.

Bulk actions:

Multi-select rows → Mark as read / unread.

Pagination (React Query + cursor or page/size).

2. Multi-Tenant Semantics & Targeting
2.1 Targeting Modes

The backend must support these target scopes:

User-level: a single user in a specific org.

Org-wide broadcast: all users in an org (e.g. integration expiring, campaign failure summary).

Role-filtered broadcast (later): e.g. only ORG_ADMIN members get certain notifications.

2.2 Multi-Org Membership

A user can have multiple org memberships.

Notifications are tied to a specific org:

A campaign failure in Org A should not be visible when the user is currently acting under Org B.

When user switches org in the UI:

Frontend reloads /api/notifications/summary + /api/notifications using new X-Org-ID.

3. Django Data Model (Conceptual, Multi-Tenant)

Corbi already scopes core models to Organization. Follow the same pattern.

3.1 Models

Organization (existing)

User (existing)

OrganizationMembership (existing, or similar)

Notification (org-scoped logical event)

id

organization → FK Organization

created_at

type (choice: system/campaign/…)

severity (choice: low/medium/high/critical)

title

body

target_url (nullable)

data (JSONField; extra context like {"campaign_id": 8, "channel": "whatsapp"})

created_by → optional FK User or NULL for system-generated

NotificationRecipient (per-user state)

id

notification → FK Notification

user → FK User

organization → FK Organization (denormalised for indexes & safety)

read_at (nullable)

deleted_at (nullable, if you support soft delete)

Best practice for Corbi:

All queries and writes must filter on both organization and user on NotificationRecipient.

Never expose Notification that belongs to another org, even if a NotificationRecipient is misconfigured.

3.2 Indexing

On NotificationRecipient:

Index (organization, user, read_at, created_at)

Optional index (organization, user, read_at IS NULL) for unread queries.

On Notification:

Index (organization, created_at)

Optional (organization, type) and (organization, severity).

4. Django API Design (Org-Aware)

All endpoints require:

Authenticated user (SimpleJWT).

X-Org-ID in header.

Middleware already resolves request.organization and ensures membership — reuse that.

4.1 Suggested Endpoints

1. Summary

GET /api/notifications/summary/

Input: X-Org-ID

Output:

{ "unread_count": <int> }

Implementation:

Count NotificationRecipient where:

organization = request.organization

user = request.user

read_at IS NULL

deleted_at IS NULL

2. List

GET /api/notifications/

Query params:

page, page_size

type (optional, multiple)

severity (optional)

read (true|false|all, default all)

from, to (dates)

Output:

Paginated list of NotificationRecipient with embedded notification data:

id (recipient id)

read_at

notification: { id, title, body, type, severity, target_url, created_at, data }

Filter:

organization = request.organization

user = request.user

3. Mark Single Read/Unread

POST /api/notifications/{recipient_id}/read/

Body:

{ "read": true } or { "read": false }

Rules:

Must verify that the NotificationRecipient belongs to (request.user, request.organization).

Idempotent: multiple calls should not break.

4. Mark All as Read

POST /api/notifications/mark-all-read/

Marks all unread for (user, org) as read.

Should be implemented as a bulk update with a max limit (e.g., “only last 1000”) to protect DB.

5. Admin/System Create Notification

POST /api/notifications/broadcast/ (org admin only)

Payload:

scope: "user" | "org"

user_id (required if scope="user")

type, severity, title, body, target_url, data

Behavior:

Creates Notification under request.organization.

If scope="org":

Fetch all active members for that org.

Bulk-insert NotificationRecipient rows.

If scope="user":

Create a single NotificationRecipient.

6. Real-Time Stream

GET /api/notifications/stream/ (WebSocket or SSE)

Requires JWT + X-Org-ID.

Only sends events to (user, org).

Event payloads:

New notification:

{
  "event": "notification_created",
  "notification": { ... },
  "recipient_id": "<uuid-or-int>",
  "unread_count": 7
}


Read state change:

{
  "event": "unread_count_updated",
  "unread_count": 3
}

5. Python / Django Best Practices (Multi-Tenant)
5.1 Service Layer

Introduce a NotificationService (plain Python class or Django service module) with org-aware methods:

create_for_user(org, user, type, severity, title, body, target_url=None, data=None)

broadcast_to_org(org, type, severity, title, body, target_url=None, data=None, roles=None)

mark_read(org, user, recipient_id, read=True)

mark_all_read(org, user)

Rules:

Every public method requires org and user explicitly.

The service never accepts raw IDs without validating org membership.

5.2 Celery / Async Integration

Use Celery tasks for heavy or high-volume generations:

Example: campaign completes → Celery task fetches relevant org members → calls broadcast_to_org.

If Celery is “stubs” now, keep interfaces ready:

The synchronous path should still be safe and quick at Corbi MVP scale.

5.3 Hooking into Existing Corbi Events

Wire notification creation at key points:

Campaign:

On creation: type="CAMPAIGN", severity="LOW": “Campaign X created (WhatsApp · 1,230 contacts)”.

On completion: “Campaign X completed · 92% success · 8% failed”.

On abnormal failure rate: severity HIGH/CRITICAL, notify org admins.

Integrations:

/api/integrations/{provider}/connect/: success notification.

Token expired / disconnect / repeated failures: INTEGRATION, CRITICAL, org admin broadcast.

Bookings:

Booking canceled / failed sync to Google: BOOKINGS, MEDIUM.

Monitoring:

On new alert in /api/monitoring/alerts/: create MONITORING notification for org admins.

Billing:

When billing/logs show unusual AI spend (threshold): BILLING, HIGH.

5.4 Security & Isolation

Use a multi-tenant base queryset helper you likely already use:

e.g., NotificationRecipient.objects.for_org_user(request.organization, request.user).

Never trust X-Org-ID alone:

Confirm request.user has membership to the org.

Ensure any recipient_id lookup always filters by both org and user.

5.5 Retention & Cleanup

Define retention config, e.g. NOTIFICATIONS_RETENTION_DAYS=90.

Periodic task:

Delete or archive NotificationRecipient older than retention.

Optionally delete orphaned Notification records with no recipients.

6. Frontend Notes (React + React Query)

Just to align with backend:

All notification queries use:

JWT Authorization header.

X-Org-ID from current org context.

Hooks:

useNotificationSummary(orgId) → calls /api/notifications/summary/.

useNotifications(orgId, filters) → calls /api/notifications/.

When org changes:

Invalidate both queries and reconnect WebSocket with new orgId.

When user clicks a notification:

Optimistically mark as read in React Query cache.

Navigate to target_url if provided.