from __future__ import annotations

import uuid
from .models import Booking
from integrations.models import Integration
from integrations.utils import decrypt_token
from monitoring.utils import record_alert
from monitoring.models import MonitoringAlert
import requests


def _get_calendar_credentials(org_id: int):
    try:
        integration = Integration.objects.get(organization_id=org_id, provider="google_calendar", is_active=True)
    except Integration.DoesNotExist:
        return None
    token = decrypt_token(integration.token_encrypted or "")
    if not token:
        return None
    calendar_id = (integration.extra or {}).get("calendar_id") or "primary"
    return token, calendar_id


def calendar_create(booking: Booking) -> None:
    creds = _get_calendar_credentials(booking.organization_id)
    if not creds:
        return
    token, calendar_id = creds
    payload = {
        "summary": booking.title,
        "description": booking.notes or "",
        "location": booking.location or "",
        "start": {"dateTime": booking.start_time.isoformat()},
        "end": {"dateTime": booking.end_time.isoformat()},
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
        headers=headers,
        json=payload,
        timeout=5,
    )
    if resp.status_code in (200, 201):
        booking.external_calendar_id = resp.json().get("id", f"cal-{uuid.uuid4()}")
        booking.save(update_fields=["external_calendar_id", "updated_at"])
    else:
        booking.notes = f"{booking.notes}\nCalendar create failed: {resp.text}"
        booking.save(update_fields=["notes", "updated_at"])
        record_alert(
            organization=booking.organization,
            category="calendar_failure",
            message=f"Calendar create failed for booking {booking.id}: {resp.text}",
            severity=MonitoringAlert.SEVERITY_WARNING,
            metadata={"booking_id": booking.id, "status": resp.status_code},
        )


def calendar_update(booking: Booking) -> None:
    creds = _get_calendar_credentials(booking.organization_id)
    if not creds or not booking.external_calendar_id:
        return
    token, calendar_id = creds
    payload = {
        "summary": booking.title,
        "description": booking.notes or "",
        "location": booking.location or "",
        "start": {"dateTime": booking.start_time.isoformat()},
        "end": {"dateTime": booking.end_time.isoformat()},
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.patch(
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{booking.external_calendar_id}",
        headers=headers,
        json=payload,
        timeout=5,
    )
    if resp.status_code not in (200, 201):
        booking.notes = f"{booking.notes}\nCalendar update failed: {resp.text}"
        booking.save(update_fields=["notes", "updated_at"])
        record_alert(
            organization=booking.organization,
            category="calendar_failure",
            message=f"Calendar update failed for booking {booking.id}: {resp.text}",
            severity=MonitoringAlert.SEVERITY_WARNING,
            metadata={"booking_id": booking.id, "status": resp.status_code},
        )


def calendar_cancel(booking: Booking) -> None:
    creds = _get_calendar_credentials(booking.organization_id)
    if not creds or not booking.external_calendar_id:
        return
    token, calendar_id = creds
    headers = {"Authorization": f"Bearer {token}"}
    requests.delete(
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{booking.external_calendar_id}",
        headers=headers,
        timeout=5,
    )
    booking.external_calendar_id = ""
    booking.save(update_fields=["external_calendar_id", "updated_at"])
