from __future__ import annotations

from rest_framework import serializers

from .models import Notification, NotificationRecipient


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "organization",
            "created_at",
            "type",
            "severity",
            "title",
            "body",
            "target_url",
            "data",
            "created_by",
        ]
        read_only_fields = ["id", "organization", "created_at", "created_by"]


class NotificationRecipientSerializer(serializers.ModelSerializer):
    notification = NotificationSerializer()

    class Meta:
        model = NotificationRecipient
        fields = ["id", "read_at", "created_at", "notification"]
        read_only_fields = fields


class NotificationCreateSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=["user", "org"])
    user_id = serializers.IntegerField(required=False, allow_null=True)
    type = serializers.CharField(max_length=32)
    severity = serializers.CharField(max_length=16)
    title = serializers.CharField(max_length=255)
    body = serializers.CharField(required=False, allow_blank=True)
    target_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    data = serializers.JSONField(required=False)
