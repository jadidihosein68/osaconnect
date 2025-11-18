from __future__ import annotations

import socket

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthcheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "hostname": socket.gethostname(),
                "debug": settings.DEBUG,
                "queue": {
                    "celery_broker": settings.CELERY_BROKER_URL,
                    "eager": settings.CELERY_TASK_ALWAYS_EAGER,
                },
            }
        )


class MetricsView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        from contacts.models import Contact
        from messaging.models import InboundMessage, OutboundMessage
        from bookings.models import Booking

        return Response(
            {
                "contacts": Contact.objects.count(),
                "outbound": OutboundMessage.objects.count(),
                "inbound": InboundMessage.objects.count(),
                "bookings": Booking.objects.count(),
                "retrying": OutboundMessage.objects.filter(status=OutboundMessage.STATUS_RETRYING).count(),
                "failed": OutboundMessage.objects.filter(status=OutboundMessage.STATUS_FAILED).count(),
            }
        )
