from __future__ import annotations

from django.db import IntegrityError, transaction
from rest_framework import serializers

from organizations.utils import get_current_org
from .models import Contact, IdentityConflict, ContactGroup
from messaging.models import ContactEngagement


class ContactGroupSerializer(serializers.ModelSerializer):
    contacts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ContactGroup
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "color",
            "created_at",
            "updated_at",
            "created_by",
            "contacts_count",
        ]
        read_only_fields = ["organization", "created_at", "updated_at", "created_by", "contacts_count"]

    def validate_name(self, value):
        request = self.context.get("request")
        org = get_current_org(request)
        qs = ContactGroup.objects.filter(organization=org, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A group with this name already exists in your organization.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        org = get_current_org(request)
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        validated_data["organization"] = org
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("organization", None)
        validated_data.pop("created_by", None)
        return super().update(instance, validated_data)


class ContactSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(
        many=True, queryset=ContactGroup.objects.all(), required=False, allow_empty=True
    )
    class Meta:
        model = Contact
        fields = [
            "id",
            "organization",
            "full_name",
            "phone_whatsapp",
            "email",
            "telegram_chat_id",
            "instagram_scoped_id",
            "status",
            "segments",
            "tags",
            "notes",
            "metadata",
            "last_inbound_at",
            "last_outbound_at",
            "created_at",
            "updated_at",
            "groups",
        ]
        read_only_fields = ["organization", "last_inbound_at", "last_outbound_at", "created_at", "updated_at"]

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", Contact.STATUS_ACTIVE))
        if status != Contact.STATUS_ACTIVE and self.context.get("action") == "send_outbound":
            raise serializers.ValidationError("Outbound messaging is only allowed for active contacts.")

        for field in ["phone_whatsapp", "telegram_chat_id", "instagram_scoped_id", "email"]:
            if field in attrs and not attrs.get(field):
                attrs[field] = None

        # Ensure groups are within org
        if "groups" in attrs:
            request = self.context.get("request")
            org = get_current_org(request)
            for g in attrs["groups"]:
                if g.organization_id != org.id:
                    raise serializers.ValidationError({"groups": "Group organization mismatch."})

        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                groups = validated_data.pop("groups", [])
                contact = Contact.objects.create(**validated_data)
                if groups:
                    contact.groups.set(groups)
                return contact
        except IntegrityError as exc:
            raise serializers.ValidationError("Contact identifiers must be unique and non-conflicting.") from exc

    def update(self, instance, validated_data):
        groups = validated_data.pop("groups", None)
        contact = super().update(instance, validated_data)
        if groups is not None:
            contact.groups.set(groups)
        return contact


class IdentityConflictSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentityConflict
        fields = ["id", "contact", "field", "attempted_value", "created_at"]
        read_only_fields = fields


class ContactEngagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEngagement
        fields = ["id", "channel", "subject", "status", "error", "created_at"]
        read_only_fields = fields
