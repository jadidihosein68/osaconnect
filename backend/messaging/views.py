from __future__ import annotations

from rest_framework import filters, viewsets
from organizations.utils import get_current_org

from .models import InboundMessage, OutboundMessage
from .serializers import InboundMessageSerializer, OutboundMessageSerializer


class OutboundMessageViewSet(viewsets.ModelViewSet):
    queryset = OutboundMessage.objects.select_related("contact", "template").all()
    serializer_class = OutboundMessageSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "status"]

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org)


class InboundMessageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InboundMessage.objects.select_related("contact").all()
    serializer_class = InboundMessageSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["received_at"]

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org)
