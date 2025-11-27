from __future__ import annotations

import socket

from django.conf import settings
from django.utils import timezone
from django.db import connections, models
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication


class HealthcheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        pending_migrations = 0
        try:
            executor = MigrationExecutor(connections["default"])
            plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
            pending_migrations = len(plan)
        except Exception:
            pending_migrations = -1  # signal check failure without breaking health

        return Response(
            {
                "status": "ok",
                "hostname": socket.gethostname(),
                "debug": settings.DEBUG,
                "queue": {
                    "celery_broker": settings.CELERY_BROKER_URL,
                    "eager": settings.CELERY_TASK_ALWAYS_EAGER,
                },
                "pending_migrations": pending_migrations,
            }
        )


class MetricsView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from contacts.models import Contact
        from messaging.models import InboundMessage, OutboundMessage, EmailRecipient
        from bookings.models import Booking
        from messaging.models import Campaign, CampaignRecipient
        from monitoring.models import MonitoringAlert
        from organizations.utils import get_current_org

        org = get_current_org(request)
        today = timezone.now().date()
        campaigns = Campaign.objects.filter(organization=org)
        email_recipients = EmailRecipient.objects.filter(job__organization=org)
        alerts = MonitoringAlert.objects.filter(organization=org)
        email_read = email_recipients.filter(status__in=["read"]).count()

        outbound_msgs = OutboundMessage.objects.filter(organization=org)
        outbound_failed = outbound_msgs.filter(status=OutboundMessage.STATUS_FAILED).count()
        outbound_today_msgs = outbound_msgs.filter(created_at__date=today).count()
        outbound_today_failed = outbound_msgs.filter(created_at__date=today, status=OutboundMessage.STATUS_FAILED).count()

        email_total = email_recipients.count()
        email_failed = email_recipients.filter(status="failed").count()
        email_today = email_recipients.filter(created_at__date=today).count()
        email_today_failed = email_recipients.filter(created_at__date=today, status="failed").count()

        return Response(
            {
                "contacts": Contact.objects.filter(organization=org).count(),
                "outbound": outbound_msgs.count() + email_total,
                "inbound": InboundMessage.objects.filter(organization=org).count(),
                "bookings": Booking.objects.filter(organization=org).count(),
                "retrying": OutboundMessage.objects.filter(organization=org, status=OutboundMessage.STATUS_RETRYING).count(),
                "failed": outbound_failed + email_failed,
                "today_outbound": outbound_today_msgs + email_today,
                "delivered_today": outbound_msgs.filter(
                    created_at__date=today, status__in=[OutboundMessage.STATUS_DELIVERED, OutboundMessage.STATUS_READ]
                ).count()
                + email_recipients.filter(created_at__date=today, status__in=["delivered", "read"]).count(),
                "failed_today": outbound_today_failed + email_today_failed,
                "campaigns": campaigns.count(),
                "campaigns_active": campaigns.exclude(status__in=["completed", "failed"]).count(),
                "email_jobs_recipients": email_recipients.count(),
                "email_jobs_delivered": email_recipients.filter(status__in=["delivered", "read"]).count(),
                "email_jobs_failed": email_recipients.filter(status="failed").count(),
                "email_jobs_read": email_read,
                "alerts_open": alerts.filter(is_acknowledged=False).count(),
            }
        )


