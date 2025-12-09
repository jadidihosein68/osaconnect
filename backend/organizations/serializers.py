from __future__ import annotations

from rest_framework import serializers

from .models import ApiKey, Membership, Organization, OrganizationBranding, UserProfile


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


class UserProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(required=False, allow_blank=True)
    avatar_url = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ["phone", "display_name", "avatar_url", "role", "email", "username"]
        read_only_fields = ["avatar_url", "role", "email", "username"]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            url = obj.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_role(self, obj):
        user = obj.user
        request = self.context.get("request")
        from organizations.utils import get_current_org

        try:
            org = get_current_org(request)
            membership = user.memberships.filter(organization=org).first()
            return membership.role if membership else None
        except Exception:
            membership = user.memberships.first()
            return membership.role if membership else None

    def get_email(self, obj):
        return obj.user.email

    def get_username(self, obj):
        return obj.user.username


class ApiKeySerializer(serializers.ModelSerializer):
    masked_key = serializers.SerializerMethodField()
    plain_key = serializers.CharField(read_only=True, required=False, allow_blank=True)

    class Meta:
        model = ApiKey
        fields = [
            "id",
            "name",
            "masked_key",
            "plain_key",
            "status",
            "scopes",
            "created_at",
            "revoked_at",
        ]
        read_only_fields = ["masked_key", "status", "created_at", "revoked_at"]

    def get_masked_key(self, obj: ApiKey):
        return obj.masked_key()
