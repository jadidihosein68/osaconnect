from __future__ import annotations

import base64
import random
import string
from typing import Any

from celery import shared_task
from django.utils import timezone

from contacts.models import Contact
from .channels import get_sender
from .models import OutboundMessage, Suppression, EmailJob, EmailRecipient, EmailAttachment, ContactEngagement
from django.conf import settings
from django.core.signing import TimestampSigner
from integrations.models import Integration
from integrations.utils import decrypt_token
from monitoring.utils import record_alert
from monitoring.models import MonitoringAlert

# Unsubscribe base prefers explicit UNSUBSCRIBE_URL, then SITE_URL fallback.
DEFAULT_UNSUB_URL = getattr(settings, "UNSUBSCRIBE_URL", "") or getattr(settings, "SITE_URL", "")
DEFAULT_UNSUB_MAILTO = getattr(settings, "UNSUBSCRIBE_MAILTO", "")
FOOTER_TEXT = getattr(
    settings,
    "EMAIL_FOOTER_TEXT",
    "If you no longer wish to receive these emails, you can unsubscribe below.",
)
signer = TimestampSigner()
EMAIL_BATCH_SIZE = int(getattr(settings, "EMAIL_BATCH_SIZE", 100))
EMAIL_BATCH_DELAY_SECONDS = int(getattr(settings, "EMAIL_BATCH_DELAY_SECONDS", 1))
EMAIL_RETRY_DELAY_SECONDS = int(getattr(settings, "EMAIL_RETRY_DELAY_SECONDS", 10))
EMAIL_MAX_RETRIES = int(getattr(settings, "EMAIL_MAX_RETRIES", 2))


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


@shared_task(bind=True, default_retry_delay=EMAIL_RETRY_DELAY_SECONDS, max_retries=EMAIL_MAX_RETRIES)
def process_email_job(self, job_id: int, batch_size: int = EMAIL_BATCH_SIZE, delay_seconds: int = EMAIL_BATCH_DELAY_SECONDS):
    batch_size = int(getattr(settings, "EMAIL_BATCH_SIZE", batch_size))
    delay_seconds = int(getattr(settings, "EMAIL_BATCH_DELAY_SECONDS", delay_seconds))
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
            rendered_body = _render_body(job, r)
            attachments = _load_attachments(job.attachments)
            result = sender.send(to=r.email, body=rendered_body, credentials=credentials, attachments=attachments)
            if result.success:
                r.status = EmailRecipient.STATUS_SENT
                r.sent_at = timezone.now()
                r.provider_message_id = result.provider_message_id or ""
                try:
                    raw = f"{job.organization_id}|{r.email}|{job.id}|{r.id}"
                    r.signed_token = signer.sign(raw)
                except Exception:
                    r.signed_token = ""
                sent += 1
                if r.contact:
                    r.contact.last_outbound_at = timezone.now()
                    r.contact.save(update_fields=["last_outbound_at", "updated_at"])
                    ContactEngagement.objects.create(
                        contact=r.contact,
                        channel="email",
                        subject=job.subject,
                        status="sent",
                        error="",
                    )
            else:
                r.status = EmailRecipient.STATUS_FAILED
                r.error = result.error or "Send failed"
                failed += 1
                r.provider_message_id = result.provider_message_id or ""
                if r.contact:
                    ContactEngagement.objects.create(
                        contact=r.contact,
                        channel="email",
                        subject=job.subject,
                        status="failed",
                        error=r.error,
                    )
            r.save(update_fields=["status", "error", "sent_at", "provider_message_id", "signed_token", "updated_at"])
        if delay_seconds:
            import time
            time.sleep(delay_seconds)

    job.sent_count += sent
    job.failed_count += failed
    job.skipped_count += skipped
    job.status = EmailJob.STATUS_COMPLETED if failed == 0 else EmailJob.STATUS_FAILED
    job.completed_at = timezone.now()
    job.save(update_fields=["sent_count", "failed_count", "skipped_count", "status", "completed_at", "updated_at"])


