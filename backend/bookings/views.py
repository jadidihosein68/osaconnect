from __future__ import annotations

from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from organizations.permissions import IsOrgMemberWithRole
from organizations.utils import get_current_org
from .models import Booking
from .serializers import BookingSerializer
from .services import calendar_create, calendar_update, calendar_cancel
import logging

audit_logger = logging.getLogger("corbi.audit")


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("contact").all()
    serializer_class = BookingSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "contact__full_name", "contact__email"]
    ordering_fields = ["start_time", "status", "created_at"]
    permission_classes = [IsOrgMemberWithRole]

    def perform_create(self, serializer):
        org = serializer.validated_data["contact"].organization
        booking = serializer.save(
            organization=org, created_by_user=self.request.user if self.request.user.is_authenticated else None
        )
        calendar_create(booking)
        audit_logger.info(
            "booking.created",
            extra={"booking_id": booking.id, "contact_id": booking.contact_id, "org": org.id, "user": getattr(self.request.user, "username", "anon")},
        )

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org)

    def perform_update(self, serializer):
        booking = serializer.save()
        calendar_update(booking)
        audit_logger.info(
            "booking.updated",
            extra={"booking_id": booking.id, "org": booking.organization_id, "user": getattr(self.request.user, "username", "anon")},
        )

    def perform_destroy(self, instance):
        calendar_cancel(instance)
        audit_logger.info(
            "booking.deleted",
            extra={"booking_id": instance.id, "org": instance.organization_id, "user": getattr(self.request.user, "username", "anon")},
        )
        return super().perform_destroy(instance)
