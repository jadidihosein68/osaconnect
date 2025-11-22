from __future__ import annotations

from rest_framework import filters, viewsets, status, mixins, parsers
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import HttpResponse
import logging
import os
import json
from organizations.utils import get_current_org
from organizations.permissions import IsOrgMemberWithRole

from .models import InboundMessage, OutboundMessage, EmailJob, EmailAttachment, EmailRecipient, TelegramInviteToken, TelegramMessage, WhatsAppMessage, InstagramMessage, Campaign, CampaignRecipient
from .serializers import InboundMessageSerializer, OutboundMessageSerializer, EmailJobSerializer, EmailJobCreateSerializer, EmailRecipientSerializer, TelegramInviteTokenSerializer, TelegramMessageSerializer, WhatsAppMessageSerializer, InstagramMessageSerializer, CampaignSerializer
from .serializers_extra import EmailAttachmentSerializer
from .tasks import process_email_job
from .models import Suppression
from django.utils import timezone
import secrets
from messaging.channels import EmailSender, TelegramSender, WhatsAppSender
from messaging.utils import build_media_url_from_request
from contacts.models import Contact, ContactGroup
from templates_app.models import MessageTemplate
from django.conf import settings
from contacts.serializers import ContactSerializer
from integrations.models import Integration
from integrations.utils import decrypt_token
audit_logger = logging.getLogger("corbi.audit")
logger = logging.getLogger(__name__)


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
        job.recipients.filter(status=EmailRecipient.STATUS_FAILED).update(status=EmailRecipient.STATUS_QUEUED, error="")
        job.status = EmailJob.STATUS_QUEUED
        job.failed_count = 0
        job.save(update_fields=["status", "failed_count", "updated_at"])
        process_email_job.delay(job.id)
        return Response({"status": "requeued"})


class EmailAttachmentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = EmailAttachment.objects.all()
    serializer_class = EmailAttachmentSerializer
    permission_classes = [IsOrgMemberWithRole]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        org = get_current_org(self.request)
        return super().get_queryset().filter(organization=org)


@api_view(["GET"])
def unsubscribe(request):
    token = request.GET.get("token")
    if not token:
        return HttpResponse("<h3>Missing token</h3>", status=400)
    signer = TimestampSigner()
    try:
        raw = signer.unsign(token, max_age=60 * 60 * 24 * 7)  # 7 days
        parts = raw.split("|")
        if len(parts) == 4:
            org_id_str, email, job_id, recipient_id = parts
        elif len(parts) == 2:
            org_id_str, email = parts
            job_id = recipient_id = ""
        else:
            raise ValueError("bad token payload")
        org_id = int(org_id_str)
    except (BadSignature, SignatureExpired, ValueError):
        html = """
        <html><body style='font-family:Arial;padding:24px;'>
        <h2 style='color:#b91c1c;'>Invalid or expired link</h2>
        <p>This unsubscribe link is invalid or has expired. Please request a new unsubscribe link.</p>
        <a href="/" style="display:inline-block;margin-top:12px;color:#2563eb;">Return to site</a>
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
    <div style='max-width:480px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;padding:24px;box-shadow:0 8px 20px rgba(0,0,0,0.04);'>
    <h2 style='color:#15803d;margin-bottom:12px;'>Unsubscribed</h2>
    <p style='color:#111827;margin-bottom:16px;'>{email} has been unsubscribed from future emails.</p>
    <a href="/" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;">Return to site</a>
    </div>
    </body></html>
    """
    return HttpResponse(html)


