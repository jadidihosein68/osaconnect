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
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    body_text = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    excluded_count = models.PositiveIntegerField(default=0)
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
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_SKIPPED, "Skipped"),
    ]

    job = models.ForeignKey(EmailJob, on_delete=models.CASCADE, related_name="recipients")
    contact = models.ForeignKey(Contact, null=True, blank=True, on_delete=models.SET_NULL, related_name="email_recipients")
    email = models.EmailField()
    full_name = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    error = models.TextField(blank=True, default="")
    sent_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
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
