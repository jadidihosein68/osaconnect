from __future__ import annotations

import logging
from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.utils import get_current_org
from organizations.permissions import IsOrgAdmin
from .models import Integration
from .serializers import IntegrationSerializer
from .utils import encrypt_token

audit_logger = logging.getLogger("corbi.audit")
logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS = {choice[0] for choice in Integration.PROVIDERS}


def _validate_provider(provider: str) -> None:
    if provider not in SUPPORTED_PROVIDERS:
        raise ValueError("Unsupported provider")


class IntegrationListView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = get_current_org(request)
        integrations = Integration.objects.filter(organization=org)
        return Response(IntegrationSerializer(integrations, many=True).data)


class IntegrationConnectView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request, provider: str):
        org = get_current_org(request)
        try:
            _validate_provider(provider)
        except ValueError:
            return Response({"status": "error", "ok": False, "message": "Unsupported provider"}, status=status.HTTP_400_BAD_REQUEST)

        token = request.data.get("token")
        extra = request.data.get("extra") or {}
        if not token:
            return Response({"status": "error", "ok": False, "message": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Optional lightweight validation stubs
        validation_message = self._light_validate(provider, token, extra)

        obj, created = Integration.objects.update_or_create(
            organization=org,
            provider=provider,
            defaults={
                "token_encrypted": encrypt_token(token),
                "extra": extra,
                "is_active": True,
                "updated_at": timezone.now(),
            },
        )
        audit_logger.info(
            "integration.connect",
            extra={"provider": provider, "org": org.id, "user": getattr(request.user, "username", "anon"), "result": "created" if created else "updated"},
        )
        return Response(
            {
                "status": "ok",
                "ok": True,
                "message": validation_message or ("Connected" if created else "Updated"),
                "integration": IntegrationSerializer(obj).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def _light_validate(self, provider: str, token: str, extra: dict) -> str | None:
        # Avoid external calls; perform minimal structural checks
        if provider == "sendgrid" and not token.startswith("SG."):
            return "Warning: SendGrid tokens typically start with 'SG.'"
        if provider == "sendgrid" and not (extra.get("from_email") and extra.get("to_email")):
            return "Note: from_email and to_email recommended for SendGrid."
        if provider == "whatsapp" and not (extra.get("account_sid") and extra.get("from_whatsapp")):
            return "Note: account_sid and from_whatsapp are recommended for WhatsApp."
        if provider == "telegram" and not extra.get("chat_id"):
            return "Note: chat_id is recommended for Telegram."
        if provider == "google_calendar" and not extra:
            return "Note: calendar metadata not provided."
        if provider == "elevenlabs":
            missing = [k for k in ["agent_id", "agent_phone_number_id", "webhook_secret"] if not extra.get(k)]
            if missing:
                return f"Note: missing recommended fields: {', '.join(missing)}"
        return None


class IntegrationDisconnectView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def delete(self, request, provider: str):
        org = get_current_org(request)
        try:
            _validate_provider(provider)
        except ValueError:
            return Response({"status": "error", "ok": False, "message": "Unsupported provider"}, status=status.HTTP_400_BAD_REQUEST)

        obj = Integration.objects.filter(organization=org, provider=provider).first()
        if not obj:
            return Response({"status": "error", "ok": False, "message": "Integration not found"}, status=status.HTTP_404_NOT_FOUND)

        obj.token_encrypted = ""
        obj.extra = {}
        obj.is_active = False
        obj.save(update_fields=["token_encrypted", "extra", "is_active", "updated_at"])
        audit_logger.info(
            "integration.disconnect",
            extra={"provider": provider, "org": org.id, "user": getattr(request.user, "username", "anon"), "result": "disconnected"},
        )
        return Response({"status": "ok", "ok": True, "message": "Disconnected"})


class IntegrationTestView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request, provider: str):
        org = get_current_org(request)
        try:
            _validate_provider(provider)
        except ValueError:
            return Response({"status": "error", "ok": False, "message": "Unsupported provider"}, status=status.HTTP_400_BAD_REQUEST)

        token = request.data.get("token")
        extra = request.data.get("extra") or {}
        if not token:
            return Response({"status": "error", "ok": False, "message": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

        if provider == "elevenlabs":
            return self._test_elevenlabs(token, extra, org, request)

        # Stub/placeholder success for other providers
        return Response({"status": "ok", "ok": True, "message": "Test succeeded."})

    def _test_elevenlabs(self, token: str, extra: dict, org, request):
        base_url = getattr(settings, "ELEVENLABS_BASE_URL", "https://api.elevenlabs.io").rstrip("/")
        to_number = extra.get("test_to_number")
        agent_id = extra.get("agent_id")
        phone_id = extra.get("agent_phone_number_id")
        webhook_secret = extra.get("webhook_secret")

        missing = [k for k in ["agent_id", "agent_phone_number_id", "test_to_number", "webhook_secret"] if not extra.get(k)]
        if missing:
            return Response({"status": "error", "ok": False, "message": f"Missing fields: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "agent_id": agent_id,
            "agent_phone_number_id": phone_id,
            "to_number": to_number,
            # Minimal client data; can be extended later.
        }
        headers = {"xi-api-key": token, "Content-Type": "application/json"}
        try:
            import requests

            resp = requests.post(f"{base_url}/v1/convai/twilio/outbound-call", json=payload, headers=headers, timeout=15)
            if resp.status_code >= 300:
                logger.warning(
                    "elevenlabs.test.failed",
                    extra={"org": org.id, "status": resp.status_code, "body": resp.text[:500]},
                )
                return Response(
                    {"status": "error", "ok": False, "message": f"Provider returned {resp.status_code}", "body": resp.text[:500]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response({"status": "ok", "ok": True, "message": "Test call initiated."})
        except Exception as exc:  # noqa: BLE001
            logger.exception("elevenlabs.test.exception", extra={"org": org.id})
            return Response({"status": "error", "ok": False, "message": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