class TelegramOnboardingViewSet(viewsets.ViewSet):
    permission_classes = [IsOrgMemberWithRole]

    def list(self, request):
        org = get_current_org(request)
        contacts = Contact.objects.filter(organization=org).order_by("full_name")
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def invite_link(self, request, pk=None):
        org = get_current_org(request)
        contact = Contact.objects.filter(pk=pk, organization=org).first()
        if not contact:
            return Response({"detail": "Contact not found"}, status=404)
        token = self._get_or_create_token(org.id, contact.id)
        bot_name = self._bot_username(org)
        deep_link = f"https://t.me/{bot_name}?start={token.verification_token}"
        return Response({"link": deep_link})

    @action(detail=True, methods=["post"])
    def invite_email(self, request, pk=None):
        org = get_current_org(request)
        contact = Contact.objects.filter(pk=pk, organization=org).first()
        if not contact:
            return Response({"detail": "Contact not found"}, status=404)
        if not contact.email:
            return Response({"detail": "Contact missing email"}, status=400)
        token = self._get_or_create_token(org.id, contact.id)
        bot_name = self._bot_username(org)
        deep_link = f"https://t.me/{bot_name}?start={token.verification_token}"
        sender = EmailSender()
        subject = f"Connect with {org.name} on Telegram"
        body = (
            f"<p>Hi {contact.full_name or 'there'},</p>"
            f"<p>You can now receive updates from {org.name} via Telegram.</p>"
            f"<p><a href='{deep_link}' style='padding:10px 14px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;'>Connect on Telegram</a></p>"
        )
        try:
            integration = Integration.objects.get(organization=org, provider="sendgrid", is_active=True)
            token_plain = decrypt_token(getattr(integration, "token", "") or getattr(integration, "token_encrypted", "") or "")
            from_email = (integration.extra or {}).get("from_email") or getattr(settings, "SENDGRID_FROM_EMAIL", "no-reply@example.com")
            if not token_plain or not from_email:
                raise ValueError("SendGrid integration missing token or from_email")
            credentials = {"token": token_plain, "extra": {"from_email": from_email, "subject": subject}}
        except Integration.DoesNotExist:
            return Response({"detail": "SendGrid integration not configured for this organization"}, status=400)
        except Exception as exc:
            return Response({"detail": f"SendGrid integration invalid: {exc}"}, status=400)

        result = sender.send(to=contact.email, body=body, credentials=credentials)
        if not result.success:
            return Response({"detail": f"SendGrid send failed: {result.error or 'unknown error'}"}, status=502)

        contact.telegram_status = Contact.TELEGRAM_STATUS_INVITED
        contact.telegram_invited = True
        contact.telegram_last_invite_at = timezone.now()
        contact.save(update_fields=["telegram_status", "telegram_invited", "telegram_last_invite_at", "updated_at"])
        return Response({"status": "invite_sent", "link": deep_link})

    def _bot_username(self, org):
        try:
            integ = Integration.objects.get(organization=org, provider="telegram", is_active=True)
            bot_username = (integ.extra or {}).get("bot_username") or ""
            if bot_username.startswith("@"):
                bot_username = bot_username[1:]
            if bot_username:
                return bot_username
        except Integration.DoesNotExist:
            pass
        # fallback to org.domain prefix
        return (org.domain or "corbi_bot").split(".")[0]

    def _get_or_create_token(self, org_id: int, contact_id: int) -> TelegramInviteToken:
        now = timezone.now()
        existing = TelegramInviteToken.objects.filter(
            organization_id=org_id,
            contact_id=contact_id,
            status=TelegramInviteToken.STATUS_PENDING,
            expires_at__gt=now,
        ).first()
        if existing:
            return existing
        token_val = secrets.token_urlsafe(24)
        return TelegramInviteToken.objects.create(
            organization_id=org_id,
            contact_id=contact_id,
            verification_token=token_val,
            expires_at=now + timezone.timedelta(days=7),
            status=TelegramInviteToken.STATUS_PENDING,
        )


