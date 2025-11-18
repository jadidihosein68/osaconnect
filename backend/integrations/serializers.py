from __future__ import annotations

from rest_framework import serializers

from .models import Integration


class IntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Integration
        fields = ["id", "provider", "is_active", "extra", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
