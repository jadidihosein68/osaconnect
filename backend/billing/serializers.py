from __future__ import annotations

from decimal import Decimal
from typing import Any

from rest_framework import serializers

from organizations.utils import get_current_org
from .models import BillingLog


class BillingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingLog
        fields = [
            "id",
            "timestamp",
            "user",
            "organization",
            "feature_tag",
            "model",
            "mode",
            "tokens_prompt",
            "tokens_completion",
            "tokens_total",
            "raw_cost",
            "billable_cost",
            "currency",
            "request_id",
            "status",
            "metadata",
            "error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "organization", "created_at", "updated_at"]

    def create(self, validated_data: dict[str, Any]) -> BillingLog:
        request = self.context.get("request")
        org = get_current_org(request)
        validated_data["organization"] = org
        if request and request.user and request.user.is_authenticated:
            validated_data.setdefault("user", request.user)
        return super().create(validated_data)

    def update(self, instance: BillingLog, validated_data: dict[str, Any]) -> BillingLog:
        # Ensure org and user stay untouched
        validated_data.pop("organization", None)
        validated_data.pop("user", None)
        return super().update(instance, validated_data)


class BillingLogResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingLog
        fields = [
            "status",
            "tokens_prompt",
            "tokens_completion",
            "tokens_total",
            "raw_cost",
            "billable_cost",
            "request_id",
            "error",
            "metadata",
        ]

    def validate_status(self, value: str) -> str:
        if value not in {
            BillingLog.STATUS_SENT,
            BillingLog.STATUS_SUCCEEDED,
            BillingLog.STATUS_FAILED,
            BillingLog.STATUS_CANCELED,
        }:
            raise serializers.ValidationError("Invalid status")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        raw_cost = attrs.get("raw_cost")
        billable_cost = attrs.get("billable_cost")
        if raw_cost is not None and raw_cost < Decimal("0"):
            raise serializers.ValidationError({"raw_cost": "Must be non-negative."})
        if billable_cost is not None and billable_cost < Decimal("0"):
            raise serializers.ValidationError({"billable_cost": "Must be non-negative."})
        return attrs
