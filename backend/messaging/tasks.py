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
    suppressed = Suppression.objects.filter(
        organization=message.organization, channel=message.channel, identifier=destination
    ).exists()
    if suppressed:
        message.status = OutboundMessage.STATUS_FAILED
        message.error = "Suppressed recipient"
        message.save(update_fields=["status", "error", "updated_at"])
        return

    try:
        sender = get_sender(message.channel)
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
            raise ValueError("Missing destination identifier for contact.")

        result = sender.send(to=destination, body=message.body, media_url=message.media_url)
        if not result.success:
            message.status = OutboundMessage.STATUS_FAILED
            message.error = result.error or "Unknown send failure"
            message.retry_count += 1
        else:
            message.status = OutboundMessage.STATUS_SENT
            message.error = ""
            message.trace_id = result.provider_message_id or _generate_trace_id()
            message.provider_message_id = result.provider_message_id or ""
            message.provider_status = "sent"
            message.contact.last_outbound_at = timezone.now()
            message.contact.save(update_fields=["last_outbound_at", "updated_at"])
        message.save(update_fields=["status", "error", "trace_id", "provider_message_id", "provider_status", "retry_count", "updated_at"])
    except Exception as exc:  # pragma: no cover - stub retry path
        message.status = OutboundMessage.STATUS_RETRYING
        message.error = str(exc)
        message.retry_count += 1
        message.save(update_fields=["status", "error", "retry_count", "updated_at"])
        raise self.retry(exc=exc)
