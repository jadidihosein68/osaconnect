from __future__ import annotations

import uuid
from django.conf import settings
from .models import Booking


def _provider_enabled() -> bool:
    return bool(getattr(settings, "CALENDAR_PROVIDER", "")) and bool(getattr(settings, "CALENDAR_API_KEY", ""))


def calendar_create(booking: Booking) -> None:
    """Simulate creating a calendar event and storing the provider id."""
    if not _provider_enabled():
        return
    # In a real integration hit Google/Microsoft here.
    provider_prefix = getattr(settings, "CALENDAR_PROVIDER", "local")
    booking.external_calendar_id = f"{provider_prefix}-{uuid.uuid4()}"
    booking.save(update_fields=["external_calendar_id", "updated_at"])


def calendar_update(booking: Booking) -> None:
    if not _provider_enabled() or not booking.external_calendar_id:
        return
    # Placeholder: invoke provider update API
    booking.notes = f"{booking.notes}\nSynced with calendar {booking.external_calendar_id}"
    booking.save(update_fields=["notes", "updated_at"])


def calendar_cancel(booking: Booking) -> None:
    if not _provider_enabled() or not booking.external_calendar_id:
        return
    # Placeholder: invoke provider cancel API
    booking.external_calendar_id = ""
    booking.save(update_fields=["external_calendar_id", "updated_at"])
