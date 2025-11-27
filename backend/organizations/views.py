from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Membership, OrganizationBranding
from .serializers import MembershipSerializer, OrganizationBrandingSerializer
from .utils import get_current_org
from .permissions import IsOrgMemberWithRole


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


class BrandingViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsOrgMemberWithRole]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self, request):
        org = get_current_org(request)
        branding, _ = OrganizationBranding.objects.get_or_create(organization=org)
        return branding

    def list(self, request):
        branding = self.get_object(request)
        serializer = OrganizationBrandingSerializer(branding, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        branding = self.get_object(request)
        data = request.data.copy()
        if "logo" in request.FILES:
            branding.logo = request.FILES["logo"]
        branding.company_name = data.get("company_name", branding.company_name)
        branding.address = data.get("address", branding.address)
        branding.phone = data.get("phone", branding.phone)
        branding.email = data.get("email", branding.email)
        branding.save()
        serializer = OrganizationBrandingSerializer(branding, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
