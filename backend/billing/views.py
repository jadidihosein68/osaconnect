from __future__ import annotations

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from organizations.permissions import IsOrgMemberWithRole
from organizations.utils import get_current_org
from .models import BillingLog
from .serializers import BillingLogSerializer, BillingLogResultSerializer


class BillingLogViewSet(viewsets.ModelViewSet):
    serializer_class = BillingLogSerializer
    permission_classes = [IsAuthenticated, IsOrgMemberWithRole]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["feature_tag", "model", "status"]
    ordering_fields = ["timestamp", "created_at", "raw_cost", "billable_cost"]

    def get_queryset(self):
        org = get_current_org(self.request)
        qs = BillingLog.objects.filter(organization=org)
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start:
            qs = qs.filter(timestamp__gte=start)
        if end:
            qs = qs.filter(timestamp__lte=end)
        return qs

    def perform_create(self, serializer):
        # If caller didn't pass timestamp, default to now for dispatch logging
        if not serializer.validated_data.get("timestamp"):
            serializer.validated_data["timestamp"] = timezone.now()
        serializer.save()

    @action(detail=True, methods=["post"], url_path="result")
    def set_result(self, request, pk=None):
        billing = self.get_object()
        serializer = BillingLogResultSerializer(instance=billing, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"status": "ok", "billing": BillingLogSerializer(billing).data})