class MonitoringSummaryView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        from messaging.models import OutboundMessage, InboundMessage, EmailRecipient, Campaign
        from monitoring.models import MonitoringAlert
        from organizations.utils import get_current_org

        org = get_current_org(request)
        today = timezone.now().date()
        range_param = request.query_params.get("range", "today")
        if range_param == "7d":
            start_date = today - timedelta(days=7)
        elif range_param == "30d":
            start_date = today - timedelta(days=30)
        else:
            start_date = today

        outbound_range = OutboundMessage.objects.filter(organization=org, created_at__date__gte=start_date)
        delivered_range = outbound_range.filter(status__in=[OutboundMessage.STATUS_DELIVERED, OutboundMessage.STATUS_READ]).count()
        failed_range = outbound_range.filter(status=OutboundMessage.STATUS_FAILED).count()
        total_range = outbound_range.count()

        inbound_range = InboundMessage.objects.filter(organization=org, received_at__date__gte=start_date).count()

        campaigns = Campaign.objects.filter(organization=org, created_at__date__gte=start_date)
        email_recipients = EmailRecipient.objects.filter(job__organization=org, created_at__date__gte=start_date)
        email_delivered = email_recipients.filter(status__in=["delivered", "read"]).count()
        email_failed = email_recipients.filter(status="failed").count()
        email_read = email_recipients.filter(status="read").count()
        email_total = email_recipients.count()

        outbound_total = total_range + email_total
        inbound_total = inbound_range
        failed_total = failed_range + email_failed
        delivered_total = delivered_range + email_delivered
        success_rate = (delivered_total / outbound_total) * 100 if outbound_total else 0

        alerts_open = MonitoringAlert.objects.filter(organization=org, is_acknowledged=False).count()

        return Response(
            {
                "totals": {
                    "outbound_today": outbound_total,
                    "delivered_today": delivered_total,
                    "failed_today": failed_total,
                    "inbound_today": inbound_total,
                    "outbound_total": outbound_total,
                    "inbound_total": inbound_total,
                    "failed_total": failed_total,
                    "delivered_total": delivered_total,
                    "campaigns": campaigns.count(),
                    "campaigns_active": campaigns.exclude(status__in=["completed", "failed"]).count(),
                    "email_recipients": email_total,
                    "email_delivered": email_delivered,
                    "email_failed": email_failed,
                    "email_read": email_read,
                    "alerts_open": alerts_open,
                },
                "success_rate": success_rate,
                "average_response_ms": None,  # placeholder until callbacks supply timing metadata
            }
        )


class SettingsView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "outbound_per_minute_limit": getattr(settings, "OUTBOUND_PER_MINUTE_LIMIT", None),
                "assistant_provider": getattr(settings, "ASSISTANT_PROVIDER", "stub"),
                "calendar_provider": getattr(settings, "CALENDAR_PROVIDER", None),
                "channels": ["whatsapp", "email", "telegram", "instagram"],
            }
        )


