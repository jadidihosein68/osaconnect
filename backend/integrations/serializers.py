from __future__ import annotations

from rest_framework import serializers

from .models import Integration


class IntegrationSerializer(serializers.ModelSerializer):
    extra = serializers.SerializerMethodField()

    class Meta:
        model = Integration
        fields = ["id", "provider", "is_active", "extra", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_extra(self, obj):
        # Do not expose secrets in API responses
        extra = (obj.extra or {}).copy()
        for key in ["token", "api_key", "webhook_secret"]:
            if key in extra:
                extra[key] = "••••"
        return extra