class TelegramOnboardWebhook(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        payload = request.data or {}
        message = payload.get("message") or {}
        text = message.get("text") or ""
        chat = message.get("chat") or {}
        chat_id = chat.get("id")
        if not text or not chat_id:
            return Response({"status": "ignored"}, status=400)
        if not text.startswith("/start"):
            # Treat as inbound message
            contact = Contact.objects.filter(telegram_chat_id=str(chat_id)).select_related("organization").first()
            if contact:
                TelegramMessage.objects.create(
                    organization=contact.organization,
                    contact=contact,
                    chat_id=str(chat_id),
                    direction=TelegramMessage.DIR_INBOUND,
                    message_type=TelegramMessage.TYPE_TEXT,
                    text=text,
                    attachments=[],
                    status="received",
                )
            return Response({"status": "received"}, status=202)
        parts = text.split(" ", 1)
        if len(parts) < 2:
            return Response({"status": "ignored"}, status=202)
        token_val = parts[1].strip()
        now = timezone.now()
        try:
            token = TelegramInviteToken.objects.select_related("contact", "organization").get(
                verification_token=token_val, status=TelegramInviteToken.STATUS_PENDING, expires_at__gt=now
            )
        except TelegramInviteToken.DoesNotExist:
            return Response({"status": "invalid_token"}, status=400)

        contact = token.contact
        contact.telegram_chat_id = str(chat_id)
        contact.telegram_status = Contact.TELEGRAM_STATUS_ONBOARDED
        contact.telegram_linked = True
        contact.telegram_onboarded_at = now
        contact.save(update_fields=["telegram_chat_id", "telegram_status", "telegram_linked", "telegram_onboarded_at", "updated_at"])

        token.status = TelegramInviteToken.STATUS_USED
        token.used_at = now
        token.save(update_fields=["status", "used_at", "updated_at"])

        return Response({"status": "ok"})


class TelegramMessageViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsOrgMemberWithRole]
    serializer_class = TelegramMessageSerializer

    def get_queryset(self):
        org = get_current_org(self.request)
        qs = TelegramMessage.objects.filter(organization=org).select_related("contact")
        contact_id = self.request.query_params.get("contact_id")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)
        return qs.order_by("created_at")

    def create(self, request, *args, **kwargs):
        org = get_current_org(request)
        contact_id = request.data.get("contact_id")
        text = (request.data.get("text") or "").strip()
        attachment_id = request.data.get("attachment_id")
        attachment_ids = request.data.get("attachment_ids") or []
        if attachment_id and not attachment_ids:
            attachment_ids = [attachment_id]
        if not contact_id:
            return Response({"detail": "contact_id required"}, status=400)
        if not text and not attachment_ids:
            return Response({"detail": "Message text or attachment required"}, status=400)
        try:
            contact = Contact.objects.get(pk=contact_id, organization=org)
        except Contact.DoesNotExist:
            return Response({"detail": "Contact not found"}, status=404)
        if contact.telegram_status != Contact.TELEGRAM_STATUS_ONBOARDED or not contact.telegram_chat_id:
            return Response({"detail": "Contact is not onboarded to Telegram"}, status=400)

        attachments_payload = []
        attachments_objs: list[EmailAttachment] = []
        if attachment_ids:
            if isinstance(attachment_ids, str):
                try:
                    attachment_ids = [int(attachment_ids)]
                except Exception:
                    attachment_ids = []
            for att_id in attachment_ids:
                try:
                    attachment = EmailAttachment.objects.get(id=att_id, organization=org)
                except EmailAttachment.DoesNotExist:
                    return Response({"detail": f"Attachment {att_id} not found"}, status=404)
                if attachment.size > 20 * 1024 * 1024:
                    return Response({"detail": f"Attachment {attachment.filename} too large for Telegram (max ~20MB)"}, status=400)
                if not attachment.file:
                    return Response({"detail": f"Attachment file missing for {attachment.filename}"}, status=400)
                attachments_objs.append(attachment)
                attachments_payload.append(
                    {
                        "id": attachment.id,
                        "name": attachment.filename,
                        "content_type": attachment.content_type,
                        "size": attachment.size,
                        "url": build_media_url_from_request(attachment.file, request),
                    }
                )

        # send via Telegram
        try:
            integ = Integration.objects.get(organization=org, provider="telegram", is_active=True)
            token_plain = decrypt_token(getattr(integ, "token", "") or getattr(integ, "token_encrypted", "") or "")
            if not token_plain:
                return Response({"detail": "Telegram integration token missing"}, status=400)
            sender = TelegramSender()
            created_messages = []

            def _send_and_record(media_path=None, media_kind=None, text_value=text, attach_payload=None):
                result = sender.send(
                    to=contact.telegram_chat_id,
                    body=text_value,
                    media_path=media_path,
                    media_type=media_kind,
                    credentials={"token": token_plain},
                    caption=text_value if media_path else None,
                )
                status_label = "sent" if result.success else "failed"
                tg_message_id = result.provider_message_id or ""
                msg = TelegramMessage.objects.create(
                    organization=org,
                    contact=contact,
                    chat_id=contact.telegram_chat_id,
                    direction=TelegramMessage.DIR_OUTBOUND,
                    message_type=TelegramMessage.TYPE_TEXT if not media_kind else (TelegramMessage.TYPE_PHOTO if media_kind == "photo" else TelegramMessage.TYPE_DOCUMENT),
                    text=text_value if not media_path else (text_value or ""),
                    attachments=attach_payload or [],
                    telegram_message_id=tg_message_id,
                    status=status_label,
                )
                created_messages.append(msg)
                if not result.success:
                    logger.error(
                        "Telegram send failed: %s (org=%s contact=%s chat_id=%s attachment=%s)",
                        result.error or "unknown error",
                        org.id,
                        contact.id,
                        contact.telegram_chat_id,
                        media_path,
                    )
                return result

            if attachments_objs:
                # send each attachment as its own message; first attachment can carry caption text
                for idx, att in enumerate(attachments_objs):
                    mime = (att.content_type or "").lower()
                    media_kind = "photo" if mime.startswith("image/") else "document"
                    caption_text = text if idx == 0 else ""
                    _send_and_record(media_path=att.file.path, media_kind=media_kind, text_value=caption_text, attach_payload=[attachments_payload[idx]])
                if text and not attachments_objs:
                    _send_and_record()
            else:
                _send_and_record()

            if any(m.status == "failed" for m in created_messages):
                return Response(
                    {
                        "detail": "One or more Telegram messages failed to send.",
                        "messages": TelegramMessageSerializer(created_messages, many=True).data,
                    },
                    status=502,
                )
            return Response(TelegramMessageSerializer(created_messages, many=True).data, status=201)
        except Integration.DoesNotExist:
            return Response({"detail": "Telegram integration not configured"}, status=400)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Telegram send exception",
                exc_info=True,
                extra={"org": org.id, "contact": contact.id, "chat_id": contact.telegram_chat_id, "attachment": attachment_id},
            )
            return Response({"detail": f"Telegram send error: {exc}"}, status=500)

        msg = TelegramMessage.objects.create(
            organization=org,
            contact=contact,
            chat_id=contact.telegram_chat_id,
            direction=TelegramMessage.DIR_OUTBOUND,
            message_type=message_type,
            text=text,
            attachments=attachments_payload,
            telegram_message_id=tg_message_id,
            status=status_label,
        )
        return Response(TelegramMessageSerializer(msg).data, status=201)


class WhatsAppMessageViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsOrgMemberWithRole]
    serializer_class = WhatsAppMessageSerializer

    def get_queryset(self):
        org = get_current_org(self.request)
        qs = WhatsAppMessage.objects.filter(organization=org).select_related("contact")
        contact_id = self.request.query_params.get("contact_id")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)
        return qs.order_by("created_at")

    def create(self, request, *args, **kwargs):
        org = get_current_org(request)
        contact_id = request.data.get("contact_id")
        text = (request.data.get("text") or "").strip()
        attachment_ids = request.data.get("attachment_ids") or []
        if not contact_id:
            return Response({"detail": "contact_id required"}, status=400)
        if not text and not attachment_ids:
            return Response({"detail": "Message text or attachment required"}, status=400)
        try:
            contact = Contact.objects.get(pk=contact_id, organization=org)
        except Contact.DoesNotExist:
            return Response({"detail": "Contact not found"}, status=404)
        if contact.whatsapp_blocked:
            return Response({"detail": "Contact is blocked on WhatsApp"}, status=400)
        if not contact.phone_whatsapp:
            return Response({"detail": "Contact missing WhatsApp phone number"}, status=400)

        attachments_payload = []
        media_urls = []
        if attachment_ids:
            if isinstance(attachment_ids, str):
                try:
                    attachment_ids = [int(attachment_ids)]
                except Exception:
                    attachment_ids = []
            for att_id in attachment_ids:
                try:
                    attachment = EmailAttachment.objects.get(id=att_id, organization=org)
                except EmailAttachment.DoesNotExist:
                    return Response({"detail": f"Attachment {att_id} not found"}, status=404)
                if not attachment.file:
                    return Response({"detail": f"Attachment file missing for {attachment.filename}"}, status=400)
                # Twilio requires a publicly accessible URL; assume MEDIA_URL is reachable.
                url = build_media_url_from_request(attachment.file, request)
                if url.startswith("http://localhost") or url.startswith("http://127.0.0.1"):
                    # Twilio cannot reach localhost; surface a clear error
                    return Response({"detail": "Attachment URL is not publicly accessible. Configure a public MEDIA_URL/host."}, status=400)
                attachments_payload.append(
                    {
                        "id": attachment.id,
                        "name": attachment.filename,
                        "content_type": attachment.content_type,
                        "size": attachment.size,
                        "url": url,
                    }
                )
                media_urls.append(url)

        try:
            integ = Integration.objects.get(organization=org, provider="whatsapp", is_active=True)
            token_plain = decrypt_token(getattr(integ, "token", "") or getattr(integ, "token_encrypted", "") or "")
            extra = getattr(integ, "extra", {}) if hasattr(integ, "extra") else {}
            account_sid = (
                extra.get("account_sid")
                or extra.get("twilio_account_sid")
                or extra.get("TWILIO_ACCOUNT_SID")
                or extra.get("accountSid")
            )
            from_whatsapp = (
                extra.get("from_whatsapp")
                or extra.get("twilio_whatsapp_from")
                or extra.get("TWILIO_WHATSAPP_FROM")
                or extra.get("fromWhatsApp")
            )
            if not token_plain or not account_sid or not from_whatsapp:
                return Response(
                    {"detail": "WhatsApp is not configured for this organization. Missing token/account_sid/from number."},
                    status=400,
                )
            sender = WhatsAppSender()
            msg_record = WhatsAppMessage.objects.create(
                organization=org,
                contact=contact,
                direction=WhatsAppMessage.DIR_OUTBOUND,
                message_type=WhatsAppMessage.TYPE_TEXT if not media_urls else WhatsAppMessage.TYPE_DOCUMENT,
                text=text,
                attachments=attachments_payload,
                status=WhatsAppMessage.STATUS_PENDING,
            )
            send_res = sender.send(
                to=contact.phone_whatsapp,
                body=text,
                media_urls=media_urls if media_urls else None,
                credentials={"token": token_plain, "extra": {"account_sid": account_sid, "from_whatsapp": from_whatsapp}},
            )
            if send_res.success:
                msg_record.status = WhatsAppMessage.STATUS_SENT
                msg_record.twilio_message_sid = send_res.provider_message_id or ""
                msg_record.save(update_fields=["status", "twilio_message_sid"])
                return Response(WhatsAppMessageSerializer(msg_record).data, status=201)
            msg_record.status = WhatsAppMessage.STATUS_FAILED
            msg_record.error_reason = send_res.error or "unknown error"
            msg_record.save(update_fields=["status", "error_reason"])
            return Response({"detail": f"WhatsApp send failed: {msg_record.error_reason}"}, status=502)
        except Integration.DoesNotExist:
            return Response({"detail": "WhatsApp is not configured for this organization."}, status=400)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "WhatsApp send exception",
                exc_info=True,
                extra={"org": org.id, "contact": contact.id, "phone": contact.phone_whatsapp},
            )
            return Response({"detail": f"WhatsApp send error: {exc}"}, status=500)


