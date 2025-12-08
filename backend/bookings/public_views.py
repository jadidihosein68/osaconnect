from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from rest_framework import serializers
from zoneinfo import ZoneInfo

from organizations.utils import get_current_org
from .models import Booking
from .serializers import BookingSerializer
from .services import calendar_create, calendar_update, calendar_cancel


def _booking_to_public(b: Booking) -> dict[str, Any]:
    """
    Map an internal Booking to the public response shape.
    """
    organizer = {
        "id": b.created_by_user_id or b.id,
        "name": b.created_by_user.get_full_name() if b.created_by_user else b.organizer_email or "organizer",
        "email": b.organizer_email,
        "username": b.created_by_user.username if b.created_by_user else "",
        "timeZone": b.timezone or "UTC",
    }
    attendees = []
    for a in b.attendees or []:
        attendees.append(
            {
                "name": a.get("name") or "",
                "email": a.get("email") or "",
                "timeZone": b.timezone or "UTC",
                "absent": False,
                "language": a.get("language") or "",
                "phoneNumber": a.get("phoneNumber") or "",
            }
        )
    duration = int((b.end_time - b.start_time).total_seconds() // 60)
    return {
        "id": b.id,
        "uid": b.gcal_ical_uid or b.external_calendar_id or str(b.id),
        "title": b.title,
        "description": b.notes,
        "hosts": [organizer],
        "status": b.status,
        "start": b.start_time.isoformat(),
        "end": b.end_time.isoformat(),
        "duration": duration,
        "eventTypeId": b.resource_id,
        "eventType": {"id": b.resource_id, "slug": b.resource.name if b.resource else ""},
        "location": b.location,
        "absentHost": False,
        "createdAt": b.created_at.isoformat(),
        "updatedAt": b.updated_at.isoformat(),
        "attendees": attendees,
        "bookingFieldsResponses": {},
        "cancellationReason": "",
        "cancelledByEmail": "",
        "reschedulingReason": "",
        "rescheduledByEmail": "",
        "rescheduledFromUid": "",
        "rescheduledToUid": "",
        "meetingUrl": b.hangout_link or b.location,
        "metadata": {},
        "icsUid": b.gcal_ical_uid or "",
        "guests": [a.get("email") for a in b.attendees or [] if a.get("email")],
    }


class PublicBookingCreateSerializer(serializers.Serializer):
    start = serializers.DateTimeField()
    end = serializers.DateTimeField(required=False)
    lengthInMinutes = serializers.IntegerField(required=False)
    title = serializers.CharField(required=False)
    summary = serializers.CharField(required=False)
    description = serializers.CharField(required=False)
    organizerEmail = serializers.EmailField(required=False)
    attendee = serializers.DictField(required=False)
    guests = serializers.ListField(child=serializers.EmailField(), required=False)
    location = serializers.JSONField(required=False)
    timeZone = serializers.CharField(required=False)


class PublicRescheduleSerializer(serializers.Serializer):
    start = serializers.DateTimeField()
    rescheduledBy = serializers.EmailField(required=False)
    reschedulingReason = serializers.CharField(required=False)
    emailVerificationCode = serializers.CharField(required=False)


class PublicCancelSerializer(serializers.Serializer):
    cancellationReason = serializers.CharField(required=False)
    cancelSubsequentBookings = serializers.BooleanField(required=False)


class PublicBookingView(APIView):
    """
    Public-facing booking API v1 (read/create) for external agents (e.g., Eleven Labs).
    Requires Bearer JWT for now (same auth as internal APIs). Tagged as Calendar Public API.
    """

    @extend_schema(
        tags=["Calendar Public API"],
        parameters=[
            OpenApiParameter("attendeeEmail", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("attendeeName", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("bookingUid", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("afterStart", OpenApiTypes.DATETIME, OpenApiParameter.QUERY),
            OpenApiParameter("beforeEnd", OpenApiTypes.DATETIME, OpenApiParameter.QUERY),
            OpenApiParameter("afterCreatedAt", OpenApiTypes.DATETIME, OpenApiParameter.QUERY),
            OpenApiParameter("beforeCreatedAt", OpenApiTypes.DATETIME, OpenApiParameter.QUERY),
            OpenApiParameter("afterUpdatedAt", OpenApiTypes.DATETIME, OpenApiParameter.QUERY),
            OpenApiParameter("beforeUpdatedAt", OpenApiTypes.DATETIME, OpenApiParameter.QUERY),
            OpenApiParameter("sortStart", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("sortEnd", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("sortCreated", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("sortUpdated", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("take", OpenApiTypes.INT, OpenApiParameter.QUERY),
            OpenApiParameter("skip", OpenApiTypes.INT, OpenApiParameter.QUERY),
        ],
        summary="List bookings (public)",
    )
    def get(self, request):
        org = get_current_org(request)
        if not org:
            return Response({"status": "error", "message": "Organization required"}, status=status.HTTP_400_BAD_REQUEST)
        qs = Booking.objects.filter(organization=org)

        # filters
        attendee_email = request.query_params.get("attendeeEmail")
        attendee_name = request.query_params.get("attendeeName")
        booking_uid = request.query_params.get("bookingUid")
        after_start = request.query_params.get("afterStart")
        before_end = request.query_params.get("beforeEnd")
        after_created = request.query_params.get("afterCreatedAt")
        before_created = request.query_params.get("beforeCreatedAt")
        after_updated = request.query_params.get("afterUpdatedAt")
        before_updated = request.query_params.get("beforeUpdatedAt")
        sort_start = request.query_params.get("sortStart")
        sort_end = request.query_params.get("sortEnd")
        sort_created = request.query_params.get("sortCreated")
        sort_updated = request.query_params.get("sortUpdated")
        take = int(request.query_params.get("take") or 100)
        skip = int(request.query_params.get("skip") or 0)

        if attendee_email:
            qs = qs.filter(attendees__icontains=attendee_email)
        if attendee_name:
            qs = qs.filter(attendees__icontains=attendee_name)
        if booking_uid:
            qs = qs.filter(Q(gcal_ical_uid=booking_uid) | Q(external_calendar_id=booking_uid) | Q(gcal_event_id=booking_uid))
        if after_start:
            qs = qs.filter(start_time__gte=after_start)
        if before_end:
            qs = qs.filter(end_time__lte=before_end)
        if after_created:
            qs = qs.filter(created_at__gte=after_created)
        if before_created:
            qs = qs.filter(created_at__lte=before_created)
        if after_updated:
            qs = qs.filter(updated_at__gte=after_updated)
        if before_updated:
            qs = qs.filter(updated_at__lte=before_updated)

        ordering = []
        if sort_start:
            ordering.append("start_time" if sort_start.lower() == "asc" else "-start_time")
        if sort_end:
            ordering.append("end_time" if sort_end.lower() == "asc" else "-end_time")
        if sort_created:
            ordering.append("created_at" if sort_created.lower() == "asc" else "-created_at")
        if sort_updated:
            ordering.append("updated_at" if sort_updated.lower() == "asc" else "-updated_at")
        if ordering:
            qs = qs.order_by(*ordering)

        total = qs.count()
        qs = qs[skip : skip + take]
        data = [_booking_to_public(b) for b in qs]
        return Response({"status": "success", "data": data, "error": {}, "count": total})

    @extend_schema(
        tags=["Calendar Public API"],
        summary="Create booking (public)",
        request=PublicBookingCreateSerializer,
    )
    def post(self, request):
        org = get_current_org(request)
        if not org:
            return Response({"status": "error", "message": "Organization required"}, status=status.HTTP_400_BAD_REQUEST)
        body = request.data or {}
        start = body.get("start")
        end = body.get("end")
        length = body.get("lengthInMinutes")
        tz_str = body.get("timeZone") or "UTC"
        if not start:
            return Response({"status": "error", "message": "start is required"}, status=status.HTTP_400_BAD_REQUEST)
        start_dt = parse_datetime(start)
        if start_dt is None:
            return Response({"status": "error", "message": "Invalid start"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tzinfo = ZoneInfo(tz_str)
        except Exception:
            tzinfo = timezone.utc
        # If client provided Z/offset but also timeZone, honor the provided time as wall-clock in that timeZone
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=tzinfo)
        else:
            start_dt = start_dt.replace(tzinfo=tzinfo)
        if not end and length:
            try:
                end_dt = start_dt + timedelta(minutes=length)
                end = end_dt.isoformat()
            except Exception:
                return Response({"status": "error", "message": "Invalid start or lengthInMinutes"}, status=status.HTTP_400_BAD_REQUEST)
        end_dt = None
        if end:
            end_dt = parse_datetime(end)
            if end_dt is None:
                return Response({"status": "error", "message": "Invalid end"}, status=status.HTTP_400_BAD_REQUEST)
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=tzinfo)
            else:
                end_dt = end_dt.replace(tzinfo=tzinfo)
        if end_dt and end_dt <= start_dt:
            return Response({"status": "error", "message": "end must be after start"}, status=status.HTTP_400_BAD_REQUEST)
        title = body.get("title") or body.get("summary") or "Booking"
        notes = body.get("description") or ""
        organizer_email = body.get("organizerEmail") or ""
        attendee = body.get("attendee") or {}
        guests = body.get("guests") or []
        attendee_emails = [attendee.get("email")] if attendee.get("email") else []
        for g in guests:
            if isinstance(g, str):
                attendee_emails.append(g)
        payload = {
            "meeting_type": Booking.TYPE_CUSTOM,
            "title": title,
            "start_time": start_dt.isoformat(),
            "end_time": end_dt.isoformat() if end_dt else None,
            "notes": notes,
            "organizer_email": organizer_email,
            "attendee_emails": attendee_emails,
            "location": (body.get("location") or {}).get("value") if isinstance(body.get("location"), dict) else body.get("location") or "",
            "timezone": tz_str,
        }
        serializer = BookingSerializer(data=payload, context={"request": request})
        if serializer.is_valid():
            booking = serializer.save()
            # Trigger calendar creation (same behavior as internal bookings)
            calendar_create(booking)
            return Response({"status": "success", "data": _booking_to_public(booking), "error": {}}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


def _get_booking_by_uid(org, uid: str) -> Booking | None:
    return Booking.objects.filter(
        organization=org
    ).filter(
        Q(gcal_ical_uid=uid) | Q(external_calendar_id=uid) | Q(gcal_event_id=uid) | Q(id__iexact=uid)
    ).first()


class PublicBookingRescheduleView(APIView):
    """
    Reschedule a booking by UID (public API v1).
    """

    @extend_schema(tags=["Calendar Public API"], summary="Reschedule booking (public)", request=PublicRescheduleSerializer)
    def post(self, request, booking_uid: str):
        org = get_current_org(request)
        if not org:
            return Response({"status": "error", "message": "Organization required"}, status=status.HTTP_400_BAD_REQUEST)
        booking = _get_booking_by_uid(org, booking_uid)
        if not booking:
            return Response({"status": "error", "message": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
        if booking.status == Booking.STATUS_CANCELLED:
            return Response({"status": "error", "message": "Cannot reschedule a cancelled booking"}, status=status.HTTP_400_BAD_REQUEST)
        body = request.data or {}
        start = body.get("start")
        if not start:
            return Response({"status": "error", "message": "start is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            start_dt = timezone.datetime.fromisoformat(start)
        except Exception:
            return Response({"status": "error", "message": "Invalid start"}, status=status.HTTP_400_BAD_REQUEST)
        tz_str = booking.timezone or "UTC"
        try:
            tzinfo = ZoneInfo(tz_str)
        except Exception:
            tzinfo = timezone.utc
        # Treat provided start as wall-clock in the booking's stored timezone (ignore incoming offset)
        start_dt = start_dt.replace(tzinfo=tzinfo)
        if booking.end_time and booking.start_time:
            delta = booking.end_time - booking.start_time
            end_dt = start_dt + delta
        else:
            end_dt = start_dt + timedelta(minutes=30)
        booking.start_time = start_dt
        booking.end_time = end_dt
        booking.status = Booking.STATUS_RESCHEDULED
        booking.notes = booking.notes or ""
        reason = body.get("reschedulingReason")
        if reason:
            booking.notes += f"\nReschedule reason: {reason}"
        booking.save()
        calendar_update(booking)
        return Response({"status": "success", "data": _booking_to_public(booking), "error": {}}, status=status.HTTP_200_OK)


class PublicBookingCancelView(APIView):
    """
    Cancel a booking by UID (public API v1).
    """

    @extend_schema(tags=["Calendar Public API"], summary="Cancel booking (public)", request=PublicCancelSerializer)
    def post(self, request, booking_uid: str):
        org = get_current_org(request)
        if not org:
            return Response({"status": "error", "message": "Organization required"}, status=status.HTTP_400_BAD_REQUEST)
        booking = _get_booking_by_uid(org, booking_uid)
        if not booking:
            return Response({"status": "error", "message": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
        reason = (request.data or {}).get("cancellationReason") or ""
        booking.status = Booking.STATUS_CANCELLED
        if reason:
            booking.notes = (booking.notes or "") + f"\nCancelled: {reason}"
        booking.save()
        calendar_cancel(booking)
        return Response({"status": "success", "data": _booking_to_public(booking), "error": {}}, status=status.HTTP_200_OK)


class PublicSlotsView(APIView):
    """
    Return simple available slots within a window (public API v1).
    This implementation uses local bookings as busy blocks and returns open slots of `duration` minutes.
    """

    @extend_schema(
        tags=["Calendar Public API"],
        summary="Get available slots (public)",
        parameters=[
            OpenApiParameter("start", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("end", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("duration", OpenApiTypes.INT, OpenApiParameter.QUERY),
            OpenApiParameter("timeZone", OpenApiTypes.STR, OpenApiParameter.QUERY),
        ],
    )
    def get(self, request):
        org = get_current_org(request)
        if not org:
            return Response({"status": "error", "message": "Organization required"}, status=status.HTTP_400_BAD_REQUEST)
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if not start or not end:
            return Response({"status": "error", "message": "start and end are required"}, status=status.HTTP_400_BAD_REQUEST)
        duration = int(request.query_params.get("duration") or 60)
        start_dt = parse_datetime(start)
        end_dt = parse_datetime(end)
        if start_dt is None or end_dt is None:
            return Response({"status": "error", "message": "Invalid start or end"}, status=status.HTTP_400_BAD_REQUEST)
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        if start_dt >= end_dt:
            return Response({"status": "error", "message": "start must be before end"}, status=status.HTTP_400_BAD_REQUEST)
        busy = list(
            Booking.objects.filter(organization=org, start_time__lt=end_dt, end_time__gt=start_dt).values(
                "start_time", "end_time"
            )
        )
        cur = start_dt
        data = {}
        while cur < end_dt:
            slot_end = cur + timedelta(minutes=duration)
            if slot_end > end_dt:
                break
            overlap = any(not (slot_end <= b["start_time"] or cur >= b["end_time"]) for b in busy)
            if not overlap:
                key = cur.date().isoformat()
                data.setdefault(key, []).append({"start": cur.isoformat()})
            cur = slot_end
        return Response({"status": "success", "data": data})
