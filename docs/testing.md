# Testing Strategy (Corbi)

This document describes how we test Corbi end‑to‑end. It is written so Product Owners can read the scenarios, and engineers can wire the automation behind them. The goal is fast feedback (smoke) and confident coverage (regression) without brittle tests.

---
## Tooling

- **Backend**: `pytest` + `pytest-django`, hitting a Postgres test DB. Use factory/fixtures for org/user/membership and sample data (contacts, templates, campaigns, alerts).  
- **Frontend**: `vitest` + React Testing Library for component/logic tests.  
- **E2E/BDD**: Playwright + Behave (Gherkin). POs edit `.feature` files; glue lives in `steps/`. One browser per run, fresh page per scenario.  
- **API Contract**: Optional `schemathesis`/OpenAPI-based checks for request/response validation.  
- **Lint/format**: `ruff` (or `flake8`) and `npm run lint`.

---
## Repository Layout (proposed)
```
tests/
  backend/            # pytest suites
  frontend/           # vitest component tests
  e2e/
    features/         # .feature files (PO-owned)
      auth.feature
      contacts.feature
      messaging.feature
      campaigns.feature
      monitoring.feature
      settings.feature
    steps/            # Python glue for Playwright
      common_steps.py
      auth_steps.py
      contacts_steps.py
      messaging_steps.py
      campaigns_steps.py
      monitoring_steps.py
      settings_steps.py
    environment.py    # Playwright lifecycle (start/stop browser)
    README_E2E.md
  fixtures/
    seed.json / seed.py  # demo org/user + sample contacts/templates
```

---
## Environments & Data

- **DB**: Use Postgres for tests. Point `DATABASE_URL` at a dedicated test DB. Run migrations once per pipeline; each test function uses transactions.  
- **Media**: For tests, use in‑memory storage or a temp dir.  
- **Seeds**: Minimal seed for e2e: one org, one admin user, 2 staff, 1 viewer; sample contacts, groups, templates (email/whatsapp), one campaign, one alert.  
- **Secrets**: Fake/provider sandbox keys (SendGrid sandbox, Telegram bot test token, Twilio test creds). Avoid real sends in CI.

---
## Smoke vs Regression

- **Smoke** (fast, <5 min): Login, choose org, view dashboard (metrics non‑zero after seed), create contact, send one email job (stubbed webhook), view outbound log, open monitoring page, edit profile, view settings/branding.  
- **Regression** (deeper): All CRUD paths, validation errors, pagination/filtering, multi‑org isolation, campaign lifecycle, callbacks processing, monitoring ranges, notifications, identity dedupe.

Tag conventions (Behave): `@smoke`, `@regression`, `@critical`. Run with `behave --tags=@smoke` or `behave`. Single feature: `behave tests/e2e/features/contacts.feature`.

---
## Feature Coverage Matrix (what to test)

### Auth & Org Context
- Login success/failure, token refresh, redirect to requested URL (`next`).  
- Org switch sets `X-Org-ID` and data filters accordingly.  
- Session expiry → return to login (no blank screen).

### Contacts & Groups
- Create/edit/delete contact; required fields; per‑channel identifier validation.  
- Duplicate/conflict prevention (same email/phone/telegram/whatsapp).  
- Group create/edit/delete; assign/unassign contacts; filters by group; pagination + search.  
- Deep links: view/edit contact by URL; create contact page reachable directly.

### Messaging (Send Message)
- Channels: Email (SendGrid), Telegram, WhatsApp, Instagram (if enabled).  
- Send text + attachment (valid/invalid type/size).  
- Conversations: render inbound/outbound ordering; statuses (queued/sent/delivered/read/failed).  
- Background styling per channel (visual only).  
- Error surfaces: provider errors shown in UI/toast; failed message marked.

### Campaigns
- Create campaign: pick channel, multiple groups, dedupe recipients.  
- Throttle per channel/org displayed and applied.  
- Send triggers jobs; recipient table shows per‑recipient status (queued/sent/delivered/read/bounce/fail).  
- Status updates on SendGrid webhook: delivered, bounce, dropped, spamreport, open (first open only increments read).  
- Cost/targets: target count deduped across groups; estimated cost from cost.json markup.  
- Detail page progress bars accurate; “view details” deep link works.

### Templates
- Create/edit/approve template; enforce placeholders vs variables; footer unsubscribe link placeholder present.  
- Default template exists and is selected for email unless overridden.  
- Approval hides Approve button once approved; shows approved by/at.

### Integrations & Settings
- Connect/disconnect providers (WA, Telegram, Instagram, SendGrid, Google Calendar); tokens stored encrypted.  
- Branding upload: logo saved and shown in UI header; fetch logo URL works.  
- Profile: upload avatar, phone; display name (or username) shown; 401/403 handled.

### Inbound/Outbound Logs & Monitoring
- Inbound logs list inbound messages across channels; filtering, pagination.  
- Monitoring dashboard: metrics respond to date range (today/7d/30d); non‑zero after seed activity.  
- Provider events captured with latency; p95/p99 show tooltip; callback errors counted.  
- Alerts: list/filter/ack/resolve (when implemented).  
- Metrics include campaigns/email jobs (not just contacts/bookings/messages).

### Notifications
- Event producers emit notifications (campaign complete/fail, integration connect/disconnect, alert opened).  
- Bell/list shows unread counts; clicking marks read; deep link to entity.

### Compliance
- Bounce/opt‑out suppression enforced on send; unsubscribe link in email templates; global opt‑out respected.  
- Webhook handling updates suppression lists.

### Logging & Observability
- request_id present in logs; http logging middleware logs request/response in DEV, errors in non‑DEV.  
- Structured webhook logs include request_id and channel/provider IDs.

---
## Behave + Playwright Hooks (outline)

`tests/e2e/features/environment.py`:
- `before_all`: start Playwright, launch headless Chromium, store on context.  
- `before_scenario`: create new page `context.page`.  
- `after_scenario`: close page.  
- `after_all`: close browser, stop Playwright.

Common steps (`steps/common_steps.py`):
- Given I am on the login page  
- When I sign in as "<user>"  
- Then I should see "<text>"

Channel-specific steps go in dedicated step files (auth, contacts, messaging, campaigns, monitoring, settings).

---
## Running Tests

Backend unit/API (from backend/):  
```
pytest
```

Frontend unit (from frontend/):  
```
npm run test
```

E2E (from repo root, after installing playwright browsers):  
```
behave --tags=@smoke
behave                      # full
behave tests/e2e/features/campaigns.feature
```

Playwright install (once):  
```
pip install -r tests/requirements.txt
playwright install
```

Optional Make targets/scripts can wrap these (e.g., `make test-smoke`, `make test-regression`, `make test-backend`, `make test-frontend`).

---
## CI Suggestions

1) Lint/format: ruff (or flake8), npm run lint.  
2) Backend pytest (parallel).  
3) Frontend vitest.  
4) E2E smoke (Playwright) against a seeded test deployment.  
5) Artifact: screenshots/videos on failure (Playwright).  

---
## What POs Can Edit

- `.feature` files only. They can add scenarios in plain Given/When/Then language, tag them (@smoke/@regression), and rerun `behave`.  
- Step library stays stable; engineers extend it when new phrases are needed.

---
## Open Items to Automate Later

- Full provider sandbox flows (Telegram/WhatsApp/Instagram callbacks) in CI.  
- Load/perf sampling for bulk campaigns.  
- Visual regression for key pages (login, dashboard, send message, campaign detail).
