from __future__ import annotations

from rest_framework import filters, viewsets, status, mixins, parsers
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import HttpResponse
import logging
from organizations.utils import get_current_org
from organizations.permissions import IsOrgMemberWithRole

from .models import InboundMessage, OutboundMessage, EmailJob, EmailAttachment
from .serializers import InboundMessageSerializer, OutboundMessageSerializer, EmailJobSerializer, EmailJobCreateSerializer
from .serializers_extra import EmailAttachmentSerializer
from .tasks import process_email_job
from .models import Suppression
from .serializers import EmailRecipientSerializer
from organizations.utils import get_current_org
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


class EmailAttachmentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = EmailAttachment.objects.all()
    serializer_class = EmailAttachmentSerializer
    permission_classes = [IsOrgMemberWithRole]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org)

    @action(detail=True, methods=["post"])
    def retry_failed(self, request, pk=None):
        job = self.get_object()
        job.recipients.filter(status="failed").update(status="queued", error="")
        job.status = EmailJob.STATUS_QUEUED
        job.failed_count = 0
        job.save(update_fields=["status", "failed_count", "updated_at"])
        process_email_job.delay(job.id)
        return Response({"status": "requeued"})


@api_view(["GET"])
def unsubscribe(request):
    token = request.GET.get("token")
    if not token:
        return HttpResponse("<h3>Missing token</h3>", status=400)
    signer = TimestampSigner()
    try:
        raw = signer.unsign(token, max_age=60 * 60 * 24 * 7)  # 7 days
        org_id_str, email = raw.split("|", 1)
        org_id = int(org_id_str)
    except (BadSignature, SignatureExpired, ValueError):
        html = """
        <html><body style='font-family:Arial;padding:24px;'>
        <h2 style='color:#b91c1c;'>Invalid or expired link</h2>
        <p>This unsubscribe link is invalid or has expired. Please request a new unsubscribe link.</p>
        </body></html>
        """
        return HttpResponse(html, status=400)

    from contacts.models import Contact

    try:
        contact = Contact.objects.get(organization_id=org_id, email=email)
        contact.status = Contact.STATUS_UNSUBSCRIBED
        contact.save(update_fields=["status", "updated_at"])
    except Contact.DoesNotExist:
        contact = None

    Suppression.objects.get_or_create(organization_id=org_id, channel="email", identifier=email)

    html = f"""
    <html><body style='font-family:Arial;padding:24px;'>
    <h2 style='color:#15803d;'>Unsubscribed</h2>
    <p>{email} has been unsubscribed from future emails.</p>
    </body></html>
    """
    return HttpResponse(html)
