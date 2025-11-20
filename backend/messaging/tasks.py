from __future__ import annotations

import random
import string
from typing import Any

from celery import shared_task
from django.utils import timezone

from contacts.models import Contact
from .channels import get_sender
from .models import OutboundMessage, Suppression
from django.conf import settings
from integrations.models import Integration
from integrations.utils import decrypt_token
from monitoring.utils import record_alert
from monitoring.models import MonitoringAlert
from .models import EmailJob, EmailRecipient


def _generate_trace_id() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=12))


@shared_task(bind=True, max_retries=3, default_retry_delay=15)
def send_outbound_message(self, outbound_id: int):
    """Stub task that simulates send + retry path."""
    try:
        message = OutboundMessage.objects.get(pk=outbound_id)
    except OutboundMessage.DoesNotExist:
        return

    if message.contact.status != Contact.STATUS_ACTIVE:
        message.status = OutboundMessage.STATUS_FAILED
        message.error = "Contact inactive"
        message.save(update_fields=["status", "error", "updated_at"])
        return

    destination = (
        message.contact.phone_whatsapp
        if message.channel == "whatsapp"
        else message.contact.email
        if message.channel == "email"
        else message.contact.telegram_chat_id
        if message.channel == "telegram"
        else message.contact.instagram_scoped_id
    )
    if not destination:
        message.status = OutboundMessage.STATUS_FAILED
        message.error = "Missing destination identifier for contact."
        message.save(update_fields=["status", "error", "updated_at"])
        return

    # simple throttling: limit per minute per channel
    throttle_limit = int(getattr(settings, "OUTBOUND_PER_MINUTE_LIMIT", 60))
    one_minute_ago = timezone.now() - timezone.timedelta(minutes=1)
    recent_count = OutboundMessage.objects.filter(channel=message.channel, created_at__gte=one_minute_ago).count()
    if recent_count >= throttle_limit:
        message.status = OutboundMessage.STATUS_FAILED
        message.error = "Throttled: per-minute limit hit"
        message.save(update_fields=["status", "error", "updated_at"])
        return

    # suppression check
    suppressed = Suppression.objects.filter(organization=message.organization, channel=message.channel, identifier=destination).exists()
    if suppressed:
        message.status = OutboundMessage.STATUS_FAILED
        message.error = "Suppressed recipient"
        message.save(update_fields=["status", "error", "updated_at"])
        return

    try:
        credentials = _get_integration_credentials(message.organization.id, message.channel)
    except ValueError as exc:
        message.status = OutboundMessage.STATUS_FAILED
        message.error = str(exc)
        message.save(update_fields=["status", "error", "updated_at"])
        record_alert(
            organization=message.organization,
            category="integration_missing",
            message=str(exc),
            severity=MonitoringAlert.SEVERITY_WARNING,
            metadata={"outbound_id": message.id, "channel": message.channel},
        )
        return

    try:
        sender = get_sender(message.channel)
        result = sender.send(to=destination, body=message.body, media_url=message.media_url, credentials=credentials)
        if not result.success:
            message.status = OutboundMessage.STATUS_FAILED
            message.error = result.error or "Unknown send failure"
            message.retry_count += 1
            message.failed_at = timezone.now()
            record_alert(
                organization=message.organization,
                category="send_failure",
                message=f"{message.channel} send failed: {message.error}",
                severity=MonitoringAlert.SEVERITY_ERROR,
                metadata={"outbound_id": message.id, "channel": message.channel},
            )
        else:
            message.status = OutboundMessage.STATUS_SENT
            message.error = ""
            message.trace_id = result.provider_message_id or _generate_trace_id()
            message.provider_message_id = result.provider_message_id or ""
            message.provider_status = "sent"
            now = timezone.now()
            message.sent_at = now
            message.contact.last_outbound_at = timezone.now()
            message.contact.save(update_fields=["last_outbound_at", "updated_at"])
        message.save(update_fields=["status", "error", "trace_id", "provider_message_id", "provider_status", "retry_count", "sent_at", "failed_at", "updated_at"])
    except Exception as exc:  # pragma: no cover - stub retry path
        message.status = OutboundMessage.STATUS_RETRYING
        message.error = str(exc)
        message.retry_count += 1
        message.save(update_fields=["status", "error", "retry_count", "updated_at"])
        record_alert(
            organization=message.organization,
            category="send_exception",
            message=f"{message.channel} send raised exception: {exc}",
            severity=MonitoringAlert.SEVERITY_ERROR,
            metadata={"outbound_id": message.id, "channel": message.channel},
        )
        raise self.retry(exc=exc)


def _get_integration_credentials(org_id: int, provider: str) -> dict:
    try:
        integration = Integration.objects.get(organization_id=org_id, provider=provider, is_active=True)
    except Integration.DoesNotExist:
        raise ValueError(f"Integration not configured for {provider}")
    token = decrypt_token(integration.token_encrypted or "")
    if not token:
        raise ValueError(f"Token missing for {provider} integration")
    return {"token": token, "extra": integration.extra or {}}


@shared_task(bind=True, default_retry_delay=10, max_retries=2)
def process_email_job(self, job_id: int, batch_size: int = 100, delay_seconds: int = 1):
    try:
        job = EmailJob.objects.get(pk=job_id)
    except EmailJob.DoesNotExist:
        return
    job.status = EmailJob.STATUS_SENDING
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at", "updated_at"])

    try:
        credentials = _get_integration_credentials(job.organization_id, "sendgrid")
        # ensure the subject for this job is passed to the sender (overrides any default in integration.extra)
        extra = credentials.get("extra") or {}
        extra["subject"] = job.subject
        credentials["extra"] = extra
    except ValueError as exc:
        job.status = EmailJob.STATUS_FAILED
        job.error = str(exc)
        job.save(update_fields=["status", "error", "updated_at"])
        return

    sender = get_sender("email")
    recipients_qs = job.recipients.filter(status=EmailRecipient.STATUS_QUEUED)
    total = recipients_qs.count()
    sent = failed = skipped = 0

    offset = 0
    while offset < total:
        batch = list(recipients_qs.order_by("id")[offset : offset + batch_size])
        offset += batch_size
        for r in batch:
            result = sender.send(to=r.email, body=job.body_text or job.body_html, credentials=credentials)
            if result.success:
                r.status = EmailRecipient.STATUS_SENT
                r.sent_at = timezone.now()
                sent += 1
                if r.contact:
                    r.contact.last_outbound_at = timezone.now()
                    r.contact.save(update_fields=["last_outbound_at", "updated_at"])
            else:
                r.status = EmailRecipient.STATUS_FAILED
                r.error = result.error or "Send failed"
                failed += 1
            r.save(update_fields=["status", "error", "sent_at", "updated_at"])
        if delay_seconds:
            import time
            time.sleep(delay_seconds)

    job.sent_count += sent
    job.failed_count += failed
    job.skipped_count += skipped
    job.status = EmailJob.STATUS_COMPLETED if failed == 0 else EmailJob.STATUS_FAILED
    job.completed_at = timezone.now()
    job.save(update_fields=["sent_count", "failed_count", "skipped_count", "status", "completed_at", "updated_at"])
