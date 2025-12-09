from __future__ import annotations

import hashlib
import secrets
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema

from .models import ApiKey, Membership, OrganizationBranding, UserProfile
from .serializers import ApiKeySerializer, MembershipSerializer, OrganizationBrandingSerializer, UserProfileSerializer
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


class ProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return profile

    def list(self, request):
        profile = self.get_object(request)
        serializer = UserProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        profile = self.get_object(request)
        data = request.data
        if "avatar" in request.FILES:
            profile.avatar = request.FILES["avatar"]
        if "display_name" in data:
            profile.display_name = data.get("display_name") or ""
        if "phone" in data:
            profile.phone = data.get("phone") or ""
        profile.save()
        serializer = UserProfileSerializer(profile, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApiKeyViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    schema_tags = ["Developers"]

    def _require_admin(self, request, org):
        if not Membership.objects.filter(user=request.user, organization=org, role=Membership.ROLE_ADMIN).exists():
            raise PermissionDenied("Admin role required")

    def _get_queryset(self, request):
        org = get_current_org(request)
        self._require_admin(request, org)
        return ApiKey.objects.filter(organization=org, user=request.user)

    def _generate_key(self):
        raw_key = f"sk_live_{secrets.token_urlsafe(32)}"
        prefix = raw_key[:12]
        hashed = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        return raw_key, prefix, hashed

    @extend_schema(responses=ApiKeySerializer)
    def list(self, request):
        qs = self._get_queryset(request)
        serializer = ApiKeySerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(request=ApiKeySerializer, responses=ApiKeySerializer)
    def create(self, request):
        org = get_current_org(request)
        self._require_admin(request, org)
        name = (request.data.get("name") or "").strip()
        scopes = request.data.get("scopes") or []
        if not name:
            return Response({"detail": "Name is required"}, status=status.HTTP_400_BAD_REQUEST)
        if ApiKey.objects.filter(organization=org, name=name).exists():
            return Response({"detail": "Name already exists"}, status=status.HTTP_400_BAD_REQUEST)
        raw_key, prefix, hashed = self._generate_key()
        while ApiKey.objects.filter(key_hashed=hashed).exists():
            raw_key, prefix, hashed = self._generate_key()
        api_key = ApiKey.objects.create(
            organization=org,
            user=request.user,
            name=name,
            key_hashed=hashed,
            prefix=prefix,
            scopes=scopes if isinstance(scopes, list) else [],
        )
        serializer = ApiKeySerializer(api_key)
        data = serializer.data
        data["plain_key"] = raw_key
        return Response(data, status=status.HTTP_201_CREATED)

    def _get_object(self, request, pk):
        qs = self._get_queryset(request)
        try:
            return qs.get(pk=pk)
        except ApiKey.DoesNotExist as exc:
            raise PermissionDenied("API key not found for this organization/user") from exc

    @extend_schema(responses=ApiKeySerializer)
    @action(detail=True, methods=["post"], url_path="revoke")
    def revoke(self, request, pk=None):
        api_key = self._get_object(request, pk)
        api_key.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses=ApiKeySerializer)
    @action(detail=True, methods=["post"], url_path="regenerate")
    def regenerate(self, request, pk=None):
        api_key = self._get_object(request, pk)
        raw_key, prefix, hashed = self._generate_key()
        while ApiKey.objects.filter(key_hashed=hashed).exists():
            raw_key, prefix, hashed = self._generate_key()
        api_key.key_hashed = hashed
        api_key.prefix = prefix
        api_key.status = ApiKey.STATUS_ACTIVE
        api_key.revoked_at = None
        api_key.save(update_fields=["key_hashed", "prefix", "status", "revoked_at"])
        serializer = ApiKeySerializer(api_key)
        data = serializer.data
        data["plain_key"] = raw_key
        return Response(data)
