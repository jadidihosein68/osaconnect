from __future__ import annotations

from django.conf import settings
from django.db import models

from organizations.models import Organization


class BillingLog(models.Model):
    STATUS_SENT = "sent"
    STATUS_SUCCEEDED = "succeeded"
    STATUS_FAILED = "failed"
    STATUS_CANCELED = "canceled"
    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_SUCCEEDED, "Succeeded"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CANCELED, "Canceled"),
    ]

    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="billing_logs")
    feature_tag = models.CharField(max_length=100)
    model = models.CharField(max_length=150)
    mode = models.CharField(max_length=50, blank=True)
    tokens_prompt = models.IntegerField(null=True, blank=True)
    tokens_completion = models.IntegerField(null=True, blank=True)
    tokens_total = models.IntegerField(null=True, blank=True)
    raw_cost = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    billable_cost = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    currency = models.CharField(max_length=10, default="USD")
    request_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SENT)
    metadata = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-timestamp", "-id"]
        indexes = [
            models.Index(fields=["organization", "feature_tag", "timestamp"]),
            models.Index(fields=["request_id"]),
        ]

    def __str__(self):
        return f"BillingLog {self.id} {self.feature_tag} {self.model}"
