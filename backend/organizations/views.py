from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Membership
from .serializers import MembershipSerializer


class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Membership.objects.select_related("organization").filter(user=self.request.user)
