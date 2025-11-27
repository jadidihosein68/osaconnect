from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from organizations.permissions import IsOrgMemberWithRole, IsOrgAdmin
from organizations.utils import get_current_org

from .models import Notification, NotificationRecipient
from .serializers import (
    NotificationCreateSerializer,
    NotificationRecipientSerializer,
)

User = get_user_model()


class NotificationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsOrgMemberWithRole]

    def _base_queryset(self, request):
        org = get_current_org(request)
        return NotificationRecipient.objects.select_related("notification").filter(
            organization=org, user=request.user, deleted_at__isnull=True
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        qs = self._base_queryset(request).filter(read_at__isnull=True)
        return Response({"unread_count": qs.count()})

    def list(self, request):
        qs = self._base_queryset(request)
        ntype = request.query_params.getlist("type") or request.query_params.getlist("types")
        severity = request.query_params.getlist("severity") or request.query_params.getlist("severities")
        read = request.query_params.get("read")
        if ntype:
            qs = qs.filter(notification__type__in=ntype)
        if severity:
            qs = qs.filter(notification__severity__in=severity)
        if read == "true":
            qs = qs.filter(read_at__isnull=False)
        elif read == "false":
            qs = qs.filter(read_at__isnull=True)
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        start = (page - 1) * page_size
        end = start + page_size
        total = qs.count()
        data = NotificationRecipientSerializer(qs[start:end], many=True).data
        return Response({"results": data, "count": total, "page": page, "page_size": page_size})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        org = get_current_org(request)
        NotificationRecipient.objects.filter(
            organization=org, user=request.user, read_at__isnull=True, deleted_at__isnull=True
        ).update(read_at=timezone.now())
        return Response({"status": "ok"})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        org = get_current_org(request)
        read_flag = request.data.get("read", True)
        try:
            rec = NotificationRecipient.objects.get(pk=pk, organization=org, user=request.user, deleted_at__isnull=True)
        except NotificationRecipient.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        rec.read_at = None if read_flag is False else rec.read_at or timezone.now()
        rec.save(update_fields=["read_at"])
        return Response({"status": "ok", "read_at": rec.read_at})

    @action(detail=False, methods=["post"], url_path="broadcast", permission_classes=[IsAuthenticated, IsOrgAdmin])
    def broadcast(self, request):
        org = get_current_org(request)
        serializer = NotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        scope = data["scope"]
        target_user_id = data.get("user_id")
        with transaction.atomic():
            notif = Notification.objects.create(
                organization=org,
                type=data["type"].upper(),
                severity=data["severity"].upper(),
                title=data["title"],
                body=data.get("body") or "",
                target_url=data.get("target_url") or None,
                data=data.get("data") or {},
                created_by=request.user,
            )
            recipients_qs = User.objects.filter(memberships__organization=org)
            if scope == "user":
                if not target_user_id:
                    return Response({"detail": "user_id is required when scope=user"}, status=400)
                recipients_qs = recipients_qs.filter(id=target_user_id)
            bulk = [
                NotificationRecipient(
                    notification=notif,
                    user=u,
                    organization=org,
                )
                for u in recipients_qs
            ]
            NotificationRecipient.objects.bulk_create(bulk, ignore_conflicts=True)
        return Response({"status": "created", "id": notif.id}, status=status.HTTP_201_CREATED)
