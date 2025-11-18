from __future__ import annotations

from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Contact
from .serializers import ContactSerializer, IdentityConflictSerializer


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["full_name", "email", "phone_whatsapp", "telegram_chat_id", "instagram_scoped_id", "tags"]

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
