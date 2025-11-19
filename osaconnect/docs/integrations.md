# Integrations API (MVP)

Base: `/api/integrations/` — requires auth + org (`X-Org-ID`) and org admin role for write.

Providers: `whatsapp`, `sendgrid`, `telegram`, `instagram`, `google_calendar`

## Endpoints
- `GET /api/integrations/` — list current integrations for org (no tokens returned).
- `POST /api/integrations/{provider}/connect/` — save/overwrite token and metadata.
  - Body: `{ "token": "...", "extra": { ... } }`
  - Response: `{ status: "ok", ok: true, message, integration: { provider, is_active, extra, created_at, updated_at } }`
- `DELETE /api/integrations/{provider}/` — disconnect (soft delete / disable).
  - Response: `{ status: "ok", ok: true, message: "Disconnected" }`

Notes:
- Tokens are encrypted at rest and never returned. Logs redact tokens.
- Unique per org+provider; connect overwrites existing token/extra and activates.
- Backend now uses these credentials for outbound messaging (Twilio WhatsApp, SendGrid email, Telegram bot, Instagram Graph) and Google Calendar sync. The Settings “Test Connection” button hits the same provider APIs used in production sends.

## Model
- `Integration`: organization FK, provider (choices), `token_encrypted`, `extra` (JSON), `is_active`, timestamps. Unique (organization, provider).

## Env
- `FERNET_KEY` (required) for token encryption. Generate with `python - <<'PY'
from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
PY`

## Logging
- Audit logger `corbi.audit` records connect/disconnect events with org, user, provider, redacted tokens.

## Provider Field Guide

| Provider | Required token | Required `extra` fields | Usage |
| --- | --- | --- | --- |
| `whatsapp` | Twilio Auth Token | `account_sid`, `from_whatsapp` (Settings test also needs `to_whatsapp`) | Outbound messages sent via Twilio WhatsApp Business |
| `sendgrid` | SendGrid API key | `from_email` (Settings test also needs `to_email`) | Outbound email notifications via SendGrid |
| `telegram` | Bot token from BotFather | `chat_id` (Settings test) | Outbound Telegram bot messages |
| `instagram` | Meta Graph access token | `instagram_scoped_id` (business/thread) | Instagram messaging via Graph API |
| `google_calendar` | OAuth access token | `calendar_id` (`primary` default) | Booking sync via Google Calendar API |

Settings stores these values via `/api/integrations/...`. Outbound messaging, calendar automation, and monitoring rely on active integrations. Use `/health/` to check pending migrations and `/api/integrations/` to review configured providers.
