# Billing Logging Behavior

This module tracks billable AI calls per organization to enable auditing and cost controls.

## Data Model (BillingLog)
- `id` (PK)
- `timestamp`: when the request was dispatched
- `user` (nullable) and `organization` (FK)
- `feature_tag`: e.g., `ai_discovery_planning`, `ai_discovery_research`, `ai_discovery_validation`, `ai_web_search`
- `model`: fully qualified model name; optional `mode`
- Token counts: `tokens_prompt`, `tokens_completion`, `tokens_total`
- Costs: `raw_cost`, `billable_cost`, `currency` (USD)
- `request_id`: provider correlation id
- `status`: `sent | succeeded | failed | canceled`
- `metadata`: JSON (pipeline_id, stage_key, retry, etc.)
- `error`: message if failed
- `created_at`, `updated_at`

## API
- `POST /api/billing/logs/` — create a row at dispatch. If `timestamp` is omitted, server sets `now()`. Org is inferred via `X-Org-ID`/membership.
- `GET /api/billing/logs/` — list scoped to org; filters: `feature_tag`, `model`, `status`, `start`, `end`; ordering by timestamp/cost.
- `POST /api/billing/logs/{id}/result/` — update an existing row with status/tokens/cost/error/metadata/request_id.

Auth: JWT/session. Permissions: org membership; write requires role != viewer.

## Helpers (billing/utils.py)
- `validate_model(feature_tag, model)` — simple allowlist gate.
- `estimate_cost(model, prompt_tokens, completion_tokens, markup=1.25)` — compute raw/billable cost using a sample price table (per 1k tokens) and 25% markup.
- `log_usage_sent(request, feature_tag, model, mode='', request_id=None, metadata=None)` — convenience creator (`status=sent`).
- `log_usage_result(usage, status, prompt_tokens=None, completion_tokens=None, raw_cost=None, billable_cost=None, request_id=None, error=None, metadata=None, markup=1.25)` — updates the row, computing cost if not provided.

## Expected Flow
1) Call `log_usage_sent` before hitting the provider.
2) On success, call `log_usage_result` with tokens/cost/status `succeeded` (and request_id if returned).
3) On provider errors/timeouts, call `log_usage_result` with `status=failed` and `error`.
4) If a pipeline is canceled, mark `status=canceled`.

## Notes
- Tokens/cost can be null until the provider returns usage. Costs and tokens must be non-negative.
- Currency is stored as USD today; extend if you need multi-currency.
- Model allowlists are examples — adjust FEATURE_MODEL_ALLOWLIST in `billing/utils.py` to enforce stricter controls.
- Audit/search: filter by feature_tag and date range to produce cost reports or per-stage audits.