class TwilioWhatsAppWebhook(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        raw_from = (request.data.get("From") or "").strip()
        raw_to = (request.data.get("To") or "").strip()
        from_number = raw_from.replace("whatsapp:", "").strip()
        to_number = raw_to.replace("whatsapp:", "").strip()
        body = request.data.get("Body") or ""
        message_sid = request.data.get("MessageSid") or ""

        if not from_number or not to_number:
            return Response({"detail": "missing from/to"}, status=400)

        # Resolve org by matching integration from_whatsapp (normalize without whatsapp: prefix)
        from_candidates = [to_number, to_number.replace("whatsapp:", ""), raw_to]
        integ = (
            Integration.objects.filter(provider="whatsapp", is_active=True, extra__from_whatsapp__in=from_candidates).first()
            or Integration.objects.filter(provider="whatsapp", is_active=True, extra__twilio_whatsapp_from__in=from_candidates).first()
        )
        if not integ:
            logger.warning("Twilio WhatsApp webhook: integration not found for To=%s", to_number)
            return Response({"detail": "integration not found"}, status=200)
        org = integ.organization
        contact = Contact.objects.filter(organization=org, phone_whatsapp=from_number).first()
        if not contact:
            logger.warning("Twilio WhatsApp webhook: contact not found for from=%s org=%s", from_number, org.id)
            return Response({"detail": "contact not found"}, status=200)

        attachments = []
        num_media = int(request.data.get("NumMedia") or 0)
        message_type = WhatsAppMessage.TYPE_TEXT
        for idx in range(num_media):
            media_url = request.data.get(f"MediaUrl{idx}")
            content_type = request.data.get(f"MediaContentType{idx}")
            attachments.append({"url": media_url, "content_type": content_type})
            if content_type and content_type.startswith("image/"):
                message_type = WhatsAppMessage.TYPE_IMAGE
            else:
                message_type = WhatsAppMessage.TYPE_DOCUMENT

        WhatsAppMessage.objects.create(
            organization=org,
            contact=contact,
            direction=WhatsAppMessage.DIR_INBOUND,
            message_type=message_type,
            text=body,
            attachments=attachments,
            twilio_message_sid=message_sid,
            status=WhatsAppMessage.STATUS_RECEIVED,
        )
        return Response({"status": "ok"})


class TwilioWhatsAppStatusWebhook(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        """
        Twilio status callback for outbound WhatsApp messages.
        Expects MessageSid + MessageStatus from Twilio.
        """
        sid = request.data.get("MessageSid") or request.data.get("MessageSid".lower())
        status = (request.data.get("MessageStatus") or "").lower()
        error_code = request.data.get("ErrorCode") or request.data.get("ErrorCode".lower())
        error_message = request.data.get("ErrorMessage") or request.data.get("ErrorMessage".lower())

        if not sid:
            return Response({"detail": "missing MessageSid"}, status=400)

        status_map = {
            "sent": WhatsAppMessage.STATUS_SENT,
            "delivered": WhatsAppMessage.STATUS_DELIVERED,
            "failed": WhatsAppMessage.STATUS_FAILED,
            "undelivered": WhatsAppMessage.STATUS_FAILED,
            "queued": WhatsAppMessage.STATUS_PENDING,
        }
        mapped_status = status_map.get(status, None)

        msg = WhatsAppMessage.objects.filter(twilio_message_sid=sid).first()
        if not msg:
            logger.warning("Twilio status webhook: message not found for sid=%s status=%s", sid, status)
            return Response({"detail": "not found"}, status=200)

        updates = {}
        if mapped_status:
            updates["status"] = mapped_status
        if error_code or error_message:
            updates["error_reason"] = f"{error_code or ''} {error_message or ''}".strip()
        if updates:
            for k, v in updates.items():
                setattr(msg, k, v)
            msg.save(update_fields=list(updates.keys()))

        return Response({"status": "ok"})


class InstagramMessageViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsOrgMemberWithRole]
    serializer_class = InstagramMessageSerializer

    def get_queryset(self):
        org = get_current_org(self.request)
        qs = InstagramMessage.objects.filter(organization=org).select_related("contact")
        contact_id = self.request.query_params.get("contact_id")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)
        return qs.order_by("created_at")

    def create(self, request, *args, **kwargs):
        org = get_current_org(request)
        contact_id = request.data.get("contact_id")
        text = (request.data.get("text") or "").strip()
        if not contact_id:
            return Response({"detail": "contact_id required"}, status=400)
        if not text:
            return Response({"detail": "Message text required"}, status=400)
        try:
            contact = Contact.objects.get(pk=contact_id, organization=org)
        except Contact.DoesNotExist:
            return Response({"detail": "Contact not found"}, status=404)
        if contact.instagram_blocked:
            return Response({"detail": "Contact is blocked on Instagram"}, status=400)
        if not contact.instagram_user_id:
            return Response({"detail": "Contact is not onboarded to Instagram"}, status=400)

        try:
            integ = Integration.objects.get(organization=org, provider="instagram", is_active=True)
            token_plain = decrypt_token(getattr(integ, "token", "") or getattr(integ, "token_encrypted", "") or "")
            extra = getattr(integ, "extra", {}) if hasattr(integ, "extra") else {}
            business_id = extra.get("instagram_business_account_id") or extra.get("business_id") or extra.get("instagram_scoped_id")
            if not token_plain or not business_id:
                return Response({"detail": "Instagram is not configured for this organization."}, status=400)
            msg = InstagramMessage.objects.create(
                organization=org,
                contact=contact,
                direction=InstagramMessage.DIR_OUTBOUND,
                message_type=InstagramMessage.TYPE_TEXT,
                text=text,
                status=InstagramMessage.STATUS_SENT,
            )
            sender = InstagramSender()
            send_res = sender.send(
                to=contact.instagram_user_id,
                body=text,
                credentials={"token": token_plain, "extra": {"instagram_scoped_id": business_id}},
            )
            if send_res.success:
                msg.provider_message_id = send_res.provider_message_id or ""
                msg.save(update_fields=["provider_message_id"])
                contact.instagram_last_outbound_at = timezone.now()
                contact.save(update_fields=["instagram_last_outbound_at"])
                return Response(InstagramMessageSerializer(msg).data, status=201)
            msg.status = InstagramMessage.STATUS_FAILED
            msg.error_reason = send_res.error or "unknown error"
            msg.save(update_fields=["status", "error_reason"])
            return Response({"detail": f"Instagram send failed: {msg.error_reason}"}, status=502)
        except Integration.DoesNotExist:
            return Response({"detail": "Instagram is not configured for this organization."}, status=400)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Instagram send exception",
                exc_info=True,
                extra={"org": org.id, "contact": contact.id, "ig_user": contact.instagram_user_id},
            )
            return Response({"detail": f"Instagram send error: {exc}"}, status=500)


