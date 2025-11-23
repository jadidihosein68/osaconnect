from __future__ import annotations

from django.db import models, transaction
from django.utils import timezone

from contacts.models import Contact
from templates_app.models import MessageTemplate
from organizations.models import Organization
from django.conf import settings


class OutboundMessage(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="outbound_messages")
    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_RETRYING = "retrying"
    STATUS_DELIVERED = "delivered"
    STATUS_READ = "read"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_RETRYING, "Retrying"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_READ, "Read"),
    ]

    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="outbound_messages")
    template = models.ForeignKey(
        MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="outbound_messages"
    )
    channel = models.CharField(max_length=32)
    body = models.TextField()
    variables = models.JSONField(default=dict, blank=True)
    media_url = models.URLField(blank=True, null=True)
    scheduled_for = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    error = models.TextField(blank=True, default="")
    retry_count = models.PositiveIntegerField(default=0)
    trace_id = models.CharField(max_length=64, blank=True, default="")
    provider_message_id = models.CharField(max_length=128, blank=True, default="")
    provider_status = models.CharField(max_length=64, blank=True, default="")
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.channel} -> {self.contact.full_name} ({self.status})"

    def schedule_send(self):
        from .tasks import send_outbound_message

        if self.contact.status != Contact.STATUS_ACTIVE:
            self.status = self.STATUS_FAILED
            self.error = "Contact is not active"
            self.save(update_fields=["status", "error", "updated_at"])
            return

        eta = self.scheduled_for or timezone.now()
        send_outbound_message.apply_async(args=[self.id], eta=eta)


class InboundMessage(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="inbound_messages")
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name="inbound_messages")
    channel = models.CharField(max_length=32)
    payload = models.JSONField(default=dict, blank=True)
    media_url = models.URLField(blank=True, null=True)
    received_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self) -> str:
        return f"Inbound {self.channel} at {self.received_at}"

    def enrich_contact(self):
        if not self.contact:
            return
        self.contact.mark_inbound(
            {
                "email": self.payload.get("email"),
                "phone_whatsapp": self.payload.get("phone"),
                "telegram_chat_id": self.payload.get("telegram_chat_id"),
                "instagram_scoped_id": self.payload.get("instagram_scoped_id"),
            }
        )

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super().save(*args, **kwargs)
            self.enrich_contact()


class Suppression(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="suppressions")
    channel = models.CharField(max_length=32)
    identifier = models.CharField(max_length=255)
    reason = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organization", "channel", "identifier")


class EmailJob(models.Model):
    STATUS_QUEUED = "queued"
    STATUS_SENDING = "sending"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_SENDING, "Sending"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="email_jobs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    campaign = models.ForeignKey("messaging.Campaign", null=True, blank=True, on_delete=models.SET_NULL, related_name="email_jobs")
    template = models.ForeignKey("templates_app.MessageTemplate", null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    body_text = models.TextField(blank=True, default="")
    footer_html = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    excluded_count = models.PositiveIntegerField(default=0)
    exclusions = models.JSONField(default=list, blank=True)
    error = models.TextField(blank=True, default="")
    attachments = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"EmailJob {self.id} {self.subject}"


class EmailRecipient(models.Model):
    STATUS_QUEUED = "queued"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_SKIPPED = "skipped"
    STATUS_READ = "read"
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_SKIPPED, "Skipped"),
        (STATUS_READ, "Read"),
    ]

    job = models.ForeignKey(EmailJob, on_delete=models.CASCADE, related_name="recipients")
    contact = models.ForeignKey(Contact, null=True, blank=True, on_delete=models.SET_NULL, related_name="email_recipients")
    email = models.EmailField()
    full_name = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    error = models.TextField(blank=True, default="")
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    provider_message_id = models.CharField(max_length=128, blank=True, default="")
    signed_token = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]


class ProviderEvent(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="provider_events")
    outbound = models.ForeignKey(OutboundMessage, null=True, blank=True, on_delete=models.SET_NULL, related_name="provider_events")
    provider_message_id = models.CharField(max_length=128, blank=True, default="")
    channel = models.CharField(max_length=32)
    status = models.CharField(max_length=64)
    payload = models.JSONField(default=dict, blank=True)
    latency_ms = models.PositiveIntegerField(default=0)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]


class EmailAttachment(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="email_attachments")
    file = models.FileField(upload_to="email_attachments/")
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100, blank=True, default="")
    size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ContactEngagement(models.Model):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="engagements")
    channel = models.CharField(max_length=32)
    subject = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=32)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class TelegramMessage(models.Model):
    DIR_INBOUND = "INBOUND"
    DIR_OUTBOUND = "OUTBOUND"
    DIR_CHOICES = [(DIR_INBOUND, "Inbound"), (DIR_OUTBOUND, "Outbound")]

    TYPE_TEXT = "TEXT"
    TYPE_PHOTO = "PHOTO"
    TYPE_DOCUMENT = "DOCUMENT"
    TYPE_VIDEO = "VIDEO"
    TYPE_OTHER = "OTHER"
    TYPE_CHOICES = [
        (TYPE_TEXT, "Text"),
        (TYPE_PHOTO, "Photo"),
        (TYPE_DOCUMENT, "Document"),
        (TYPE_VIDEO, "Video"),
        (TYPE_OTHER, "Other"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="telegram_messages")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="telegram_messages")
    chat_id = models.CharField(max_length=64)
    direction = models.CharField(max_length=16, choices=DIR_CHOICES)
    message_type = models.CharField(max_length=16, choices=TYPE_CHOICES, default=TYPE_TEXT)
    text = models.TextField(blank=True, default="")
    attachments = models.JSONField(default=list, blank=True)
    telegram_message_id = models.CharField(max_length=128, blank=True, default="")
    status = models.CharField(max_length=32, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["organization", "contact", "chat_id", "created_at"], name="tgmsg_org_contact_idx")]


