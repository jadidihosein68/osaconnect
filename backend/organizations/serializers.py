from __future__ import annotations

from rest_framework import serializers

from .models import Membership, Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "domain", "created_at", "updated_at"]


class MembershipSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "organization", "role", "created_at"]
