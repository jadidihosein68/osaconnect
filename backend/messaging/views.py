from __future__ import annotations

from rest_framework import filters, viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
import logging
from organizations.utils import get_current_org
from organizations.permissions import IsOrgMemberWithRole

from .models import InboundMessage, OutboundMessage, EmailJob
from .serializers import InboundMessageSerializer, OutboundMessageSerializer, EmailJobSerializer, EmailJobCreateSerializer
from .tasks import process_email_job
audit_logger = logging.getLogger("corbi.audit")


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
        audit_logger.info(
            "inbound.reply",
            extra={"inbound_id": inbound.id, "outbound_id": outbound.id, "org": inbound.organization_id, "user": getattr(request.user, "username", "anon")},
        )
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
        audit_logger.info(
            "inbound.link_contact",
            extra={"inbound_id": inbound.id, "contact_id": contact.id, "org": inbound.organization_id, "user": getattr(request.user, "username", "anon")},
        )
        return Response(InboundMessageSerializer(inbound).data)


class EmailJobViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = EmailJob.objects.all()
    serializer_class = EmailJobSerializer
    permission_classes = [IsOrgMemberWithRole]
    filter_backends = [filters.OrderingFilter]
    ordering = ["-created_at"]

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org).prefetch_related("recipients")

    def create(self, request, *args, **kwargs):
        serializer = EmailJobCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        process_email_job.delay(job.id)
        return Response(EmailJobSerializer(job).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def retry_failed(self, request, pk=None):
        job = self.get_object()
        job.recipients.filter(status="failed").update(status="queued", error="")
        job.status = EmailJob.STATUS_QUEUED
        job.failed_count = 0
        job.save(update_fields=["status", "failed_count", "updated_at"])
        process_email_job.delay(job.id)
        return Response({"status": "requeued"})
