from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, FormParser, BaseParser
from rest_framework.exceptions import ParseError
import json
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import logging

from .models import OutboundMessage, Suppression, ProviderEvent, EmailRecipient, EmailJob, Campaign, CampaignRecipient
from notifications.service import broadcast_to_org
from monitoring.utils import record_alert
from monitoring.models import MonitoringAlert
from django.db import transaction, models

logger = logging.getLogger(__name__)


class ProviderCallbackView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, channel: str):
        raw_body = request.body.decode("utf-8", errors="ignore")
        logger.info(
            "webhook_received provider=%s body=%s content_type=%s",
            channel,
            raw_body,
            request.META.get("CONTENT_TYPE"),
        )
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


class RawPassthroughParser(BaseParser):
    """
    Accept any content-type and return raw bytes without raising ParseError.
    Useful for tolerant webhooks (e.g., SendGrid) that may POST NDJSON or plain text.
    """
    media_type = "*/*"

    def parse(self, stream, media_type=None, parser_context=None):
        return stream.read()


@method_decorator(csrf_exempt, name="dispatch")
class SendGridEventView(APIView):
    authentication_classes = []
    permission_classes = []
    parser_classes = [RawPassthroughParser, JSONParser, FormParser]

    def post(self, request):
        body_text = request.body.decode("utf-8", errors="ignore")
        logger.info(
            "webhook_received provider=sendgrid body=%s content_type=%s",
            body_text,
            request.META.get("CONTENT_TYPE"),
        )
        # Try to parse tolerant to any content
        data = None
        if isinstance(request.data, (list, dict)):
            data = request.data
        else:
            # raw bytes from RawPassthroughParser or fallback
            raw = body_text
            try:
                data = json.loads(raw)
            except Exception:
                # Try newline-delimited JSON objects
                objs = []
                for line in raw.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        objs.append(json.loads(line))
                    except Exception:
                        continue
                data = objs if objs else []

        # Normalize to a list of events
        events = data if isinstance(data, list) else [data] if isinstance(data, dict) else []
        if not events:
            logger.warning(
                "sendgrid_webhook_no_events body=%s content_type=%s",
                body_text,
                request.META.get("CONTENT_TYPE"),
            )
            return Response({"status": "ignored", "reason": "no events"}, status=200)
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
                        if job.campaign:
                            Campaign.objects.filter(id=job.campaign_id).update(failed_count=models.F("failed_count") + 1)
                            if rec.contact_id:
                                CampaignRecipient.objects.filter(campaign_id=job.campaign_id, contact_id=rec.contact_id).update(
                                    status=CampaignRecipient.STATUS_FAILED,
                                    provider_message_id=rec.provider_message_id,
                                    error_message=rec.error,
                                )
                        failed += 1
                        identifier = rec.email
                        Suppression.objects.get_or_create(
                            organization=job.organization,
                            channel="email",
                            identifier=identifier,
                            defaults={"reason": event_type},
                        )
                    elif event_type in ["delivered"]:
                        delivered_increment = False
                        # Do not downgrade a READ back to SENT
                        if rec.status != EmailRecipient.STATUS_READ:
                            rec.status = EmailRecipient.STATUS_SENT
                            rec.save(update_fields=["status", "updated_at"])
                            delivered_increment = True
                        if delivered_increment and job.campaign:
                            Campaign.objects.filter(id=job.campaign_id).update(delivered_count=models.F("delivered_count") + 1)
                            if rec.contact_id:
                                CampaignRecipient.objects.filter(campaign_id=job.campaign_id, contact_id=rec.contact_id).update(
                                    status=CampaignRecipient.STATUS_DELIVERED,
                                    provider_message_id=rec.provider_message_id,
                                )
                        updated += 1
                    elif event_type in ["open"]:
                        if rec.status != EmailRecipient.STATUS_READ:
                            rec.status = EmailRecipient.STATUS_READ
                            rec.read_at = timezone.now()
                            rec.save(update_fields=["status", "read_at", "updated_at"])
                            if job.campaign:
                                Campaign.objects.filter(id=job.campaign_id).update(read_count=models.F("read_count") + 1)
                                if rec.contact_id:
                                    CampaignRecipient.objects.filter(campaign_id=job.campaign_id, contact_id=rec.contact_id).update(
                                        status=CampaignRecipient.STATUS_READ,
                                        provider_message_id=rec.provider_message_id,
                                    )
                    # update job/campaign status if all recipients finalized
                    if job and job.total_recipients:
                        finalized = job.recipients.filter(status__in=[EmailRecipient.STATUS_SENT, EmailRecipient.STATUS_FAILED, EmailRecipient.STATUS_READ]).count()
                        if finalized >= job.total_recipients:
                            job.status = EmailJob.STATUS_COMPLETED if job.failed_count == 0 else EmailJob.STATUS_FAILED
                            job.completed_at = timezone.now()
                            job.save(update_fields=["status", "completed_at", "updated_at"])
                            if job.campaign_id:
                                # campaign complete when no queued recipients remain
                                pending = CampaignRecipient.objects.filter(
                                    campaign_id=job.campaign_id, status=CampaignRecipient.STATUS_QUEUED
                                ).exists()
                                if not pending:
                                    Campaign.objects.filter(id=job.campaign_id).update(
                                        status=Campaign.STATUS_COMPLETED if job.failed_count == 0 else Campaign.STATUS_FAILED
                                    )
                                    if job.failed_count > 0:
                                        broadcast_to_org(
                                            job.organization,
                                            type="CAMPAIGN",
                                            severity="HIGH",
                                            title=f"Campaign {job.campaign_id} partially failed",
                                            body=f"{job.failed_count} recipients failed",
                                            target_url=f"/messaging/campaign/{job.campaign_id}",
                                        )
                                    else:
                                        broadcast_to_org(
                                            job.organization,
                                            type="CAMPAIGN",
                                            severity="LOW",
                                            title=f"Campaign {job.campaign_id} completed",
                                            body=f"{job.total_recipients} recipients processed",
                                            target_url=f"/messaging/campaign/{job.campaign_id}",
                                        )
            except EmailRecipient.DoesNotExist:
                continue
        return Response({"status": "ok", "failed_updated": failed, "updated": updated})
