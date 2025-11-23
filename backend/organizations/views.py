from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Membership
from .serializers import MembershipSerializer


class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Membership.objects.select_related("organization").filter(user=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    memberships = Membership.objects.select_related("organization").filter(user=request.user)
    return Response(
        {
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
            },
            "memberships": MembershipSerializer(memberships, many=True).data,
        }
    )
