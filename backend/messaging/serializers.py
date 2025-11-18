from __future__ import annotations

from rest_framework import serializers

from contacts.models import Contact
from contacts.serializers import ContactSerializer
from templates_app.models import MessageTemplate
from .models import InboundMessage, OutboundMessage
from urllib.parse import urlparse


class OutboundMessageSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(source="contact", queryset=Contact.objects.all(), write_only=True)
    template_id = serializers.PrimaryKeyRelatedField(source="template", queryset=MessageTemplate.objects.all(), allow_null=True, required=False)

    class Meta:
        model = OutboundMessage
        fields = [
            "id",
            "organization",
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
        read_only_fields = ["organization", "status", "error", "retry_count", "trace_id", "created_at", "updated_at", "template"]

    def validate(self, attrs):
        contact = attrs["contact"]
        if contact.status != contact.STATUS_ACTIVE:
            raise serializers.ValidationError("Cannot send to non-active contact.")
        channel = attrs.get("channel")
        destination = (
            contact.phone_whatsapp
            if channel == "whatsapp"
            else contact.email
            if channel == "email"
            else contact.telegram_chat_id
            if channel == "telegram"
            else contact.instagram_scoped_id
        )
        if not destination:
            raise serializers.ValidationError("Contact is missing the required identifier for this channel.")
        media_url = attrs.get("media_url")
        if media_url:
            parsed = urlparse(media_url)
            if parsed.scheme not in ("http", "https"):
                raise serializers.ValidationError("Media URL must be http(s).")
            allowed_ext = (".jpg", ".jpeg", ".png", ".pdf", ".mp4", ".mp3")
            if not parsed.path.lower().endswith(allowed_ext):
                raise serializers.ValidationError("Media type not allowed; allowed: jpg, png, pdf, mp4, mp3.")
        return attrs

    def create(self, validated_data):
        contact = validated_data.pop("contact")
        template = validated_data.pop("template", None)
        message = OutboundMessage.objects.create(
            contact=contact,
            template=template,
            organization=contact.organization,
            **validated_data,
        )
        message.schedule_send()
        return message


class InboundMessageSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)

    class Meta:
        model = InboundMessage
        fields = ["id", "contact", "channel", "payload", "media_url", "received_at", "created_at"]
        read_only_fields = fields
