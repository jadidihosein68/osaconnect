## Task: Refactor logging & webhook logging for Corbi

### Project Context

- Backend: **Django**, main settings file: `corbi/settings.py`
- Logs directory: `BASE_DIR / "logs"` (already defined as `LOG_DIR`)
- Current logging:
  - Uses `TimedRotatingFileHandler` writing to:
    - `logs/corbi.log`
    - `logs/corbi-errors.log`
  - Formatter: `"[{asctime}] {levelname} {name}: {message}"` with `style="{"`
  - Handlers:
    - `console` (INFO+)
    - `file` (`corbi.log`, INFO+)
    - `error_file` (`corbi-errors.log`, WARNING+)
  - Loggers:
    - `django`
    - `django.request` (ERROR, no propagate)
    - `corbi.audit`
- Webhook code is under: `messaging/callbacks.py`
  - There is a module logger via `logger = logging.getLogger(__name__)`
  - `ProviderCallbackView` and `SendGridEventView` currently:
    - log and **print** raw request bodies and content type
    - have tolerant JSON/NDJSON parsing to avoid unnecessary 400s
  - SendGrid logic updates:
    - `EmailRecipient` and `CampaignRecipient` (delivered / open / bounce/drop/spamreport)
    - `Suppression` table for failed emails
    - campaign counters: `delivered_count`, `failed_count`, `read_count`
  - Business rules:
    - Multiple opens do **not** increment `read_count` more than once
    - Delivered events don’t downgrade a `read` status
    - Bounce/drop/spamreport mark recipient failed and increment `failed_count` once per recipient





### 1. Objectives

Refactor Corbi logging so that it:

1. Follows best practices for a webhook-heavy, multi-integration system.
2. Removes temporary `print()` debugging and uses **consistent, structured logs**.
3. Makes webhook flows observable: trace each event provider → backend → DB updates.
4. Is safe in production: avoids logging secrets/PII and is environment-aware.
5. Uses **generic log file names** (no `corbi` in filenames) with **daily rotation** and bounded retention.

---

## 2. Scope

Changes must be limited to:

1. **Global logging config** in `corbi/settings.py`.
2. **Webhook handlers** in `messaging/callbacks.py`, especially:
   - `ProviderCallbackView`
   - `SendGridEventView`
3. Any logging added around `EmailRecipient`, `CampaignRecipient`, and `Suppression` updates for SendGrid events.
4. A new **request ID middleware** (if needed) and adding it to `MIDDLEWARE`.

Do **not** change the underlying business logic (status transitions, counters, etc.); only improve logging.

---

## 3. Global Logging Configuration Requirements (`corbi/settings.py`)

### 3.1 Goals

- Use **daily rotated log files** so no file grows indefinitely.
- Use **generic, clear file names** (no `"corbi"` in the filename).
- Keep separate logs for:
  - general application activity (INFO/DEBUG),
  - warnings/errors (including stack traces).
- Make behavior configurable per environment (DEV / PROD).

### 3.2 Log File Location & Naming

- All backend logs must be written under:

  - `backend/logs/` (this is already `LOG_DIR`).

- Replace old names like:

  - `corbi.log.YYYY-MM-DD`
  - `corbi-errors.log.YYYY-MM-DD`

- With the following **generic naming convention**:

  - **Application info log (main log)**  
    - Base file name: `application.log`  
    - Rotated pattern (by `TimedRotatingFileHandler`): `application.log.YYYY-MM-DD`  
    - Contains `INFO` (and optionally `DEBUG` in DEV) and above.

  - **Application error log**  
    - Base file name: `application-errors.log`  
    - Rotated pattern: `application-errors.log.YYYY-MM-DD`  
    - Contains `WARNING` and `ERROR` logs (including stack traces).

### 3.3 Rotation & Retention

- Use `TimedRotatingFileHandler` for both handlers with:

  - `when="D"` (daily rotation).

- Rotation happens at midnight (Django / Python default).
- Configure retention via `backupCount`:

  - Keep **14–30 days** of logs per handler (target: 30).
  - Older log files are automatically deleted after the retention window.

**Objective:**

- Each day has fresh log files.
- Disk usage is bounded.
- No single log file grows without limit.

### 3.4 Log Levels & Handlers

Implement handlers roughly as:

- **Application info log handler** (for `application-YYYY-MM-DD.log`):

  - Level: `INFO` (may capture `DEBUG` in DEV if needed).
  - Writes normal application events, webhook processed events, etc.

- **Application error log handler** (for `application-errors-YYYY-MM-DD.log`):

  - Level: `WARNING`.
  - Captures:
    - all `WARNING` and `ERROR` logs,
    - Django request errors (500s from `django.request`),
    - stack traces (via `exc_info=True`).

- **Console handler**:

  - In **DEV** (`DEBUG=True`):
    - Enabled at `DEBUG` or `INFO` for easier local debugging.
  - In **PROD** (`DEBUG=False`):
    - Either disabled or set to `INFO` only (no DEBUG spam).

- Existing logging categories must still be wired to these handlers:

  - `django`
  - `django.request` (logging at `ERROR` into the error handler)
  - `corbi.audit`
  - Root logger (`""`) so modules like `messaging.callbacks` use the same handlers.

### 3.5 Log Format & Message Structure

- Keep base format:

  ```text
  [{asctime}] {levelname} {name}: {message}


However, {message} must use a structured style, especially for webhooks and campaign logic:

Use key=value pairs where possible, for example:

webhook_processed integration=sendgrid event_type=delivered request_id=... campaign_id=... recipient_email=... status=delivered


Each log entry should also include (directly or via context):

service="corbi-backend" (can be encoded into {name} or message),

env = environment name (DEV/TEST/PROD), via settings or logging extra.

(Exact implementation is up to you; requirement is that logs are easily machine-parsable and include key context.)

3.6 Request / Correlation ID Middleware

Add a Django middleware that:

Generates a request_id per HTTP request (or reuses X-Request-ID header if present).

Attaches request.request_id.

Ensures log records in that request include request_id as a field (e.g., via logging.LoggerAdapter, a filter, or adding it into messages as request_id=...).

Add this middleware to MIDDLEWARE in settings.py.

3.7 Environment-Specific Behavior

DEV environment (DEBUG=True):

Console logging enabled (DEBUG or INFO).

File handlers as described above.

Can be more verbose, but still must not log secrets.

PROD environment (DEBUG=False):

File handlers (application-YYYY-MM-DD.log, application-errors-YYYY-MM-DD.log) are the main outputs.

Console logging can be reduced or disabled.

Default levels:

INFO for app logs.

WARNING for error logs.

4. Structured Logging & Message Schema for Webhooks

Even if we don’t use full JSON logging, all webhook-related log messages must be structured as key=value pairs.

4.1 Standard Fields (where applicable)

For webhook-related logs, include (when available):

request_id – from middleware.

integration – e.g. sendgrid, whatsapp, telegram.

event_source – e.g. webhook, internal.

event_type – e.g. delivered, open, bounce, drop, spamreport.

org_id / tenant_id – if applicable.

campaign_id

email_job_id / message_id / campaign_recipient_id

recipient_email

status – "received" | "processed" | "failed".

provider_event_id – if available from SendGrid / others.

Example conceptual message:

webhook_received integration=sendgrid event_type=delivered request_id=... campaign_id=... recipient_email=... provider_event_id=...

4.2 Error Logs

For error/failure logs:

Log at ERROR level with:

All contextual fields above, plus:

error_code – internal or provider code.

error_message – short message.

exc_info=True to capture stack trace (goes into error log).

5. Webhook Logging Contract (messaging/callbacks.py)

Update messaging/callbacks.py to follow this 3-stage contract for each webhook:

5.1 Remove Temporary Prints

Remove all print() statements from:

ProviderCallbackView

SendGridEventView

Replace them with logger.info() / logger.error() calls that follow the schema below.

5.2 Stage 1 – webhook_received

For every webhook request (SendGrid or other providers):

At the start of the view, log at INFO:

Message key: "webhook_received".

Fields (as available):

request_id

integration (e.g. "sendgrid")

event_source="webhook"

event_type (if known at this stage; for SendGrid this can be "event_batch" if multiple events).

content_type (e.g. "application/json", "text/plain")

remote_addr or client_ip

num_events (for SendGrid NDJSON arrays; count parsed events if possible).

Do not log the full raw body in production:

In DEV only, you may log a truncated & redacted version of the body:

e.g. first 512 characters,

mask emails/phone numbers/tokens with [REDACTED].

5.3 Stage 2 – webhook_processed

After successfully handling each event (SendGrid or others):

Log at INFO for each processed event:

Message key: "webhook_processed".

Fields:

request_id

integration="sendgrid"

event_source="webhook"

event_type – "delivered", "open", "bounce", "drop", "spamreport", etc.

campaign_id

campaign_recipient_id

recipient_email

status – resulting internal state: "delivered", "read", "failed", etc.

updates – small description summarizing what changed, e.g.
"EmailRecipient.status=delivered, CampaignRecipient.status=delivered, campaign.delivered_count++".

Ensure logs reflect existing business rules:

Multiple opens do not increment read_count more than once.

Delivered events do not downgrade a read status.

Bounce/drop/spamreport mark EmailRecipient and CampaignRecipient as failed and increment failed_count once per recipient.

5.4 Stage 3 – webhook_failed

If any exception occurs during parsing or processing:

Catch at the view layer (or rely on Django) but ensure you log at ERROR:

Message key: "webhook_failed".

Fields:

request_id

integration="sendgrid" (or other).

event_source="webhook"

event_type if known.

campaign_id / recipient_email if resolved.

error_code – e.g. "PARSE_ERROR", "DB_UPDATE_FAILED".

error_message – safe summary / str(exception).

exc_info=True so stack trace goes into the error log.

Maintain current tolerant behavior (no unnecessary 400s):

If one event in a batch fails, log the failure but continue processing others when possible.

6. SendGrid-Specific Logging

Make explicit webhook_processed logs for each SendGrid event type:

6.1 Delivered

event_type="delivered"

status="delivered"

updates describing:

EmailRecipient.status set to sent (unless already read).

CampaignRecipient.status updated to delivered.

campaign.delivered_count++ once per recipient.

6.2 Open

First open:

event_type="open"

status="read"

updates stating:

read_count++ once.

EmailRecipient.status=read and read_at set.

CampaignRecipient.status=read.

Subsequent opens:

event_type="open"

status="read"

updates stating: "duplicate_open_ignored" (no counters changed).

6.3 Bounce / Drop / Spamreport

event_type accordingly.

status="failed".

updates describing:

EmailRecipient.status=failed.

CampaignRecipient.status=failed.

campaign.failed_count++.

Suppression record created for that email.

7. Monitoring / Alerts Integration

We already have:

monitoring/migrations/__init__.py fixed.

/api/monitoring/alerts/ endpoint.

Requirements:

Logs must support monitoring by including:

status fields (success/failure) and integration.

When /api/monitoring/alerts/ is used, it should be able to base alerts on:

counts of webhook_failed events grouped by integration and time window.

500s in the error logs.

(No additional code change required specifically for alerts now; just structure logs to make this easy.)

8. Cleanup & Security Requirements

Remove all temporary debug print() statements in webhook-related views.

Ensure no secrets are ever logged:

Do NOT log:

API keys,

Authorization headers,

Full tokens,

Full sensitive message content.

If emails / phone numbers must be logged:

Mask them, e.g. user***@domain.com, +60********23.

9. Acceptance Criteria

Changes are complete when:

Global logging config in corbi/settings.py:

Uses application.log and application-errors.log with daily rotation & backupCount (14–30).

Writes under backend/logs/.

Console logging is environment-aware (more verbose in DEV, quieter or off in PROD).

Webhook handlers (ProviderCallbackView, SendGridEventView, future ones):

Log webhook_received, webhook_processed, and webhook_failed with the fields listed.

No print() statements remain in webhook-related code.

For a SendGrid event in DEV:

Triggering a test webhook yields:

One webhook_received log,

One or more webhook_processed logs, or a webhook_failed log on validation issues.

All log lines share the same request_id and show:

service, env, request_id, integration, event_type, status, and relevant IDs.

In PROD configuration:

No secrets or full raw webhook bodies are logged.

Error logs clearly show webhook_failed entries with error_code and error_message.

Important : 

please do not change business logic for callbacks



10. Debug HTTP Logging (Request & Response Bodies)

It must remain easy to debug issues by seeing the request payload and response payload,
but this must be done in a controlled, environment-aware way.

### 10.1 General principles

- In **DEV**:
  - It is acceptable to log full request and response bodies for debugging.
- In **PROD**:
  - Do **not** log full bodies by default.
  - Only log bodies for:
    - webhook endpoints, and/or
    - error responses (4xx/5xx),
  - and even then:
    - truncate to a safe length (e.g. first 512–1024 characters),
    - redact obvious secrets/PII when possible (emails, tokens, etc.).

### 10.2 Implement an HTTP logging middleware

Create a small Django middleware (e.g. `corbi.middleware.HttpLoggingMiddleware`) and add it
to `MIDDLEWARE` **after** authentication but before the view returns responses.

Responsibilities:

1. **Attach or reuse `request_id`**  
   - Use the same `request_id` already added by the request ID middleware.
   - Every log must include `request_id=...`.

2. **DEV mode behavior (`DEBUG=True`)**

   For every HTTP request:

   - Log an `http_request` line at `INFO`:

     Example format:

     ```text
     http_request request_id=<id> method=<METHOD> path=<PATH> query="<QUERY_STRING>" body="<RAW_BODY_OR_TRUNCATED>"
     ```

     - Include:
       - `method`
       - `path`
       - query string
       - **request body** (full or truncated)
       - optionally `user` id/name if authenticated.

   - After the view returns, log an `http_response` line at `INFO`:

     ```text
     http_response request_id=<id> method=<METHOD> path=<PATH> status_code=<STATUS> body="<RESPONSE_BODY_OR_TRUNCATED>"
     ```

     - Include:
       - `status_code`
       - short/truncated response body (for JSON, can log serialized JSON or just relevant fields).

   - This logging should:
     - Only run in DEV (guarded by `if settings.DEBUG:`),
     - Be careful with `request.body` streaming (read once and cache if needed).

3. **PROD mode behavior (`DEBUG=False`)**

   - Do **not** log every request/response body.
   - Instead, log only when `response.status_code >= 400`:

     ```text
     api_error request_id=<id> method=<METHOD> path=<PATH> status_code=<STATUS> reason=<SHORT_REASON> body_snippet="<TRUNCATED_BODY>"
     ```

     - `body_snippet` should:
       - be truncated (e.g. 0–512 chars),
       - avoid obvious secrets if possible.

   - For webhook endpoints (e.g. SendGrid or other providers), you may also:
     - Log a **truncated** request body snippet at `INFO` in PROD, but:
       - never log tokens/authorization headers,
       - optionally only for specific paths (e.g. `/api/webhooks/sendgrid/`).

4. **Opt-in toggle (optional, but nice)**

   - Add an env-based toggle, e.g. `LOG_HTTP_BODIES=true/false`.
   - Behavior:
     - In DEV: default `LOG_HTTP_BODIES=true`.
     - In PROD: default `LOG_HTTP_BODIES=false`; can temporarily enable for deep debugging.
   - Middleware should check both:
     - `settings.DEBUG`
     - and/or `settings.LOG_HTTP_BODIES`.

### 10.3 Relationship with webhook logging

- The HTTP logging middleware is **generic** (for any request).
- The **webhook-specific logs** (`webhook_received`, `webhook_processed`, `webhook_failed`)
  are still required and structured with `key=value` fields as defined earlier.
- When debugging webhooks:
  - In DEV:
    - You can combine:
      - `http_request` / `http_response` logs (with full/truncated bodies),
      - `webhook_received` / `webhook_processed` logs.
  - In PROD:
    - You rely mostly on structured webhook logs,
    - Plus a small, truncated `body_snippet` for failing requests (4xx/5xx) if safe.

### 10.4 Acceptance criteria for debugging

- In **DEV**:
  - When calling any API (e.g. `GET /api/campaigns/` or a webhook endpoint), you can see:
    - an `http_request` log showing the method, path, and the request body,
    - an `http_response` log showing the status code and a truncated response body.
  - These logs include `request_id`, so you can correlate with webhook logs and error logs.

- In **PROD**:
  - For normal successful requests (2xx/3xx), request/response bodies are *not* logged.
  - For failing requests (4xx/5xx), you see an `api_error` line with:
    - `request_id`, `method`, `path`, `status_code`, a short `reason`, and a truncated `body_snippet`.
  - For webhook endpoints, you still have:
    - `webhook_received` / `webhook_processed` / `webhook_failed`
    - plus, optionally, a small, safe snippet of the incoming webhook payload.
    