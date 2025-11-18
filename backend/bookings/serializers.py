from __future__ import annotations

from rest_framework import serializers

from contacts.models import Contact
from contacts.serializers import ContactSerializer
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(source="contact", queryset=Contact.objects.all(), write_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "contact",
            "contact_id",
            "title",
            "title",
            "start_time",
            "end_time",
            "status",
            "location",
            "notes",
            "external_calendar_id",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "contact"]

    def validate(self, attrs):
        if attrs["end_time"] <= attrs["start_time"]:
            raise serializers.ValidationError("End time must be after start time.")
        return attrs

    def create(self, validated_data):
        contact = validated_data["contact"]
        validated_data["organization"] = contact.organization
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("contact", None)  # contact/org immutable here
        return super().update(instance, validated_data)
