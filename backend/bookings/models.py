from __future__ import annotations

from django.db import models
from django.utils import timezone

from contacts.models import Contact


class Resource(models.Model):
    TYPE_ROOM = "room"
    TYPE_DEVICE = "device"
    TYPE_CHOICES = [
        (TYPE_ROOM, "Room"),
        (TYPE_DEVICE, "Device"),
    ]

    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="resources")
    name = models.CharField(max_length=180)
    resource_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_ROOM)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField(blank=True, default="")
    gcal_calendar_id = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("organization", "name")

    def __str__(self):
        return f"{self.name} ({self.get_resource_type_display()})"


class Booking(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="bookings")
    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"
    STATUS_RESCHEDULED = "rescheduled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_RESCHEDULED, "Rescheduled"),
    ]

    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="bookings")
    resource = models.ForeignKey(Resource, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    title = models.CharField(max_length=180)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    location = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    external_calendar_id = models.CharField(max_length=120, blank=True, default="")
    gcal_event_id = models.CharField(max_length=180, blank=True, default="")
    gcal_calendar_id = models.CharField(max_length=180, blank=True, default="")
    gcal_ical_uid = models.CharField(max_length=180, blank=True, default="")
    gcal_etag = models.CharField(max_length=180, blank=True, default="")
    gcal_sequence = models.IntegerField(null=True, blank=True)
    timezone = models.CharField(max_length=64, blank=True, default="UTC")
    organizer_email = models.EmailField(blank=True, default="")
    attendees = models.JSONField(default=list, blank=True)
    recurrence = models.TextField(blank=True, default="")
    hangout_link = models.CharField(max_length=255, blank=True, default="")
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


class BookingChangeLog(models.Model):
    CHANGE_CREATED = "created"
    CHANGE_UPDATED = "updated"
    CHANGE_CANCELLED = "cancelled"
    CHANGE_RESCHEDULED = "rescheduled"
    CHANGE_NO_SHOW = "no_show"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="change_logs")
    change_type = models.CharField(max_length=32)
    actor_type = models.CharField(max_length=32, blank=True, default="")
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
