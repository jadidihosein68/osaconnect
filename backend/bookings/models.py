from __future__ import annotations

from django.db import models
from django.utils import timezone

from contacts.models import Contact


class Booking(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="bookings")
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="bookings")
    title = models.CharField(max_length=180)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    location = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    external_calendar_id = models.CharField(max_length=120, blank=True, default="")
    created_by = models.CharField(max_length=120, blank=True, default="system")
    created_by_user = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_bookings")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_time"]

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be greater than start time.")
        if self.start_time < timezone.now():
            # allow historical booking creation but warn; real impl would block
            self.notes = f"{self.notes}\nCreated after start time."
