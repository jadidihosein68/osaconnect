from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import OutboundMessage, Suppression, ProviderEvent
from monitoring.utils import record_alert
from monitoring.models import MonitoringAlert
from .models import EmailRecipient, EmailJob
from django.db import transaction


class ProviderCallbackView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, channel: str):
        payload = request.data if isinstance(request.data, dict) else {}
        provider_message_id = payload.get("message_id") or payload.get("id")
        status = (payload.get("status") or "").lower()

        if not provider_message_id or not status:
            return Response({"status": "ignored", "reason": "missing message_id or status"}, status=400)

        msg = OutboundMessage.objects.filter(provider_message_id=provider_message_id).first()
        if not msg:
            return Response({"status": "ignored", "reason": "message not found"}, status=202)

        latency = None
        if msg.sent_at:
            latency = int((timezone.now() - msg.sent_at).total_seconds() * 1000)

        ProviderEvent.objects.create(
            organization=msg.organization,
            outbound=msg,
            provider_message_id=provider_message_id,
            channel=msg.channel,
            status=status,
            payload=payload,
            latency_ms=latency or 0,
        )

        if status in ("delivered", "read"):
            msg.status = OutboundMessage.STATUS_DELIVERED if status == "delivered" else OutboundMessage.STATUS_READ
            msg.provider_status = status
            msg.delivered_at = timezone.now()
            msg.save(update_fields=["status", "provider_status", "delivered_at", "updated_at"])
            return Response({"status": "updated"})

        if status in ("failed", "bounced"):
            msg.status = OutboundMessage.STATUS_FAILED
            msg.provider_status = status
            msg.error = payload.get("error") or msg.error
            msg.failed_at = timezone.now()
            msg.save(update_fields=["status", "provider_status", "error", "failed_at", "updated_at"])
            record_alert(
                organization=msg.organization,
                category="callback_failure",
                message=f"{msg.channel} reported {status} for message {msg.id}",
                severity=MonitoringAlert.SEVERITY_ERROR,
                metadata={"outbound_id": msg.id, "status": status},
            )
            # record suppression on hard failure/bounce
            identifier = (
                msg.contact.phone_whatsapp
                or msg.contact.email
                or msg.contact.telegram_chat_id
                or msg.contact.instagram_scoped_id
                or ""
            )
            if identifier:
                Suppression.objects.get_or_create(
                    organization=msg.organization,
                    channel=msg.channel,
                    identifier=identifier,
                    defaults={"reason": status},
                )
            return Response({"status": "failed"})

        return Response({"status": "ignored", "reason": "unhandled status"}, status=202)


class SendGridEventView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        events = request.data if isinstance(request.data, list) else []
        failed = 0
        updated = 0
        for ev in events:
            event_type = ev.get("event")
            sg_message_id = ev.get("sg_message_id") or ""
            if not sg_message_id:
                continue
            provider_id = sg_message_id.split(".")[0]
            try:
                with transaction.atomic():
                    rec = EmailRecipient.objects.select_related("job", "contact").get(provider_message_id=provider_id)
                    job = rec.job
                    if event_type in ["bounce", "dropped", "spamreport"]:
                        rec.status = EmailRecipient.STATUS_FAILED
                        rec.error = ev.get("reason") or ev.get("response") or event_type
                        rec.save(update_fields=["status", "error", "updated_at"])
                        job.failed_count += 1
                        job.status = EmailJob.STATUS_FAILED
                        job.save(update_fields=["failed_count", "status", "updated_at"])
                        failed += 1
                        identifier = rec.email
                        Suppression.objects.get_or_create(
                            organization=job.organization,
                            channel="email",
                            identifier=identifier,
                            defaults={"reason": event_type},
                        )
                    elif event_type in ["delivered"]:
                        rec.status = EmailRecipient.STATUS_SENT
                        rec.save(update_fields=["status", "updated_at"])
                        updated += 1
            except EmailRecipient.DoesNotExist:
                continue
        return Response({"status": "ok", "failed_updated": failed, "updated": updated})