class MonitoringDetailView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        from messaging.models import OutboundMessage, InboundMessage, ProviderEvent
        from bookings.models import Booking
        from messaging.models import Campaign, EmailRecipient
        from monitoring.models import MonitoringAlert
        from organizations.utils import get_current_org

        org = get_current_org(request)
        today = timezone.now().date()
        range_param = request.query_params.get("range", "today")
        if range_param == "7d":
            start_date = today - timedelta(days=7)
        elif range_param == "30d":
            start_date = today - timedelta(days=30)
        else:
            start_date = today

        outbound = OutboundMessage.objects.filter(organization=org, created_at__date__gte=start_date)
        per_channel = {}
        for channel in ["whatsapp", "email", "telegram", "instagram"]:
            qs = outbound.filter(channel=channel)
            total = qs.count()
            delivered = qs.filter(status__in=[OutboundMessage.STATUS_DELIVERED, OutboundMessage.STATUS_READ]).count()
            failed = qs.filter(status=OutboundMessage.STATUS_FAILED).count()
            per_channel[channel] = {
                "total": total,
                "delivered": delivered,
                "failed": failed,
                "success_rate": (delivered / total) * 100 if total else 0,
            }

        failure_reasons = {}
        for err in outbound.filter(status=OutboundMessage.STATUS_FAILED).values_list("error", flat=True):
            if not err:
                err = "Unknown"
            failure_reasons[err] = failure_reasons.get(err, 0) + 1

        today_events = ProviderEvent.objects.filter(organization=org, received_at__date__gte=start_date)
        callback_errors = today_events.filter(status__in=["failed", "bounced"]).count()
        latency_values = list(today_events.filter(latency_ms__gt=0).values_list("latency_ms", flat=True))
        avg_latency = sum(latency_values) / len(latency_values) if latency_values else 0

        def percentile(data, p):
            if not data:
                return 0
            data = sorted(data)
            k = (len(data) - 1) * (p / 100)
            f = int(k)
            c = min(f + 1, len(data) - 1)
            if f == c:
                return data[int(k)]
            d0 = data[f] * (c - k)
            d1 = data[c] * (k - f)
            return d0 + d1
        inbound_today = InboundMessage.objects.filter(organization=org, received_at__date__gte=start_date).count()

        bookings_today = Booking.objects.filter(organization=org, created_at__date__gte=start_date)
        booking_failures = bookings_today.filter(status=Booking.STATUS_CANCELLED).count()

        # Email/campaign rollups (range-aware)
        campaign_count = Campaign.objects.filter(organization=org, created_at__date__gte=start_date).count()
        email_recipients = EmailRecipient.objects.filter(job__organization=org, created_at__date__gte=start_date)
        email_summary = {
            "total": email_recipients.count(),
            "delivered": email_recipients.filter(status__in=["delivered", "read"]).count(),
            "failed": email_recipients.filter(status="failed").count(),
            "read": email_recipients.filter(status="read").count(),
        }
        alerts_today = MonitoringAlert.objects.filter(organization=org, created_at__date__gte=start_date)

        # Merge email stats into per_channel email bucket
        email_bucket = per_channel.get("email", {"total": 0, "delivered": 0, "failed": 0, "success_rate": 0})
        total_email = email_bucket["total"] + email_summary["total"]
        delivered_email = email_bucket["delivered"] + email_summary["delivered"]
        failed_email = email_bucket["failed"] + email_summary["failed"]
        per_channel["email"] = {
            "total": total_email,
            "delivered": delivered_email,
            "failed": failed_email,
            "success_rate": (delivered_email / total_email) * 100 if total_email else 0,
        }
        failure_reasons["Email failed"] = failure_reasons.get("Email failed", 0) + email_summary["failed"]

        return Response(
            {
                "per_channel": per_channel,
                "summary": {
                    "outbound": outbound.count(),
                    "inbound": inbound_today,
                    "callback_errors": callback_errors,
                    "booking_failures": booking_failures,
                    "ai_failures": 0,
                    "avg_callback_latency_ms": avg_latency,
                    "p50_latency_ms": percentile(latency_values, 50),
                    "p95_latency_ms": percentile(latency_values, 95),
                    "p99_latency_ms": percentile(latency_values, 99),
                    "campaigns_today": campaign_count,
                    "email_recipients": email_summary,
                    "alerts_today": alerts_today.count(),
                },
                "failure_reasons": failure_reasons,
            }
        )


class MonitoringEventsView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from messaging.models import ProviderEvent
        from organizations.utils import get_current_org

        org = get_current_org(request)
        limit = int(request.query_params.get("limit", 100))
        events = ProviderEvent.objects.filter(organization=org).order_by("-received_at")[:limit]
        data = [
            {
                "id": event.id,
                "channel": event.channel,
                "status": event.status,
                "latency_ms": event.latency_ms,
                "received_at": event.received_at,
                "outbound_id": event.outbound_id,
            }
            for event in events
        ]
        return Response(data)


class MonitoringAlertsView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from monitoring.models import MonitoringAlert
        from organizations.utils import get_current_org

        org = get_current_org(request)
        limit = int(request.query_params.get("limit", 50))
        alerts = MonitoringAlert.objects.filter(organization=org).order_by("-created_at")[:limit]
        data = [
            {
                "id": alert.id,
                "category": alert.category,
                "severity": alert.severity,
                "message": alert.message,
                "metadata": alert.metadata,
                "created_at": alert.created_at,
                "is_acknowledged": alert.is_acknowledged,
            }
            for alert in alerts
        ]
        return Response(data)
