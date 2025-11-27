from __future__ import annotations

from rest_framework import serializers

from .models import Membership, Organization, OrganizationBranding


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "domain", "created_at", "updated_at"]


class MembershipSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    user = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ["id", "organization", "role", "created_at", "user"]

    def get_user(self, obj):
        user = obj.user
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
        }


class OrganizationBrandingSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationBranding
        fields = ["company_name", "address", "phone", "email", "logo_url"]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and hasattr(obj.logo, "url"):
            url = obj.logo.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None
