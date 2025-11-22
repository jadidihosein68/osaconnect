from __future__ import annotations

from rest_framework import serializers

from contacts.models import Contact
from contacts.serializers import ContactSerializer
from templates_app.models import MessageTemplate
from templates_app.serializers import MessageTemplateSerializer
from .models import InboundMessage, OutboundMessage, EmailJob, EmailRecipient, EmailAttachment, TelegramInviteToken, TelegramMessage, WhatsAppMessage, InstagramMessage, Campaign, CampaignRecipient
from urllib.parse import urlparse
import logging
from organizations.utils import get_current_org
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

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
        fields = ["id", "contact", "email", "full_name", "status", "error", "sent_at", "provider_message_id"]
        read_only_fields = ["status", "error", "sent_at", "contact", "provider_message_id"]


class EmailJobSerializer(serializers.ModelSerializer):
    recipients = EmailRecipientSerializer(many=True, read_only=True)
    batch_config = serializers.SerializerMethodField()
    template = MessageTemplateSerializer(read_only=True)

    class Meta:
        model = EmailJob
        fields = [
            "id",
            "subject",
            "body_html",
            "body_text",
            "footer_html",
            "status",
            "total_recipients",
            "sent_count",
            "failed_count",
            "skipped_count",
            "excluded_count",
            "exclusions",
            "error",
            "attachments",
            "created_at",
            "started_at",
            "completed_at",
            "recipients",
            "batch_config",
            "template",
        ]
        read_only_fields = [
            "status",
            "sent_count",
            "failed_count",
            "skipped_count",
            "excluded_count",
            "exclusions",
            "error",
            "created_at",
            "started_at",
            "completed_at",
            "recipients",
            "batch_config",
            "footer_html",
            "template",
        ]

    def get_batch_config(self, obj):
        from django.conf import settings

        return {
            "batch_size": getattr(settings, "EMAIL_BATCH_SIZE", 100),
            "batch_delay_seconds": getattr(settings, "EMAIL_BATCH_DELAY_SECONDS", 1),
            "max_retries": getattr(settings, "EMAIL_MAX_RETRIES", 2),
            "retry_delay_seconds": getattr(settings, "EMAIL_RETRY_DELAY_SECONDS", 10),
        }


class EmailJobCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body_html = serializers.CharField()
    body_text = serializers.CharField(required=False, allow_blank=True, default="")
    attachments = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
    attachment_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    contact_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    group_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    template_id = serializers.PrimaryKeyRelatedField(
        source="template",
        queryset=MessageTemplate.objects.all(),
        required=False,
        allow_null=True,
    )

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
        template = validated_data.get("template")

        contacts = Contact.objects.none()
        if contact_ids:
            contacts = contacts | Contact.objects.filter(organization=org, status=Contact.STATUS_ACTIVE, id__in=contact_ids)
        if group_ids:
            contacts = contacts | Contact.objects.filter(groups__id__in=group_ids, organization=org, status=Contact.STATUS_ACTIVE)
        contacts = contacts.distinct()

        valid_contacts = []
        exclusions = []
        excluded = 0
        for c in contacts:
            reason = None
            if not c.email:
                reason = "missing email"
            else:
                try:
                    validate_email(c.email)
                except ValidationError:
                    reason = "invalid email"
            if reason is None:
                if c.status == Contact.STATUS_BLOCKED:
                    reason = "blocked"
                elif c.status == Contact.STATUS_UNSUBSCRIBED:
                    reason = "unsubscribed"
                elif c.status == Contact.STATUS_BOUNCED:
                    reason = "bounced"
            if reason:
                excluded += 1
                exclusions.append({"contact_id": c.id, "email": c.email, "reason": reason})
                continue
            valid_contacts.append(c)

        if not valid_contacts:
            raise serializers.ValidationError("No valid recipients after filtering.")

        footer_html = ""
        if template and template.organization_id != org.id:
            template = None
        if not template:
            template = MessageTemplate.objects.filter(organization=org, channel=MessageTemplate.CHANNEL_EMAIL, is_default=True).first()
        if template and template.footer:
            footer_html = template.footer

        job = EmailJob.objects.create(
            organization=org,
            user=user,
            template=template,
            subject=validated_data["subject"],
            body_html=validated_data["body_html"],
            body_text=validated_data.get("body_text") or "",
            footer_html=footer_html,
            status=EmailJob.STATUS_QUEUED,
            total_recipients=len(valid_contacts),
            excluded_count=excluded,
            exclusions=exclusions[:200],
            attachments=self._build_attachments(validated_data),
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

    def _build_attachments(self, validated_data):
        attachment_ids = validated_data.get("attachment_ids") or []
        attachments = validated_data.get("attachments") or []
        if attachment_ids:
            qs = EmailAttachment.objects.filter(id__in=attachment_ids)
            for a in qs:
                attachments.append(
                    {
                        "filename": a.filename,
                        "content_type": a.content_type,
                        "size": a.size,
                        "path": a.file.name,
                    }
                )
        return attachments


class TelegramInviteTokenSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    contact_email = serializers.EmailField(source="contact.email", read_only=True)

    class Meta:
        model = TelegramInviteToken
        fields = [
            "id",
            "contact",
            "contact_name",
            "contact_email",
            "verification_token",
            "status",
            "expires_at",
            "used_at",
            "created_at",
        ]
        read_only_fields = fields


class TelegramMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramMessage
        fields = [
            "id",
            "contact",
            "chat_id",
            "direction",
            "message_type",
            "text",
            "attachments",
            "telegram_message_id",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "chat_id", "direction", "message_type", "telegram_message_id", "status", "created_at"]


class WhatsAppMessageSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    contact_phone = serializers.CharField(source="contact.phone_whatsapp", read_only=True)

    class Meta:
        model = WhatsAppMessage
        fields = [
            "id",
            "contact",
            "contact_name",
            "contact_phone",
            "direction",
            "message_type",
            "text",
            "attachments",
            "twilio_message_sid",
            "status",
            "error_reason",
            "created_at",
        ]
        read_only_fields = ["id", "direction", "message_type", "twilio_message_sid", "status", "error_reason", "created_at"]


class InstagramMessageSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)

    class Meta:
        model = InstagramMessage
        fields = [
            "id",
            "contact",
            "contact_name",
            "direction",
            "message_type",
            "text",
            "attachments",
            "provider_message_id",
            "status",
            "error_reason",
            "created_at",
        ]
        read_only_fields = ["id", "direction", "message_type", "provider_message_id", "status", "error_reason", "created_at"]


class CampaignRecipientSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)

    class Meta:
        model = CampaignRecipient
        fields = ["id", "contact", "contact_name", "status", "provider_message_id", "error_message", "created_at"]
        read_only_fields = ["id", "status", "provider_message_id", "error_message", "created_at"]


class CampaignSerializer(serializers.ModelSerializer):
    recipients = CampaignRecipientSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "channel",
            "template",
            "template_name",
            "target_count",
            "sent_count",
            "delivered_count",
            "read_count",
            "failed_count",
            "unsubscribed_count",
            "estimated_cost",
            "status",
            "created_at",
            "recipients",
        ]
        read_only_fields = [
            "target_count",
            "sent_count",
            "delivered_count",
            "read_count",
            "failed_count",
            "unsubscribed_count",
            "estimated_cost",
            "status",
            "created_at",
            "recipients",
        ]
