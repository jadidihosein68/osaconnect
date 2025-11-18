from __future__ import annotations

import random
import string
from typing import Any

from celery import shared_task
from django.utils import timezone

from contacts.models import Contact
from .models import OutboundMessage


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

    try:
        # TODO: integrate channel SDKs; for now mark sent.
        message.status = OutboundMessage.STATUS_SENT
        message.error = ""
        message.trace_id = _generate_trace_id()
        message.contact.last_outbound_at = timezone.now()
        message.contact.save(update_fields=["last_outbound_at", "updated_at"])
        message.save(update_fields=["status", "error", "trace_id", "updated_at"])
    except Exception as exc:  # pragma: no cover - stub retry path
        message.status = OutboundMessage.STATUS_RETRYING
        message.error = str(exc)
        message.retry_count += 1
        message.save(update_fields=["status", "error", "retry_count", "updated_at"])
        raise self.retry(exc=exc)
