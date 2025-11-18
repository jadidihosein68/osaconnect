from __future__ import annotations

from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import Contact, IdentityConflict


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id",
            "full_name",
            "phone_whatsapp",
            "email",
            "telegram_chat_id",
            "instagram_scoped_id",
            "status",
            "segments",
            "tags",
            "notes",
            "metadata",
            "last_inbound_at",
            "last_outbound_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["last_inbound_at", "last_outbound_at", "created_at", "updated_at"]

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", Contact.STATUS_ACTIVE))
        if status != Contact.STATUS_ACTIVE and self.context.get("action") == "send_outbound":
            raise serializers.ValidationError("Outbound messaging is only allowed for active contacts.")
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return Contact.objects.create(**validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError("Contact identifiers must be unique and non-conflicting.") from exc


class IdentityConflictSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentityConflict
        fields = ["id", "contact", "field", "attempted_value", "created_at"]
        read_only_fields = fields
