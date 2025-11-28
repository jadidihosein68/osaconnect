from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction

from organizations.models import Organization, Membership

from .models import Notification, NotificationRecipient

User = get_user_model()


def broadcast_to_org(org: Organization, type: str, severity: str, title: str, body: str = "", target_url: str | None = None, data=None):
    data = data or {}
    with transaction.atomic():
        notif = Notification.objects.create(
            organization=org,
            type=type.upper(),
            severity=severity.upper(),
            title=title,
            body=body,
            target_url=target_url,
            data=data,
        )
        members = User.objects.filter(memberships__organization=org)
        NotificationRecipient.objects.bulk_create(
            [
                NotificationRecipient(notification=notif, user=u, organization=org)
                for u in members
            ],
            ignore_conflicts=True,
        )
    return notif


def notify_user(org: Organization, user: User, type: str, severity: str, title: str, body: str = "", target_url: str | None = None, data=None):
    data = data or {}
    with transaction.atomic():
        notif = Notification.objects.create(
            organization=org,
            type=type.upper(),
            severity=severity.upper(),
            title=title,
            body=body,
            target_url=target_url,
            data=data,
        )
        NotificationRecipient.objects.get_or_create(notification=notif, user=user, organization=org)
    return notif
