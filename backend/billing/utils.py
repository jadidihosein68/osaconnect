from __future__ import annotations

from decimal import Decimal
from typing import Optional

from django.utils import timezone

from organizations.utils import get_current_org
from .models import BillingLog

# Example allowlists per feature; extend as needed
FEATURE_MODEL_ALLOWLIST = {
    "ai_discovery_planning": ["openai/gpt-4o-mini", "openai/gpt-5-mini", "google/gemini-2.5-flash", "x-ai/grok-4-fast"],
    "ai_discovery_research": ["openai/o4-mini-deep-research", "google/gemini-2.5-pro", "x-ai/grok-4", "perplexity/sonar-pro-search"],
    "ai_discovery_validation": ["openai/gpt-4o-mini-search-preview"],
    "ai_web_search": ["openai/gpt-4o-mini-search-preview"],
}

MODEL_PRICES = {
    # price per 1k tokens (prompt, completion)
    "openai/gpt-4o-mini": (Decimal("0.000150"), Decimal("0.000600")),
    "openai/gpt-5-mini": (Decimal("0.000500"), Decimal("0.001500")),
    "google/gemini-2.5-flash": (Decimal("0.000100"), Decimal("0.000400")),
    "google/gemini-2.5-pro": (Decimal("0.000700"), Decimal("0.002100")),
    "x-ai/grok-4-fast": (Decimal("0.000300"), Decimal("0.000900")),
    "x-ai/grok-4": (Decimal("0.000800"), Decimal("0.002400")),
    "openai/o4-mini-deep-research": (Decimal("0.000800"), Decimal("0.002400")),
    "perplexity/sonar-pro-search": (Decimal("0.000800"), Decimal("0.002400")),
}

DEFAULT_MARKUP = Decimal("1.25")


def validate_model(feature_tag: str, model: str) -> bool:
    allowlist = FEATURE_MODEL_ALLOWLIST.get(feature_tag)
    return allowlist is None or model in allowlist


def estimate_cost(model: str, prompt_tokens: int = 0, completion_tokens: int = 0, markup: Decimal = DEFAULT_MARKUP) -> tuple[Decimal, Decimal]:
    rates = MODEL_PRICES.get(model)
    if not rates:
        return Decimal("0"), Decimal("0")
    prompt_rate, completion_rate = rates
    raw = (Decimal(prompt_tokens) / 1000 * prompt_rate) + (Decimal(completion_tokens) / 1000 * completion_rate)
    billable = (raw * markup).quantize(Decimal("0.0001"))
    return raw.quantize(Decimal("0.0001")), billable


def log_usage_sent(request, *, feature_tag: str, model: str, mode: str = "", request_id: str | None = None, metadata: dict | None = None) -> BillingLog:
    org = get_current_org(request)
    return BillingLog.objects.create(
        timestamp=timezone.now(),
        organization=org,
        user=request.user if request.user.is_authenticated else None,
        feature_tag=feature_tag,
        model=model,
        mode=mode,
        request_id=request_id or "",
        metadata=metadata or {},
        status=BillingLog.STATUS_SENT,
    )


def log_usage_result(
    usage: BillingLog,
    *,
    status: str,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    raw_cost: Optional[Decimal] = None,
    billable_cost: Optional[Decimal] = None,
    request_id: Optional[str] = None,
    error: str | None = None,
    metadata: Optional[dict] = None,
    markup: Decimal = DEFAULT_MARKUP,
) -> BillingLog:
    if prompt_tokens is not None:
        usage.tokens_prompt = prompt_tokens
    if completion_tokens is not None:
        usage.tokens_completion = completion_tokens
    if prompt_tokens is not None or completion_tokens is not None:
        usage.tokens_total = (prompt_tokens or 0) + (completion_tokens or 0)
    if raw_cost is None and billable_cost is None and (prompt_tokens is not None or completion_tokens is not None):
        raw_cost, billable_cost = estimate_cost(usage.model, prompt_tokens or 0, completion_tokens or 0, markup=markup)
    if raw_cost is not None:
        usage.raw_cost = raw_cost
    if billable_cost is not None:
        usage.billable_cost = billable_cost
    if request_id:
        usage.request_id = request_id
    if metadata:
        usage.metadata = {**(usage.metadata or {}), **metadata}
    if error:
        usage.error = error
    usage.status = status
    usage.save(update_fields=[
        "tokens_prompt",
        "tokens_completion",
        "tokens_total",
        "raw_cost",
        "billable_cost",
        "request_id",
        "metadata",
        "error",
        "status",
        "updated_at",
    ])
    return usage
