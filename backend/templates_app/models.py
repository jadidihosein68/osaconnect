from __future__ import annotations

from django.db import models


class MessageTemplate(models.Model):
    CHANNEL_WHATSAPP = "whatsapp"
    CHANNEL_EMAIL = "email"
    CHANNEL_TELEGRAM = "telegram"
    CHANNEL_INSTAGRAM = "instagram"
    CHANNEL_CHOICES = [
        (CHANNEL_WHATSAPP, "WhatsApp"),
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_TELEGRAM, "Telegram"),
        (CHANNEL_INSTAGRAM, "Instagram"),
    ]

    name = models.CharField(max_length=120, unique=True)
    channel = models.CharField(max_length=32, choices=CHANNEL_CHOICES)
    language = models.CharField(max_length=10, default="en")
    subject = models.CharField(max_length=180, blank=True, default="")
    body = models.TextField()
    variables = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=64, blank=True, default="")
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.channel})"

    def render(self, data: dict[str, str]) -> str:
        rendered = self.body
        for var in self.variables:
            placeholder = f"{{{{{var}}}}}"
            rendered = rendered.replace(placeholder, data.get(var, f"<missing:{var}>"))
        return rendered
