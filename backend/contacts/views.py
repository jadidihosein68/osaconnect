from __future__ import annotations

from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models

from .models import Contact, ContactGroup
from .serializers import ContactSerializer, IdentityConflictSerializer, ContactGroupSerializer
from organizations.utils import get_current_org
from organizations.permissions import IsOrgMemberWithRole


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [IsOrgMemberWithRole]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["full_name", "email", "phone_whatsapp", "telegram_chat_id", "instagram_scoped_id", "tags"]
    filterset_fields = ["status", "groups"]

    @action(detail=True, methods=["post"])
    def mark_inbound(self, request, pk=None):
        contact = self.get_object()
        payload = request.data
        conflicts = []
        for field in ["email", "phone_whatsapp", "telegram_chat_id", "instagram_scoped_id"]:
            value = payload.get(field)
            if value and getattr(contact, field) not in (None, "", value):
                conflicts.append({"field": field, "attempted_value": value})
        if conflicts:
            serializer = IdentityConflictSerializer(data=[{**c, "contact": contact.id} for c in conflicts], many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(contact=contact)
            return Response({"status": "conflict", "conflicts": serializer.data}, status=409)
        contact.mark_inbound(payload)
        return Response(ContactSerializer(contact).data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["action"] = getattr(self, "action", None)
        return context

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org).prefetch_related("groups")

    def perform_create(self, serializer):
        org = get_current_org(self.request)
        serializer.save(organization=org)


class ContactGroupViewSet(viewsets.ModelViewSet):
    queryset = ContactGroup.objects.all()
    serializer_class = ContactGroupSerializer
    permission_classes = [IsOrgMemberWithRole]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]

    def get_queryset(self):
        org = get_current_org(self.request)
        return ContactGroup.objects.filter(organization=org).annotate(contacts_count=models.Count("contacts"))

    def perform_create(self, serializer):
        serializer.save()
