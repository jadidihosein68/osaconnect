from __future__ import annotations

from rest_framework import serializers

from contacts.models import Contact
from contacts.serializers import ContactSerializer
from organizations.utils import get_current_org
from .models import Booking, Resource


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = [
            "id",
            "name",
            "resource_type",
            "capacity",
            "description",
            "gcal_calendar_id",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class BookingSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(source="contact", queryset=Contact.objects.all(), write_only=True)
    resource = ResourceSerializer(read_only=True)
    resource_id = serializers.PrimaryKeyRelatedField(source="resource", queryset=Resource.objects.all(), allow_null=True, required=False, write_only=True)
    created_by_user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "contact",
            "contact_id",
            "resource",
            "resource_id",
            "title",
            "start_time",
            "end_time",
            "status",
            "location",
            "notes",
            "external_calendar_id",
            "gcal_event_id",
            "gcal_calendar_id",
            "gcal_ical_uid",
            "gcal_etag",
            "gcal_sequence",
            "timezone",
            "organizer_email",
            "attendees",
            "recurrence",
            "hangout_link",
            "created_by",
            "created_by_user",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "contact",
            "resource",
            "created_by_user",
            "created_by",
            "external_calendar_id",
            "gcal_event_id",
            "gcal_calendar_id",
            "gcal_ical_uid",
            "gcal_etag",
            "gcal_sequence",
            "hangout_link",
        ]

    def validate(self, attrs):
        if attrs["end_time"] <= attrs["start_time"]:
            raise serializers.ValidationError("End time must be after start time.")
        return attrs

    def create(self, validated_data):
        contact = validated_data["contact"]
        validated_data["organization"] = contact.organization
        resource = validated_data.get("resource")
        if resource and resource.organization_id != contact.organization_id:
            raise serializers.ValidationError("Resource does not belong to this organization.")
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user.username
            validated_data["created_by_user"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("contact", None)  # contact/org immutable here
        return super().update(instance, validated_data)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request:
            org = get_current_org(request)
            if org:
                self.fields["resource_id"].queryset = self.fields["resource_id"].queryset.filter(organization=org)
