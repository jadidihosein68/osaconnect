from __future__ import annotations

from rest_framework import serializers

from contacts.models import Contact, ContactGroup
from integrations.models import Integration
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
    contact_id = serializers.PrimaryKeyRelatedField(
        source="contact", queryset=Contact.objects.all(), write_only=True, required=False, allow_null=True
    )
    resource = ResourceSerializer(read_only=True)
    resource_id = serializers.PrimaryKeyRelatedField(
        source="resource", queryset=Resource.objects.all(), allow_null=True, required=False, write_only=True
    )
    created_by_user = serializers.StringRelatedField(read_only=True)
    contact_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    group_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    attendee_emails = serializers.ListField(child=serializers.EmailField(), required=False, write_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "contact",
            "contact_id",
            "contact_ids",
            "group_ids",
            "attendee_emails",
            "resource",
            "resource_id",
            "meeting_type",
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
            "status",
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
        meeting_type = attrs.get("meeting_type") or Booking.TYPE_CUSTOM
        organizer_email = attrs.get("organizer_email", "") or ""
        resource = attrs.get("resource")
        request = self.context.get("request")
        org = get_current_org(request)
        integ = Integration.objects.filter(organization=org, provider="google_calendar").first() if org else None
        stored_org_email = None
        if integ:
            stored = (integ.extra or {}).get("organizer_email")
            if isinstance(stored, list):
                stored_org_email = [s.lower() for s in stored if isinstance(s, str)]
            elif isinstance(stored, str):
                stored_org_email = [stored.lower()]
        if meeting_type == Booking.TYPE_CUSTOM:
            attrs["resource"] = None
            if not organizer_email and stored_org_email:
                organizer_email = stored_org_email[0]
                attrs["organizer_email"] = organizer_email
            if not organizer_email:
                raise serializers.ValidationError({"organizer_email": "Organizer email is required for custom meetings."})
            if stored_org_email and organizer_email.lower() not in stored_org_email:
                raise serializers.ValidationError({"organizer_email": "Organizer must match the configured calendar organizer."})
        else:
            if not resource:
                raise serializers.ValidationError({"resource": "Resource is required for room/device bookings."})
            if not organizer_email:
                attrs["organizer_email"] = resource.gcal_calendar_id or ""
            if not attrs.get("location"):
                attrs["location"] = resource.description or resource.name
        return attrs

    def create(self, validated_data):
        contact_ids = validated_data.pop("contact_ids", [])
        group_ids = validated_data.pop("group_ids", [])
        attendee_emails = validated_data.pop("attendee_emails", [])
        contact = validated_data.pop("contact", None)
        resource = validated_data.get("resource")
        request = self.context.get("request")
        org = get_current_org(request)
        if not org:
            raise serializers.ValidationError("Organization is required.")
        validated_data["organization"] = org
        if contact and contact.organization_id != org.id:
            raise serializers.ValidationError("Contact does not belong to this organization.")
        if resource and resource.organization_id != org.id:
            raise serializers.ValidationError("Resource does not belong to this organization.")
        if validated_data.get("meeting_type") == Booking.TYPE_CUSTOM and not validated_data.get("organizer_email"):
            integ = Integration.objects.filter(organization=org, provider="google_calendar").first()
            stored_org_email = (integ.extra or {}).get("organizer_email") if integ else None
            if stored_org_email:
                validated_data["organizer_email"] = stored_org_email
        attendee_list = [{"email": email} for email in attendee_emails]
        if contact_ids:
            contacts = Contact.objects.filter(id__in=contact_ids, organization_id=org.id)
            attendee_list.extend([{"email": c.email} for c in contacts if c.email])
        if group_ids:
            groups = ContactGroup.objects.filter(id__in=group_ids, organization_id=org.id)
            group_contacts = Contact.objects.filter(groups__in=groups).distinct()
            attendee_list.extend([{"email": c.email} for c in group_contacts if c.email])
        seen = set()
        deduped = []
        for a in attendee_list:
            email = a.get("email")
            if email and email not in seen:
                seen.add(email)
                deduped.append(a)
        validated_data["attendees"] = deduped
        validated_data["contact"] = contact
        if not validated_data.get("status"):
            validated_data["status"] = Booking.STATUS_PENDING
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user.username
            validated_data["created_by_user"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("contact", None)
        validated_data.pop("contact_ids", None)
        validated_data.pop("group_ids", None)
        attendee_emails = validated_data.pop("attendee_emails", None)
        if attendee_emails is not None:
            org = get_current_org(self.context.get("request"))
            attendee_list = [{"email": email} for email in attendee_emails]
            contact_ids = self.initial_data.get("contact_ids") or []
            group_ids = self.initial_data.get("group_ids") or []
            if contact_ids:
                contacts = Contact.objects.filter(id__in=contact_ids, organization_id=org.id)
                attendee_list.extend([{"email": c.email} for c in contacts if c.email])
            if group_ids:
                groups = ContactGroup.objects.filter(id__in=group_ids, organization_id=org.id)
                group_contacts = Contact.objects.filter(groups__in=groups).distinct()
                attendee_list.extend([{"email": c.email} for c in group_contacts if c.email])
            seen = set()
            deduped = []
            for a in attendee_list:
                email = a.get("email")
                if email and email not in seen:
                    seen.add(email)
                    deduped.append(a)
            validated_data["attendees"] = deduped
        return super().update(instance, validated_data)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request:
            org = get_current_org(request)
            if org:
                self.fields["resource_id"].queryset = self.fields["resource_id"].queryset.filter(organization=org)
