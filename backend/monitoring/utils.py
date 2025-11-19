from __future__ import annotations

import logging
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail

from .models import MonitoringAlert

logger = logging.getLogger("corbi.audit")


def record_alert(*, organization, category: str, message: str, severity: str = MonitoringAlert.SEVERITY_WARNING, metadata: dict | None = None) -> MonitoringAlert:
    alert = MonitoringAlert.objects.create(
        organization=organization,
        category=category,
        severity=severity,
        message=message,
        metadata=metadata or {},
    )
    logger.warning("monitoring.alert", extra={"org": organization.id, "category": category, "severity": severity, "message": message})
    _maybe_email_alert(alert)
    return alert


def _maybe_email_alert(alert: MonitoringAlert) -> None:
    recipients = getattr(settings, "ALERTS_EMAIL_TO", "")
    if not recipients:
        return
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "alerts@corbi.local")
    subject = f"[Corbi] {alert.severity.upper()} - {alert.category}"
    try:
        send_mail(subject, alert.message, from_email, [r.strip() for r in recipients.split(",") if r.strip()], fail_silently=True)
    except Exception:
        logger.exception("monitoring.alert_email_failed")