def _render_body(job: EmailJob, recipient: EmailRecipient) -> str:
    contact = recipient.contact
    full_name = (contact.full_name if contact else recipient.full_name) or ""
    parts = full_name.split()
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    company_name = ""
    if contact and isinstance(contact.metadata, dict):
        company_name = contact.metadata.get("company_name", "")
    unsubscribe_link = _build_unsubscribe_link(job.organization_id, recipient)
    unsubscribe_html = ""
    if unsubscribe_link:
        unsubscribe_html = (
            f"<a href='{unsubscribe_link}' "
            f"style='display:inline-block;margin-top:8px;padding:8px 12px;background:#e5e7eb;border-radius:6px;color:#111827;text-decoration:none;'>"
            f"Unsubscribe</a>"
        )

    substitutions = {
        "{{first_name}}": first_name,
        "{{last_name}}": last_name,
        "{{full_name}}": full_name,
        "{{company_name}}": company_name,
        "{{unsubscribe_link}}": unsubscribe_html or (unsubscribe_link or ""),
    }
    body = job.body_html or job.body_text or ""
    for placeholder, value in substitutions.items():
        body = body.replace(placeholder, value)
    footer_source = job.footer_html or f"{FOOTER_TEXT}<br />{unsubscribe_html or unsubscribe_link or ''}"
    # Replace special variable
    footer_html = footer_source.replace("{{unsubscribe_link}}", unsubscribe_html or (unsubscribe_link or ""))
    if footer_html and unsubscribe_link and "{{unsubscribe_link}}" not in footer_source and unsubscribe_html:
        footer_html = footer_html + "<br />" + unsubscribe_html

    if footer_html:
        # If body already looks like HTML, append footer as HTML; else append text/plain.
        if "<html" in body.lower() or "<p" in body.lower() or "<div" in body.lower() or "</" in body:
            body = body + f"<div style='margin-top:16px;font-size:12px;color:#6b7280;'>{footer_html}</div>"
        else:
            plain_footer = FOOTER_TEXT + ("\n" + unsubscribe_link if unsubscribe_link else "")
            body = body + f"\n\n{plain_footer}"
    return body


def _build_unsubscribe_link(org_id: int, recipient: EmailRecipient) -> str:
    """
    Best practice: hosted unsubscribe URL with a signed token.
    """
    base = DEFAULT_UNSUB_URL.rstrip("/") if DEFAULT_UNSUB_URL else ""
    if base and recipient.email:
        # prefer pre-generated token (contains job+recipient ids)
        if recipient.signed_token:
            token = recipient.signed_token
        else:
            raw = f"{org_id}|{recipient.email}|{recipient.job_id}|{recipient.id}"
            token = signer.sign(raw)
        return f"{base.rstrip('/')}/unsubscribe/?token={token}"
    if DEFAULT_UNSUB_MAILTO:
        return f"mailto:{DEFAULT_UNSUB_MAILTO}?subject=Unsubscribe&body=Please%20unsubscribe%20{recipient.email}"
    # final fallback to mailto recipient so link is never empty
    if recipient.email:
        return f"mailto:{recipient.email}?subject=Unsubscribe"
    return ""


def _load_attachments(attachments_meta: list[dict]) -> list:
    loaded = []
    if not attachments_meta:
        return loaded
    for meta in attachments_meta:
        path = meta.get("path")
        filename = meta.get("filename") or (path.split("/")[-1] if path else "attachment")
        try:
            att = EmailAttachment.objects.get(file=path)
            with att.file.open("rb") as fh:
                content = fh.read()
        except EmailAttachment.DoesNotExist:
            continue
        except Exception:
            continue
        import base64

        loaded.append(
            {
                "filename": filename,
                "type": meta.get("content_type") or "application/octet-stream",
                "content": base64.b64encode(content).decode(),
            }
        )
    return loaded
