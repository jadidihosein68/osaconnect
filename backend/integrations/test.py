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
from telegram import Bot
import asyncio
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from django.conf import settings

from organizations.utils import get_current_org
from organizations.permissions import IsOrgAdmin
from .views import SUPPORTED_PROVIDERS
from .utils import decrypt_token

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
            from_email = extra.get("from_email")
            to_email = extra.get("to_email")
            if not (from_email and to_email):
                return (False, "from_email and to_email are required for SendGrid test")
            try:
                sg = SendGridAPIClient(api_key=token)
                mail = Mail(
                    from_email=Email(from_email),
                    to_emails=To(to_email),
                    subject="Test email",
                    plain_text_content=Content("text/plain", "Hi from the email"),
                ).get()
                resp = sg.client.mail.send.post(request_body=mail)
                return (resp.status_code in (200, 202), f"SendGrid status {resp.status_code}")
            except Exception as exc:
                return (False, f"SendGrid test failed: {exc}")
        if provider == "telegram":
            chat_id = extra.get("chat_id")
            if not chat_id:
                return (False, "chat_id is required for Telegram test")
            try:
                async def _send():
                    bot = Bot(token=token)
                    await bot.send_message(chat_id=chat_id, text="Hello from Telegram-bot!")
                asyncio.run(_send())
                return (True, "Telegram message sent")
            except Exception as exc:
                return (False, f"Telegram test failed: {exc}")
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
        if provider == "elevenlabs":
            base_url = getattr(settings, "ELEVENLABS_BASE_URL", "https://api.elevenlabs.io").rstrip("/")
            agent_id = extra.get("agent_id")
            phone_id = extra.get("agent_phone_number_id")
            to_number = extra.get("test_to_number")
            if not all([agent_id, phone_id, to_number]):
                return (False, "agent_id, agent_phone_number_id, and test_to_number are required for ElevenLabs test")
            payload = {
                "agent_id": agent_id,
                "agent_phone_number_id": phone_id,
                "to_number": to_number,
            }
            try:
                resp = requests.post(
                    f"{base_url}/v1/convai/twilio/outbound-call",
                    headers={"xi-api-key": token, "Content-Type": "application/json"},
                    json=payload,
                    timeout=15,
                )
                if resp.status_code < 300:
                    return (True, "ElevenLabs test call initiated")
                return (False, f"ElevenLabs status {resp.status_code}: {resp.text[:200]}")
            except Exception as exc:  # noqa: BLE001
                return (False, f"ElevenLabs test failed: {exc}")
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

        existing = None
        if not token:
            from .models import Integration

            existing = Integration.objects.filter(organization=org, provider=provider, is_active=True).first()
            token = decrypt_token(existing.token_encrypted) if existing else None
            if not token:
                return Response({"status": "error", "ok": False, "message": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Merge stored extra with provided overrides
        if existing is None:
            from .models import Integration
            existing = Integration.objects.filter(organization=org, provider=provider, is_active=True).first()
        stored_extra = (existing.extra if existing else {}) or {}
        merged_extra = {**stored_extra, **extra}

        ok, msg = _validate_with_provider(provider, token, merged_extra)
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
