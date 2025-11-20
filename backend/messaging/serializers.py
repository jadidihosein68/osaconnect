from __future__ import annotations

from rest_framework import serializers

from contacts.models import Contact
from contacts.serializers import ContactSerializer
from templates_app.models import MessageTemplate
from .models import InboundMessage, OutboundMessage, EmailJob, EmailRecipient
from urllib.parse import urlparse
import logging
from organizations.utils import get_current_org

audit_logger = logging.getLogger("corbi.audit")


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
        # suppression check handled in task, but short-circuit here
        from .models import Suppression
        if Suppression.objects.filter(organization=contact.organization, channel=channel, identifier=destination).exists():
            raise serializers.ValidationError("Recipient is suppressed for this channel.")
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
        audit_logger.info(
            "outbound.created",
            extra={
                "outbound_id": message.id,
                "contact_id": contact.id,
                "org": contact.organization_id,
                "channel": message.channel,
            },
        )
        message.schedule_send()
        return message


class InboundMessageSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)

    class Meta:
        model = InboundMessage
        fields = ["id", "contact", "channel", "payload", "media_url", "received_at", "created_at"]
        read_only_fields = fields


class EmailRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailRecipient
        fields = ["id", "contact", "email", "full_name", "status", "error", "sent_at"]
        read_only_fields = ["status", "error", "sent_at", "contact"]


class EmailJobSerializer(serializers.ModelSerializer):
    recipients = EmailRecipientSerializer(many=True, read_only=True)

    class Meta:
        model = EmailJob
        fields = [
            "id",
            "subject",
            "body_html",
            "body_text",
            "status",
            "total_recipients",
            "sent_count",
            "failed_count",
            "skipped_count",
            "excluded_count",
            "attachments",
            "created_at",
            "started_at",
            "completed_at",
            "recipients",
        ]
        read_only_fields = [
            "status",
            "sent_count",
            "failed_count",
            "skipped_count",
            "excluded_count",
            "created_at",
            "started_at",
            "completed_at",
            "recipients",
        ]


class EmailJobCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body_html = serializers.CharField()
    body_text = serializers.CharField(required=False, allow_blank=True, default="")
    attachments = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
    contact_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    group_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)

    def validate(self, attrs):
        if not attrs.get("contact_ids") and not attrs.get("group_ids"):
            raise serializers.ValidationError("Select at least one contact or group.")
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        org = get_current_org(request)
        user = request.user if request and request.user.is_authenticated else None
        contact_ids = validated_data.get("contact_ids") or []
        group_ids = validated_data.get("group_ids") or []

        contacts = Contact.objects.filter(organization=org, status=Contact.STATUS_ACTIVE)
        if contact_ids:
            contacts = contacts.filter(id__in=contact_ids)
        if group_ids:
            contacts = contacts | Contact.objects.filter(groups__id__in=group_ids, organization=org, status=Contact.STATUS_ACTIVE)
        contacts = contacts.distinct()

        valid_contacts = []
        excluded = 0
        for c in contacts:
            if not c.email or c.status != Contact.STATUS_ACTIVE:
                excluded += 1
                continue
            valid_contacts.append(c)

        if not valid_contacts:
            raise serializers.ValidationError("No valid recipients after filtering.")

        job = EmailJob.objects.create(
            organization=org,
            user=user,
            subject=validated_data["subject"],
            body_html=validated_data["body_html"],
            body_text=validated_data.get("body_text") or "",
            status=EmailJob.STATUS_QUEUED,
            total_recipients=len(valid_contacts),
            excluded_count=excluded,
            attachments=validated_data.get("attachments") or [],
        )
        recipients = [
            EmailRecipient(
                job=job,
                contact=c,
                email=c.email,
                full_name=c.full_name,
            )
            for c in valid_contacts
        ]
        EmailRecipient.objects.bulk_create(recipients, batch_size=500)
        return job
