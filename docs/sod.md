# Solution Overview Document (SOD)

This document summarizes the current solution: a multi-tenant messaging and automation platform with unified channels, campaigns, monitoring, and branding.

## Core Capabilities
- **Multi-tenant, role-based access**: Organizations, memberships, roles, org-scoped data across all modules.
- **Authentication & SSO hooks**: Username/password with JWT; redirect-preserving login; placeholders for Microsoft/Google SSO start endpoints.
- **Messaging Hub**:
  - Channels: Email (SendGrid), WhatsApp (Twilio), Telegram bot, Instagram DM.
  - Single-send with attachments (channel-specific), throttling, suppression checks.
  - Conversations for WA/Telegram/Instagram with polling and attachment previews.
- **Campaigns**:
  - Multi-channel campaigns (Email/WhatsApp/Telegram/Instagram), target groups, cost estimation.
  - SendGrid webhooks drive per-recipient status (delivered/bounce/spam/open) and campaign completion.
  - Recipient table + KPIs (sent/delivered/read/failed), cost/target counts.
- **Templates**:
  - Reusable templates with variable validation, approval flow, default template, footer with unsubscribe placeholder.
  - Preview, approve; metadata (approved by/at).
- **Contacts & Groups**:
  - Org-scoped contacts with de-duplication per channel (email/phone/WA/Telegram/Instagram).
  - Groups many-to-many with colors, filters, bulk assign.
- **Inbound & Outbound Logs**:
  - Inbound for WA/Telegram; outbound per channel; email job details.
- **Monitoring & Dashboard**:
  - Metrics endpoints with date ranges; counts for contacts, bookings, inbound/outbound, campaigns, email jobs, alerts.
  - Monitoring cards (totals, latency p95/p99 when ProviderEvents include latency, callback errors) and alerts list with acknowledge.
- **Bookings & Calendar**:
  - Internal booking UI (custom vs room/device) with Google Calendar integration; cancel keeps event IDs, delete hard-deletes.
  - Public Calendar API (v1) for external callers: create, reschedule, cancel bookings; list slots; Google event updates.
- **Branding & Profile**:
  - Org branding (logo/company info) shown in header; user profile avatar/phone.
- **Developers / API Keys**:
  - Org-admin-managed API keys (list/create/revoke/regenerate, hashed storage) with Developers page UI.
- **Notifications**:
  - Model/API plus bell and list; campaign completion emits notifications (others pending).
- **Logging & Observability**:
  - Structured logs with request_id, rotating files; HTTP logging middleware (DEV full bodies, PROD error/webhook snippets); webhook logs.
- **Compliance & CSP**:
  - Unsubscribe placeholder and suppression checks for email/WA; CSP middleware (dev relaxed, prod stricter to avoid eval).

## Frontend Highlights
- React + Vite SPA with protected routes and deep-link handling for login redirect.
- Pages: Dashboard, Contacts (All/Groups/Telegram Onboarding), Messaging (Send, Campaigns, Email Logs, Outbound Logs), Inbound Logs, Templates, AI Assistant (placeholder), Bookings, Monitoring, Billing (placeholder), Settings, Notifications, Profile.
- Channel-themed conversation UI, rich email editor, attachment uploads, campaign cards/list/detail, tooltips for KPIs.

## Pending / Known Gaps
- AI Assistant still stubbed (KB + provider integration pending).
- Notifications: only campaign completion fires; integrations/monitoring producers not wired.
- Opt-out UI/global suppression minimal.
- Calendar: Microsoft not implemented; token refresh/rotation hardening still needed.
- Monitoring charts show zero until ProviderEvents carry latency/failure data.
- Tests/seed/CI minimal; security hardening (prod CSP, rate limiting) still needed.
- Developer API keys: no usage analytics yet; keys are hashed, but rotation/expiry policies are manual.

## Setup Notes
- Backend expects PostgreSQL via `DATABASE_URL`; run migrations.
- Install deps: `pip install -r backend/requirements.txt` (includes drf-spectacular for Swagger).
- Configure SendGrid, Twilio WhatsApp, Telegram bot, Instagram creds in `.env`.
- Webhooks: SendGrid → `/api/callbacks/sendgrid/`; Twilio WA webhook/status; Telegram onboard; Instagram webhook.
- Swagger/Redoc: `/api/docs/swagger/`, `/api/docs/redoc/`; schema at `/api/schema/`.
- Calendar: set Google creds per integration docs; public Calendar API lives under `/api/public/v1/...`.