class WhatsAppMessage(models.Model):
    DIR_INBOUND = "INBOUND"
    DIR_OUTBOUND = "OUTBOUND"
    DIR_CHOICES = [(DIR_INBOUND, "Inbound"), (DIR_OUTBOUND, "Outbound")]

    TYPE_TEXT = "TEXT"
    TYPE_IMAGE = "IMAGE"
    TYPE_DOCUMENT = "DOCUMENT"
    TYPE_AUDIO = "AUDIO"
    TYPE_VIDEO = "VIDEO"
    TYPE_OTHER = "OTHER"
    TYPE_CHOICES = [
        (TYPE_TEXT, "Text"),
        (TYPE_IMAGE, "Image"),
        (TYPE_DOCUMENT, "Document"),
        (TYPE_AUDIO, "Audio"),
        (TYPE_VIDEO, "Video"),
        (TYPE_OTHER, "Other"),
    ]

    STATUS_PENDING = "PENDING"
    STATUS_SENT = "SENT"
    STATUS_DELIVERED = "DELIVERED"
    STATUS_FAILED = "FAILED"
    STATUS_RECEIVED = "RECEIVED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SENT, "Sent"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_FAILED, "Failed"),
        (STATUS_RECEIVED, "Received"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="whatsapp_messages")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="whatsapp_messages")
    direction = models.CharField(max_length=16, choices=DIR_CHOICES)
    message_type = models.CharField(max_length=16, choices=TYPE_CHOICES, default=TYPE_TEXT)
    text = models.TextField(blank=True, default="")
    attachments = models.JSONField(default=list, blank=True)
    twilio_message_sid = models.CharField(max_length=128, blank=True, default="")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    error_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["organization", "contact", "created_at"], name="wa_msg_org_contact_idx")]


class InstagramMessage(models.Model):
    DIR_INBOUND = "INBOUND"
    DIR_OUTBOUND = "OUTBOUND"
    DIR_CHOICES = [(DIR_INBOUND, "Inbound"), (DIR_OUTBOUND, "Outbound")]

    TYPE_TEXT = "TEXT"
    TYPE_IMAGE = "IMAGE"
    TYPE_DOCUMENT = "DOCUMENT"
    TYPE_OTHER = "OTHER"
    TYPE_CHOICES = [
        (TYPE_TEXT, "Text"),
        (TYPE_IMAGE, "Image"),
        (TYPE_DOCUMENT, "Document"),
        (TYPE_OTHER, "Other"),
    ]

    STATUS_SENT = "SENT"
    STATUS_FAILED = "FAILED"
    STATUS_RECEIVED = "RECEIVED"
    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_RECEIVED, "Received"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="instagram_messages")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="instagram_messages")
    direction = models.CharField(max_length=16, choices=DIR_CHOICES)
    message_type = models.CharField(max_length=16, choices=TYPE_CHOICES, default=TYPE_TEXT)
    text = models.TextField(blank=True, default="")
    attachments = models.JSONField(default=list, blank=True)
    provider_message_id = models.CharField(max_length=128, blank=True, default="")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_SENT)
    error_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["organization", "contact", "created_at"], name="ig_msg_org_contact_idx")]


class Campaign(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_QUEUED = "queued"
    STATUS_SENDING = "sending"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_QUEUED, "Queued"),
        (STATUS_SENDING, "Sending"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="campaigns")
    name = models.CharField(max_length=100)
    channel = models.CharField(max_length=32)
    template = models.ForeignKey(MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="campaigns_created")
    group_ids = models.JSONField(default=list, blank=True)
    upload_used = models.BooleanField(default=False)
    target_count = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    delivered_count = models.PositiveIntegerField(default=0)
    read_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    unsubscribed_count = models.PositiveIntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class CampaignRecipient(models.Model):
    STATUS_QUEUED = "queued"
    STATUS_SENT = "sent"
    STATUS_DELIVERED = "delivered"
    STATUS_READ = "read"
    STATUS_FAILED = "failed"
    STATUS_UNSUBSCRIBED = "unsubscribed"
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_SENT, "Sent"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_READ, "Read"),
        (STATUS_FAILED, "Failed"),
        (STATUS_UNSUBSCRIBED, "Unsubscribed"),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="recipients")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="campaign_recipients")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    provider_message_id = models.CharField(max_length=128, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)


class TelegramInviteToken(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_USED = "USED"
    STATUS_EXPIRED = "EXPIRED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_USED, "Used"),
        (STATUS_EXPIRED, "Expired"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="telegram_tokens")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="telegram_tokens")
    verification_token = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["organization", "contact", "status"], name="telegram_token_idx")]
