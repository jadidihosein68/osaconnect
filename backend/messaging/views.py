from __future__ import annotations

from rest_framework import filters, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from organizations.utils import get_current_org
from organizations.permissions import IsOrgMemberWithRole

from .models import InboundMessage, OutboundMessage
from .serializers import InboundMessageSerializer, OutboundMessageSerializer


class OutboundMessageViewSet(viewsets.ModelViewSet):
    queryset = OutboundMessage.objects.select_related("contact", "template").all()
    serializer_class = OutboundMessageSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "status"]
    permission_classes = [IsOrgMemberWithRole]

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org)


class InboundMessageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InboundMessage.objects.select_related("contact").all()
    serializer_class = InboundMessageSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["received_at"]
    permission_classes = [IsOrgMemberWithRole]

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org)

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        inbound = self.get_object()
        contact = inbound.contact
        if not contact:
            return Response({"detail": "No contact linked to inbound message."}, status=status.HTTP_400_BAD_REQUEST)
        body = request.data.get("body")
        channel = request.data.get("channel") or inbound.channel
        if not body:
            return Response({"detail": "Body is required."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = OutboundMessageSerializer(
            data={"contact_id": contact.id, "channel": channel, "body": body},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        outbound = serializer.save()
        return Response(OutboundMessageSerializer(outbound).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def link_contact(self, request, pk=None):
        inbound = self.get_object()
        contact_id = request.data.get("contact_id")
        if not contact_id:
            return Response({"detail": "contact_id required"}, status=status.HTTP_400_BAD_REQUEST)
        from contacts.models import Contact

        try:
            contact = Contact.objects.get(pk=contact_id, organization=inbound.organization)
        except Contact.DoesNotExist:
            return Response({"detail": "Contact not found in organization"}, status=status.HTTP_404_NOT_FOUND)
        inbound.contact = contact
        inbound.save(update_fields=["contact", "updated_at"])
        return Response(InboundMessageSerializer(inbound).data)
