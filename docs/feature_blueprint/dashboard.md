# Dashboard & Monitoring Requirements (Corbi)

## Purpose
Unify product expectations for the dashboard, metrics API, and monitoring UX so that engineers can close the current gaps (campaign/email analytics, alerting, callback latency, failure drilldowns).

## Scope
- Backend metrics and monitoring APIs.
- Frontend dashboard widgets and drilldowns.
- Alerting/notification behavior.
- Data sources: messaging (all channels), campaigns/email jobs, bookings, contacts, AI/billing (future), callback events.

## Current State (observed)
- `/api/metrics/` returns counts for contacts, bookings, inbound, outbound messages only.
- Monitoring alerts are minimal; no latency/failure reason charts; no campaign/email/job visibility.
- Callback events are persisted (e.g., SendGrid), but not surfaced in monitoring.
- No alert escalation/ack flows.

## Functional Requirements
1) **Metrics Coverage**
   - Extend `/api/metrics/` (or `/api/monitoring/summary/`) to include:
     - Campaigns: total, sent, delivered, failed, read/open, unsubscribed.
     - Email jobs/recipients: queued, sent, delivered, bounced/dropped/spam, opened.
     - Channel breakdown: WA/Telegram/Instagram/Email inbound/outbound counts.
     - Callback latency percentiles (p50/p95/p99) per channel.
     - Alerts count by severity (open/acked/resolved).
   - All metrics scoped by organization.

2) **Monitoring Details Endpoint**
   - Add `/api/monitoring/details/` (if not present) that returns:
     - Time-series per channel (sent/delivered/failed) for configurable window.
     - Failure reasons top-N (per channel).
     - Callback latency histogram/percentiles.
     - Recent alerts and their statuses.
   - Supports `channel`, `from`, `to`, `interval` query params.

3) **Alerts Feed**
   - `/api/monitoring/alerts/` should support:
     - Filters: severity, status (open/acked/resolved), channel, date range.
     - Actions: ack, resolve, re-open.
     - Payload includes: title, description, channel, severity, status, created_at, updated_at, request_id (if applicable), related object (campaign/email_job/outbound_message).
   - Optional webhook/email notifications (configurable `ALERTS_EMAIL_TO`/webhook URL).

4) **Dashboard UI**
   - Summary cards show: Contacts, Bookings, Inbound, Outbound, Campaigns, Email Jobs, Alerts.
   - Channel charts: stacked sent/delivered/failed per channel; top failure reasons; callback latency chart.
   - Alerts panel: list with severity pills and quick ack/resolve.
   - Deep links to drilldowns: Monitoring Details, Campaigns, Email Logs, Outbound/Inbound logs.

5) **Campaign & Email Analytics**
   - Surface campaign/job delivery and open/read in dashboard aggregates.
   - Include unsubscribed counts.
   - Counts update from provider callbacks (e.g., SendGrid).

6) **Data Freshness**
   - Metrics endpoints support a `force_refresh` or cache TTL; document defaults.
   - Frontend polling/refresh interval configurable (e.g., 30–60s for dashboard, 5–10s for alert feed).

7) **Latency & Failure Reasons**
   - Track callback latency per provider event; store latency_ms in ProviderEvent (already present for some channels).
   - Expose aggregated latency percentiles in monitoring endpoints.
   - Normalize failure reasons (bounce, blocked, opt-out, invalid, rate-limit, network, unknown).

8) **Org & Auth**
   - All metrics/alerts filtered by organization (via `X-Org-ID` or single membership).
   - Respect roles: viewer (read-only), admin (ack/resolve alerts, view all).

9) **Alert Sources & Severity**
   - Trigger alerts from: provider callback failures, delivery/bounce spikes, booking errors, assistant/LLM errors, missing integration credentials, webhook downtime, and sustained latency above thresholds.
   - Define default severities: info (non-blocking, FYI), warn (degraded), critical (failure or sustained SLA breach).
   - Allow configurable thresholds per org/channel; document defaults.

10) **Retention & Windows**
   - Define default lookbacks for dashboard/drilldowns (e.g., 24h, 7d, 30d) and expose selectable windows in the UI.
   - Establish retention/rollup policy for monitoring data (e.g., raw events kept 30d, then rolled up to daily aggregates for 12 months).

## Non-Functional
 - Pagination on alerts feed; reasonable defaults (`limit`, `offset`).
 - Avoid heavy DB scans: consider summarized tables or nightly rollups if needed.
 - Logging: include request_id in all monitoring responses; errors should be logged with status/reason (already in logging blueprint).

## Acceptance Criteria
 - Dashboard shows campaign/email metrics (sent/delivered/open/failed/unsub) and alert counts.
 - `/api/metrics/` (or summary endpoint) includes campaigns/email jobs and alerts.
 - Monitoring details endpoint exposes channel time-series, failure reasons, latency percentiles.
 - Alerts API supports list + ack/resolve with org scoping.
 - UI offers drilldowns and filters, with data refreshing on a set interval.
 - All data is org-scoped and respects user roles.
