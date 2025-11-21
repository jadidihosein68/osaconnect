from __future__ import annotations

from django.core.validators import validate_email
from django.db import models
from django.utils import timezone
from organizations.models import Organization


COLOR_CHOICES = [
    ("blue", "Blue"),
    ("green", "Green"),
    ("orange", "Orange"),
    ("purple", "Purple"),
    ("teal", "Teal"),
    ("gray", "Gray"),
]


class ContactGroup(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="contact_groups")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "auth.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="created_contact_groups"
    )

    class Meta:
        unique_together = ("organization", "name")
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name}"


class Contact(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_BLOCKED = "blocked"
    STATUS_UNSUBSCRIBED = "unsubscribed"
    STATUS_BOUNCED = "bounced"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_BLOCKED, "Blocked"),
        (STATUS_UNSUBSCRIBED, "Unsubscribed"),
        (STATUS_BOUNCED, "Bounced"),
    ]

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="contacts")
    full_name = models.CharField(max_length=255)
    phone_whatsapp = models.CharField(max_length=32, blank=True, null=True, unique=True)
    whatsapp_blocked = models.BooleanField(default=False)
    whatsapp_opt_in = models.BooleanField(default=False)
    whatsapp_blocked = models.BooleanField(default=False)
    email = models.EmailField(blank=True, null=True, unique=True)
    telegram_chat_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    TELEGRAM_STATUS_NOT_LINKED = "not_linked"
    TELEGRAM_STATUS_INVITED = "invited"
    TELEGRAM_STATUS_ONBOARDED = "onboarded"
    TELEGRAM_STATUS_BLOCKED = "blocked"
    TELEGRAM_STATUS_CHOICES = [
        (TELEGRAM_STATUS_NOT_LINKED, "Not Linked"),
        (TELEGRAM_STATUS_INVITED, "Invited"),
        (TELEGRAM_STATUS_ONBOARDED, "Onboarded"),
        (TELEGRAM_STATUS_BLOCKED, "Blocked"),
    ]
    telegram_status = models.CharField(max_length=32, choices=TELEGRAM_STATUS_CHOICES, default=TELEGRAM_STATUS_NOT_LINKED)
    telegram_linked = models.BooleanField(default=False)
    telegram_invited = models.BooleanField(default=False)
    telegram_onboarded_at = models.DateTimeField(blank=True, null=True)
    telegram_last_invite_at = models.DateTimeField(blank=True, null=True)
    instagram_scoped_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    segments = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    groups = models.ManyToManyField(ContactGroup, related_name="contacts", blank=True)
    last_inbound_at = models.DateTimeField(blank=True, null=True)
    last_outbound_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.status})"

    def mark_inbound(self, payload: dict[str, str]) -> None:
        """Enrich a contact with inbound identifiers safely."""
        if payload.get("email"):
            validate_email(payload["email"])
            if not self.email:
                self.email = payload["email"]
        for field in ["phone_whatsapp", "telegram_chat_id", "instagram_scoped_id"]:
            value = payload.get(field)
            if value and not getattr(self, field):
                setattr(self, field, value)
        self.last_inbound_at = timezone.now()
        self.save(update_fields=["email", "phone_whatsapp", "telegram_chat_id", "instagram_scoped_id", "last_inbound_at", "updated_at"])


class IdentityConflict(models.Model):
    """Track conflicting identity updates for audit/compliance."""

    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="conflicts")
    field = models.CharField(max_length=64)
    attempted_value = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
