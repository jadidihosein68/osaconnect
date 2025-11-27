from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import models

from organizations.models import Organization

User = get_user_model()


class Notification(models.Model):
    TYPE_CHOICES = [
        ("SYSTEM", "System"),
        ("CAMPAIGN", "Campaign"),
        ("OUTBOUND", "Outbound"),
        ("INBOUND", "Inbound"),
        ("BOOKINGS", "Bookings"),
        ("INTEGRATION", "Integration"),
        ("BILLING", "Billing"),
        ("MONITORING", "Monitoring"),
    ]

    SEVERITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="notifications")
    created_at = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=32, choices=TYPE_CHOICES, default="SYSTEM")
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default="LOW")
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    target_url = models.CharField(max_length=500, blank=True, null=True)
    data = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_notifications")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "type"]),
            models.Index(fields=["organization", "severity"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.organization_id})"


class NotificationRecipient(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name="recipients")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notification_recipients")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="notification_recipients")
    read_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "user", "read_at", "created_at"]),
            models.Index(fields=["organization", "user", "read_at"]),
        ]

    def __str__(self):
        return f"{self.notification_id} → {self.user_id}"
