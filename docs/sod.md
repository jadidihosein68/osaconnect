# Solution Overview Document (SOD)

This document summarizes the current solution: a multi-tenant messaging and automation platform with unified channels, campaigns, monitoring, and branding.

## Core Capabilities
- **Multi-tenant, role-based access**: Organizations, memberships, roles, and org-scoped data across all modules.
- **Authentication & SSO hooks**: Username/password with JWT; placeholders for Microsoft/Google SSO start endpoints.
- **Messaging Hub**:
  - Channels: Email (SendGrid), WhatsApp (Twilio), Telegram bot, Instagram DM.
  - Send single messages with attachments (channel-specific support), per-channel throttling, and suppression checks.
  - Conversations for WA/Telegram/Instagram with live polling and attachment previews.
- **Campaigns**:
  - Multi-channel campaigns (Email/WhatsApp/Telegram/Instagram) with target groups and cost estimation.
  - SendGrid callbacks update per-recipient status (delivered, bounced, spam, open) and auto-complete campaigns.
  - Recipient status table, KPIs (sent/delivered/read/failed), and cost/target counts.
- **Templates**:
  - Reusable templates with variables, placeholders validation, approval flow, default template, footer with unsubscribe link placeholder.
  - Preview and approval actions; metadata (approved by/at).
- **Contacts & Groups**:
  - Org-scoped contacts with de-duplication rules and per-channel identifiers (email, phone, WhatsApp, Telegram chat, Instagram).
  - Contact groups (many-to-many) with colors, filters, and assignment via UI.
- **Inbound & Outbound Logs**:
  - Inbound messages stored for WA/Telegram; outbound logs per channel; email job details.
- **Monitoring & Dashboard**:
  - Metrics endpoints with date ranges; counts for contacts, bookings, inbound/outbound, campaigns, email jobs, alerts.
  - Monitoring dashboard cards (totals, latency percentiles when ProviderEvents have latency, callback errors).
  - Alerts listing with acknowledge action.
- **Branding & Profile**:
  - Org branding (logo, company info); logo shown in header/side bar.
  - User profile with avatar upload and phone; header avatar reflects uploads.
- **Notifications**:
  - Backend model/API plus bell dropdown and list page; campaign completion emits notifications (other producers pending).
- **Logging & Observability**:
  - Structured logging with request_id; rotating application logs.
  - HTTP logging middleware (DEV full bodies; PROD errors/webhooks with truncation).
  - Webhook-specific logging for SendGrid/other providers.
- **Compliance**:
  - Unsubscribe link placeholder in email footer; suppression checks (bounces/opt-outs) applied before send (email/WA).
  - CSP middleware (dev relaxed, prod stricter) to reduce eval warnings.

## Frontend Highlights
- React + Vite SPA with protected routes and deep-link handling for login redirect.
- Pages: Dashboard, Contacts (All/Groups/Telegram Onboarding), Messaging (Send, Campaigns, Email Logs, Outbound Logs), Inbound Logs, Templates, AI Assistant (placeholder), Bookings, Monitoring, Billing (placeholder), Settings, Notifications, Profile.
- Channel-themed conversation UI, rich email editor, attachment uploads, campaign cards/list/detail, tooltips for KPIs.

## Pending / Known Gaps
- AI Assistant remains stubbed (KB search and model integration pending).
- Notifications: only campaign completion emits events; other producers (integrations, monitoring alerts) not wired.
- Opt-out UI/global suppression management is minimal.
- Calendar/provider integrations (Google/Microsoft) not implemented.
- Some monitoring charts rely on ProviderEvent latency; may show zero if not populated.
- Tests and seed data are minimal; CI not configured.
- Additional security hardening (prod CSP, rate limiting) may be needed for production.

## Setup Notes
- Backend requires PostgreSQL via `DATABASE_URL`; run migrations to create schema.
- Install requirements (`pip install -r backend/requirements.txt`), ensure Pillow and psycopg2-binary are installed.
- Configure SendGrid, Twilio WhatsApp, Telegram bot, Instagram credentials in `.env`.
- Set public webhook URLs (SendGrid event webhook to `/api/callbacks/sendgrid/`, Twilio WhatsApp webhook/status, Telegram onboarding webhook, Instagram webhook per blueprint).
