from __future__ import annotations

from rest_framework import filters, viewsets

from .models import Booking
from .serializers import BookingSerializer


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("contact").all()
    serializer_class = BookingSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "contact__full_name", "contact__email"]
    ordering_fields = ["start_time", "status", "created_at"]
