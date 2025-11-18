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
- Minimal validation only; no external calls by default.

## Model
- `Integration`: organization FK, provider (choices), `token_encrypted`, `extra` (JSON), `is_active`, timestamps. Unique (organization, provider).

## Env
- `FERNET_KEY` (required) for token encryption. Generate with `python - <<'PY'
from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
PY`

## Logging
- Audit logger `corbi.audit` records connect/disconnect events with org, user, provider, redacted tokens.
