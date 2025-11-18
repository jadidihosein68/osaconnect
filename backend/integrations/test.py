from __future__ import annotations

import logging
from rest_framework import status
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import requests
from twilio.rest import Client as TwilioClient

from organizations.utils import get_current_org
from organizations.permissions import IsOrgAdmin
from .views import SUPPORTED_PROVIDERS

audit_logger = logging.getLogger("corbi.audit")


def _validate_with_provider(provider: str, token: str, extra: dict) -> tuple[bool, str]:
    """
    Minimal, short-timeout validation against each provider.
    Tokens are not logged; errors are returned as messages.
    """
    timeout = 5
    headers = {}
    try:
        if provider == "sendgrid":
            headers["Authorization"] = f"Bearer {token}"
            resp = requests.get("https://api.sendgrid.com/v3/user/profile", headers=headers, timeout=timeout)
            return (resp.status_code == 200, f"SendGrid status {resp.status_code}")
        if provider == "telegram":
            resp = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=timeout)
            data = resp.json() if resp.ok else {}
            return (bool(data.get("ok")), f"Telegram status {resp.status_code}")
        if provider == "whatsapp":
            account_sid = extra.get("account_sid")
            from_whatsapp = extra.get("from_whatsapp")
            to_whatsapp = extra.get("to_whatsapp")
            if not all([account_sid, from_whatsapp, to_whatsapp]):
                return (False, "account_sid, from_whatsapp, and to_whatsapp are required for WhatsApp test")
            try:
                client = TwilioClient(account_sid, token)
                msg = client.messages.create(from_=f"whatsapp:{from_whatsapp}", to=f"whatsapp:{to_whatsapp}", body="Hello !")
                return (bool(msg.sid), "WhatsApp message sent")
            except Exception as exc:
                return (False, f"WhatsApp test failed: {exc}")
        if provider == "instagram":
            resp = requests.get(
                "https://graph.facebook.com/me",
                params={"fields": "id,name", "access_token": token},
                timeout=timeout,
            )
            return (resp.status_code == 200, f"Instagram status {resp.status_code}")
        if provider == "google_calendar":
            headers["Authorization"] = f"Bearer {token}"
            resp = requests.get("https://www.googleapis.com/calendar/v3/users/me/calendarList", headers=headers, timeout=timeout)
            return (resp.status_code == 200, f"Google Calendar status {resp.status_code}")
        return (False, "Unsupported provider")
    except Exception as exc:  # network/JSON errors
        return (False, f"Validation failed: {exc}")


class IntegrationTestView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request, provider: str):
        org = get_current_org(request)
        if provider not in SUPPORTED_PROVIDERS:
            return Response({"status": "error", "ok": False, "message": "Unsupported provider"}, status=status.HTTP_400_BAD_REQUEST)
        token = request.data.get("token")
        extra = request.data.get("extra") or {}
        if not token:
            return Response({"status": "error", "ok": False, "message": "token is required"}, status=status.HTTP_400_BAD_REQUEST)
        ok, msg = _validate_with_provider(provider, token, extra)
        audit_logger.info(
            "integration.test",
            extra={
                "provider": provider,
                "org": org.id,
                "user": getattr(request.user, "username", "anon"),
                "result": "ok" if ok else "failed",
            },
        )
        return Response(
            {"status": "ok" if ok else "error", "ok": ok, "message": msg},
            status=status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST,
        )
