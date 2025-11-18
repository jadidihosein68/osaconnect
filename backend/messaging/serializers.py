from __future__ import annotations

from rest_framework import serializers

from contacts.models import Contact
from contacts.serializers import ContactSerializer
from templates_app.models import MessageTemplate
from .models import InboundMessage, OutboundMessage


class OutboundMessageSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(source="contact", queryset=Contact.objects.all(), write_only=True)
    template_id = serializers.PrimaryKeyRelatedField(source="template", queryset=MessageTemplate.objects.all(), allow_null=True, required=False)

    class Meta:
        model = OutboundMessage
        fields = [
            "id",
            "contact",
            "contact_id",
            "template",
            "template_id",
            "channel",
            "body",
            "variables",
            "media_url",
            "scheduled_for",
            "status",
            "error",
            "retry_count",
            "trace_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "error", "retry_count", "trace_id", "created_at", "updated_at", "template"]

    def validate(self, attrs):
        contact = attrs["contact"]
        if contact.status != contact.STATUS_ACTIVE:
            raise serializers.ValidationError("Cannot send to non-active contact.")
        return attrs

    def create(self, validated_data):
        contact = validated_data.pop("contact")
        template = validated_data.pop("template", None)
        message = OutboundMessage.objects.create(contact=contact, template=template, **validated_data)
        message.schedule_send()
        return message


class InboundMessageSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)

    class Meta:
        model = InboundMessage
        fields = ["id", "contact", "channel", "payload", "media_url", "received_at", "created_at"]
        read_only_fields = fields
