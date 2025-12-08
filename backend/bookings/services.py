from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
import requests

from .models import Booking, BookingChangeLog
from integrations.models import Integration
from integrations.utils import decrypt_token
from monitoring.utils import record_alert
from monitoring.models import MonitoringAlert


def _load_google_credentials(org_id: int):
    """
    Load Google credentials (access token + metadata).
    Refresh if expired and persist.
    """
    integration = Integration.objects.filter(organization_id=org_id, provider="google_calendar", is_active=True).first()
    if not integration:
        return None, None
    extra = integration.extra or {}
    access_token = extra.get("access_token") or decrypt_token(extra.get("access_token_encrypted", "") or "")
    refresh_token = extra.get("refresh_token") or decrypt_token(extra.get("refresh_token_encrypted", "") or "")
    client_id = extra.get("client_id") or decrypt_token(extra.get("client_id_encrypted", "") or "")
    client_secret = extra.get("client_secret") or decrypt_token(extra.get("client_secret_encrypted", "") or "")
    expires_at = extra.get("access_expires_at")
    calendar_id = extra.get("calendar_id") or "primary"
    organizer_email = extra.get("organizer_email")

    now_ts = datetime.now(dt_timezone.utc).timestamp()
    if (not access_token or (expires_at and now_ts >= float(expires_at) - 60)) and refresh_token and client_id and client_secret:
        try:
            resp = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=10,
            )
            if resp.status_code == 200:
                data_json = resp.json()
                new_access = data_json.get("access_token")
                expires_in = data_json.get("expires_in", 3600)
                if new_access:
                    access_token = new_access
                    extra["access_token"] = new_access
                    extra["access_expires_at"] = now_ts + int(expires_in)
                    integration.extra = extra
                    integration.save(update_fields=["extra", "updated_at"])
        except Exception:
            # keep prior token if refresh fails
            pass
    return access_token, {"calendar_id": calendar_id, "organizer_email": organizer_email, "extra": extra, "integration": integration}


def _google_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _check_freebusy(token: str, calendar_id: str, start_iso: str, end_iso: str) -> bool:
    """Return True if slot is free."""
    body = {"timeMin": start_iso, "timeMax": end_iso, "items": [{"id": calendar_id}]}
    resp = requests.post(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        headers=_google_headers(token),
        json=body,
        timeout=10,
    )
    if resp.status_code != 200:
        return True  # fail-open to avoid blocking
    data = resp.json()
    busy = data.get("calendars", {}).get(calendar_id, {}).get("busy", [])
    return len(busy) == 0


def calendar_create(booking: Booking) -> None:
    token, meta = _load_google_credentials(booking.organization_id)
    if not token or not meta:
        return
    calendar_id = booking.resource.gcal_calendar_id if booking.resource else meta.get("calendar_id") or "primary"
    start_iso = booking.start_time.astimezone(dt_timezone.utc).isoformat()
    end_iso = booking.end_time.astimezone(dt_timezone.utc).isoformat()
    if not _check_freebusy(token, calendar_id, start_iso, end_iso):
        booking.notes = f"{booking.notes}\nCalendar conflict detected."
        booking.save(update_fields=["notes", "updated_at"])
        return
    attendees = booking.attendees or []
    if booking.contact and booking.contact.email:
        attendees.append({"email": booking.contact.email})
    payload = {
        "summary": booking.title,
        "description": booking.notes or "",
        "location": booking.location or "",
        "start": {"dateTime": booking.start_time.isoformat(), "timeZone": booking.timezone or "UTC"},
        "end": {"dateTime": booking.end_time.isoformat(), "timeZone": booking.timezone or "UTC"},
        "attendees": attendees,
    }
    organizer_email = booking.organizer_email or meta.get("organizer_email")
    if organizer_email:
        payload["organizer"] = {"email": organizer_email}
    headers = _google_headers(token)
    resp = requests.post(
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
        headers=headers,
        json=payload,
        params={"sendUpdates": "all"},
        timeout=10,
    )
    if resp.status_code in (200, 201):
        data = resp.json()
        booking.external_calendar_id = data.get("id", f"cal-{uuid.uuid4()}")
        booking.gcal_event_id = data.get("id", "")
        booking.gcal_calendar_id = calendar_id
        booking.gcal_ical_uid = data.get("iCalUID", "")
        booking.gcal_etag = data.get("etag", "")
        booking.gcal_sequence = data.get("sequence")
        booking.hangout_link = data.get("htmlLink", "") or data.get("hangoutLink", "") or booking.hangout_link
        booking.save(update_fields=["external_calendar_id", "gcal_event_id", "gcal_calendar_id", "gcal_ical_uid", "gcal_etag", "gcal_sequence", "hangout_link", "updated_at"])
        BookingChangeLog.objects.create(booking=booking, change_type=BookingChangeLog.CHANGE_CREATED, actor_type=booking.created_by or "system")
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
    if not booking.external_calendar_id:
        return calendar_create(booking)
    token, meta = _load_google_credentials(booking.organization_id)
    if not token or not meta:
        return
    calendar_id = booking.resource.gcal_calendar_id if booking.resource else booking.gcal_calendar_id or meta.get("calendar_id") or "primary"
    attendees = booking.attendees or []
    if booking.contact and booking.contact.email:
        attendees.append({"email": booking.contact.email})
    payload = {
        "summary": booking.title,
        "description": booking.notes or "",
        "location": booking.location or "",
        "start": {"dateTime": booking.start_time.isoformat(), "timeZone": booking.timezone or "UTC"},
        "end": {"dateTime": booking.end_time.isoformat(), "timeZone": booking.timezone or "UTC"},
        "attendees": attendees,
        "etag": booking.gcal_etag or None,
    }
    headers = _google_headers(token)
    resp = requests.patch(
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{booking.external_calendar_id}",
        headers=headers,
        json=payload,
        params={"sendUpdates": "all"},
        timeout=10,
    )
    if resp.status_code in (200, 201):
        data = resp.json()
        booking.gcal_etag = data.get("etag", "")
        booking.gcal_sequence = data.get("sequence")
        booking.gcal_ical_uid = data.get("iCalUID", booking.gcal_ical_uid)
        booking.hangout_link = data.get("htmlLink", "") or data.get("hangoutLink", "") or booking.hangout_link
        booking.save(update_fields=["gcal_etag", "gcal_sequence", "gcal_ical_uid", "hangout_link", "updated_at"])
        BookingChangeLog.objects.create(booking=booking, change_type=BookingChangeLog.CHANGE_UPDATED, actor_type=booking.created_by or "system")
    else:
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
    if not booking.external_calendar_id:
        return
    token, meta = _load_google_credentials(booking.organization_id)
    if not token or not meta:
        return
    calendar_id = booking.resource.gcal_calendar_id if booking.resource else booking.gcal_calendar_id or meta.get("calendar_id") or "primary"
    headers = _google_headers(token)
    requests.delete(
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{booking.external_calendar_id}",
        headers=headers,
        timeout=10,
    )
    booking.status = Booking.STATUS_CANCELLED
    booking.save(update_fields=["status", "updated_at"])
    BookingChangeLog.objects.create(booking=booking, change_type=BookingChangeLog.CHANGE_CANCELLED, actor_type=booking.created_by or "system")
