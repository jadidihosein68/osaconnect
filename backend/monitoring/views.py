from __future__ import annotations

import socket

from django.conf import settings
from django.utils import timezone
from django.db import connections
from django.db.migrations.executor import MigrationExecutor
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
        from messaging.models import InboundMessage, OutboundMessage
        from bookings.models import Booking
        from organizations.utils import get_current_org

        org = get_current_org(request)
        today = timezone.now().date()
        return Response(
            {
                "contacts": Contact.objects.filter(organization=org).count(),
                "outbound": OutboundMessage.objects.filter(organization=org).count(),
                "inbound": InboundMessage.objects.filter(organization=org).count(),
                "bookings": Booking.objects.filter(organization=org).count(),
                "retrying": OutboundMessage.objects.filter(organization=org, status=OutboundMessage.STATUS_RETRYING).count(),
                "failed": OutboundMessage.objects.filter(organization=org, status=OutboundMessage.STATUS_FAILED).count(),
                "today_outbound": OutboundMessage.objects.filter(organization=org, created_at__date=today).count(),
                "delivered_today": OutboundMessage.objects.filter(
                    organization=org, created_at__date=today, status__in=[OutboundMessage.STATUS_DELIVERED, OutboundMessage.STATUS_READ]
                ).count(),
                "failed_today": OutboundMessage.objects.filter(
                    organization=org, created_at__date=today, status=OutboundMessage.STATUS_FAILED
                ).count(),
            }
        )


class MonitoringSummaryView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from messaging.models import OutboundMessage, InboundMessage
        from organizations.utils import get_current_org

        org = get_current_org(request)
        today = timezone.now().date()

        outbound_today = OutboundMessage.objects.filter(organization=org, created_at__date=today)
        delivered_today = outbound_today.filter(status__in=[OutboundMessage.STATUS_DELIVERED, OutboundMessage.STATUS_READ]).count()
        failed_today = outbound_today.filter(status=OutboundMessage.STATUS_FAILED).count()
        total_today = outbound_today.count()
        success_rate = (delivered_today / total_today) * 100 if total_today else 0

        inbound_today = InboundMessage.objects.filter(organization=org, received_at__date=today).count()

        return Response(
            {
                "totals": {
                    "outbound_today": total_today,
                    "delivered_today": delivered_today,
                    "failed_today": failed_today,
                    "inbound_today": inbound_today,
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