class InstagramWebhook(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        # Simplified handler: expect sender_id, recipient_id, text, timestamp
        sender_id = request.data.get("sender_id") or request.data.get("sender") or ""
        recipient_id = request.data.get("recipient_id") or request.data.get("recipient") or ""
        text = request.data.get("text") or ""
        ts = request.data.get("timestamp")

        if not sender_id or not recipient_id:
            return Response({"detail": "missing sender/recipient"}, status=400)

        # Resolve org by recipient_id matching instagram_business_account_id
        integ = (
            Integration.objects.filter(provider="instagram", is_active=True, extra__instagram_business_account_id=recipient_id).first()
            or Integration.objects.filter(provider="instagram", is_active=True, extra__business_id=recipient_id).first()
        )
        if not integ:
            logger.warning("Instagram webhook org not found for recipient=%s", recipient_id)
            return Response({"detail": "org not found"}, status=200)
        org = integ.organization

        contact = Contact.objects.filter(organization=org, instagram_user_id=sender_id).first()
        if not contact:
            contact = Contact.objects.create(
                organization=org,
                full_name="Instagram User",
                instagram_user_id=sender_id,
                instagram_opt_in=True,
                instagram_blocked=False,
            )
        else:
            contact.instagram_opt_in = True
            contact.instagram_blocked = False
            contact.instagram_user_id = contact.instagram_user_id or sender_id
            contact.save(update_fields=["instagram_opt_in", "instagram_blocked", "instagram_user_id"])

        InstagramMessage.objects.create(
            organization=org,
            contact=contact,
            direction=InstagramMessage.DIR_INBOUND,
            message_type=InstagramMessage.TYPE_TEXT,
            text=text,
            status=InstagramMessage.STATUS_RECEIVED,
        )
        now = timezone.now()
        contact.instagram_last_inbound_at = now
        contact.save(update_fields=["instagram_last_inbound_at"])
        return Response({"status": "ok"})

    def get(self, request, *args, **kwargs):
        # Basic verification endpoint if needed
        return Response({"status": "ok"})


class CampaignViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsOrgMemberWithRole]
    serializer_class = CampaignSerializer

    def get_queryset(self):
        org = get_current_org(self.request)
        return Campaign.objects.filter(organization=org).select_related("template")

    @action(detail=False, methods=["get"])
    def throttle(self, request):
        per_channel = getattr(settings, "CHANNEL_THROTTLE_PER_MIN", {})
        default_limit = getattr(settings, "OUTBOUND_PER_MINUTE_LIMIT", 60)
        return Response(
            {
                "default_limit": default_limit,
                "per_channel": {
                    "email": per_channel.get("email", default_limit),
                    "whatsapp": per_channel.get("whatsapp", default_limit),
                    "telegram": per_channel.get("telegram", default_limit),
                    "instagram": per_channel.get("instagram", default_limit),
                },
            }
        )

    @action(detail=False, methods=["get"])
    def costs(self, request):
        """
        Serve hard-coded channel pricing for campaign estimation.
        """
        cost_path = os.path.join(settings.BASE_DIR, "cost.json")
        if not os.path.exists(cost_path):
            return Response({"detail": "Cost file missing"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        with open(cost_path, "r") as fh:
            data = json.load(fh)
        return Response(data)

    def create(self, request, *args, **kwargs):
        org = get_current_org(request)
        name = (request.data.get("name") or "").strip()
        channel = request.data.get("channel")
        template_id = request.data.get("template_id")
        group_ids = request.data.get("group_ids") or []
        upload_contacts = request.data.get("upload_contacts") or []
        if not name:
            return Response({"detail": "Campaign name is required"}, status=400)
        if len(name) > 100:
            return Response({"detail": "Campaign name too long"}, status=400)
        if channel not in ["email", "whatsapp", "telegram", "instagram"]:
            return Response({"detail": "Channel is required"}, status=400)

        template = None
        if template_id:
            template = MessageTemplate.objects.filter(id=template_id, channel=channel, organization=org).first()
            if not template:
                return Response({"detail": "Template not found for this channel"}, status=404)

        contacts_qs = Contact.objects.filter(organization=org)
        eligible = []

        if group_ids:
            if isinstance(group_ids, str):
                try:
                    group_ids = [int(group_ids)]
                except Exception:
                    group_ids = []
            contacts_qs = contacts_qs.filter(groups__id__in=group_ids)

        if upload_contacts:
            # simple normalization: expect list of dicts with name/email/phone
            for entry in upload_contacts:
                email = (entry.get("email") or "").lower().strip()
                phone = (entry.get("phone") or entry.get("phone_whatsapp") or "").strip()
                full_name = entry.get("name") or "Uploaded Contact"
                contact = None
                if email:
                    contact = contacts_qs.filter(email=email).first()
                if not contact and phone:
                    contact = contacts_qs.filter(phone_whatsapp=phone).first()
                if not contact:
                    contact = Contact.objects.create(
                        organization=org,
                        full_name=full_name,
                        email=email or None,
                        phone_whatsapp=phone or None,
                    )
                eligible.append(contact)
        else:
            eligible = list(contacts_qs)

        # channel eligibility filter
        filtered = []
        for c in eligible:
            if c.status in [Contact.STATUS_UNSUBSCRIBED, Contact.STATUS_BOUNCED, Contact.STATUS_BLOCKED]:
                continue
            if channel == "email":
                if c.email:
                    filtered.append(c)
            elif channel == "whatsapp":
                if c.phone_whatsapp and not c.whatsapp_blocked:
                    filtered.append(c)
            elif channel == "telegram":
                if c.telegram_status == Contact.TELEGRAM_STATUS_ONBOARDED and c.telegram_chat_id:
                    filtered.append(c)
            elif channel == "instagram":
                if getattr(c, "instagram_opt_in", False) and getattr(c, "instagram_user_id", None) and not getattr(c, "instagram_blocked", False):
                    filtered.append(c)

        filtered = list({c.id: c for c in filtered}.values())  # dedupe
        target_count = len(filtered)
        if target_count == 0:
            return Response({"detail": "No eligible contacts found for this channel"}, status=400)

        # estimate cost
        if channel == "email":
            estimated_cost = target_count * 0.001
        elif channel == "whatsapp":
            estimated_cost = target_count * 0.005 * 1.25
        else:
            estimated_cost = 0

        campaign = Campaign.objects.create(
            organization=org,
            name=name,
            channel=channel,
            template=template,
            target_count=target_count,
            estimated_cost=estimated_cost,
            status=Campaign.STATUS_QUEUED,
            created_by=request.user if request.user.is_authenticated else None,
            group_ids=group_ids,
            upload_used=bool(upload_rows),
        )
        CampaignRecipient.objects.bulk_create(
            [CampaignRecipient(campaign=campaign, contact=c) for c in filtered]
        )

        # If email campaign, kick off an EmailJob using the same template/contacts
        if channel == "email" and template:
            subject = template.subject or campaign.name
            job = EmailJob.objects.create(
                organization=org,
                template=template,
                subject=subject,
                body_html=template.body or "",
                body_text=template.body or "",
                status=EmailJob.STATUS_QUEUED,
            )
            EmailRecipient.objects.bulk_create(
                [EmailRecipient(job=job, contact=c, email=c.email or "", status=EmailRecipient.STATUS_QUEUED) for c in filtered if c.email]
            )
            process_email_job.delay(job.id)

        data = CampaignSerializer(campaign).data
        data["throttle_per_minute"] = getattr(settings, "OUTBOUND_PER_MINUTE_LIMIT", 60)
        return Response(data, status=201)
