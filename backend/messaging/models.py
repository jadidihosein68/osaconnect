from __future__ import annotations

from django.db import models, transaction
from django.utils import timezone

from contacts.models import Contact
from templates_app.models import MessageTemplate


class OutboundMessage(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="outbound_messages")
    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_RETRYING = "retrying"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_RETRYING, "Retrying"),
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
