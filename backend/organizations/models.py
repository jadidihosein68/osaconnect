from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)
    domain = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Membership(models.Model):
    ROLE_ADMIN = "admin"
    ROLE_STAFF = "staff"
    ROLE_VIEWER = "viewer"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_STAFF, "Staff"),
        (ROLE_VIEWER, "Viewer"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STAFF)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "organization")
        ordering = ["user__username"]

    def __str__(self) -> str:
        return f"{self.user} in {self.organization} ({self.role})"
