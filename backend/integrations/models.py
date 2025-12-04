from __future__ import annotations

from django.db import models
from organizations.models import Organization
from .utils import encrypt_token


class Integration(models.Model):
    PROVIDERS = [
        ("whatsapp", "WhatsApp Business"),
        ("sendgrid", "SendGrid"),
        ("telegram", "Telegram Bot"),
        ("instagram", "Instagram Messaging"),
        ("google_calendar", "Google Calendar"),
        ("elevenlabs", "ElevenLabs Voice Agent"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="integrations")
    provider = models.CharField(max_length=64, choices=PROVIDERS)
    token_encrypted = models.TextField(blank=True, default="")
    extra = models.JSONField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("organization", "provider")
        ordering = ["provider"]

    def set_token(self, token: str) -> None:
        self.token_encrypted = encrypt_token(token)

    @property
    def redacted(self) -> str:
        return "••••" if self.token_encrypted else ""

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "provider": self.provider,
            "is_active": self.is_active,
            "extra": self.extra or {},
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
