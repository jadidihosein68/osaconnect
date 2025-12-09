from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone as dt_timezone

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Content, Email, Mail, To
from telegram import Bot
from twilio.rest import Client as TwilioClient
from openai import OpenAI

from organizations.permissions import IsOrgAdmin
from organizations.utils import get_current_org
from .utils import decrypt_token
from .views import SUPPORTED_PROVIDERS

audit_logger = logging.getLogger("corbi.audit")


def _clean_redacted(data: dict) -> dict:
    cleaned = {}
    for k, v in data.items():
        if isinstance(v, str) and "••••" in v:
            continue
        cleaned[k] = v
    return cleaned


def _google_token(integration, extra: dict):
    """
    Return a usable Google access token (may refresh) plus merged extra and reason.
    """
    if not integration:
        return (None, extra, None)
    stored = integration.extra or {}
    cleaned = {k: v for k, v in stored.items() if not (isinstance(v, str) and "•" in v)}
    access_enc = cleaned.get("access_token_encrypted", "") or ""
    refresh_enc = cleaned.get("refresh_token_encrypted", "") or ""
    client_id_enc = cleaned.get("client_id_encrypted", "") or ""
    client_secret_enc = cleaned.get("client_secret_encrypted", "") or ""
    had_encrypted = bool(access_enc or refresh_enc or client_id_enc or client_secret_enc)

    access_plain = cleaned.get("access_token")
    refresh_plain = cleaned.get("refresh_token")
    client_id_plain = cleaned.get("client_id")
    client_secret_plain = cleaned.get("client_secret")

    access_token = access_plain or (decrypt_token(access_enc) if access_enc else None)
    refresh_token = refresh_plain or (decrypt_token(refresh_enc) if refresh_enc else None)
    client_id = client_id_plain or (decrypt_token(client_id_enc) if client_id_enc else None)
    client_secret = client_secret_plain or (decrypt_token(client_secret_enc) if client_secret_enc else None)

    if had_encrypted and not any([access_token, refresh_token, client_id, client_secret]):
        merged_extra = {
            **{
                k: v
                for k, v in cleaned.items()
                if k
                not in [
                    "access_token_encrypted",
                    "refresh_token_encrypted",
                    "client_id_encrypted",
                    "client_secret_encrypted",
                    "access_expires_at",
                ]
            },
            **extra,
        }
        return (None, merged_extra, "decrypt_failed")

    expires_at = cleaned.get("access_expires_at")
    now_ts = timezone.now().timestamp()
    if not access_token and not refresh_token:
        merged_extra = {
            **{k: v for k, v in cleaned.items() if k not in ["access_token_encrypted", "refresh_token_encrypted", "client_id_encrypted", "client_secret_encrypted", "access_expires_at"]},
            **extra,
        }
        reason = "invalid_tokens" if had_encrypted else None
        return (None, merged_extra, reason)

    if (expires_at and now_ts >= float(expires_at) - 60) and refresh_token and client_id and client_secret:
        try:
            resp = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=10,
            )
            if resp.status_code == 200:
                data_json = resp.json()
                new_access = data_json.get("access_token")
                expires_in = data_json.get("expires_in", 3600)
                if new_access:
                    access_token = new_access
                    integration.extra = {
                        **cleaned,
                        "access_token": new_access,
                        "access_expires_at": now_ts + int(expires_in),
                    }
                    integration.save(update_fields=["extra", "updated_at"])
            else:
                audit_logger.warning("google.refresh_failed", extra={"org": integration.organization_id, "status": resp.status_code})
        except Exception:
            audit_logger.exception("google.refresh_exception", extra={"org": integration.organization_id})

    base_extra = {
        k: v
        for k, v in (integration.extra or {}).items()
        if k
        not in [
            "access_token_encrypted",
            "refresh_token_encrypted",
            "client_id_encrypted",
            "client_secret_encrypted",
            "access_expires_at",
        ]
    }
    extra_merged = {**base_extra, **extra}
    return (access_token, extra_merged, None)


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
            calendar_id = extra.get("calendar_id", "primary")
            organizer_email = extra.get("organizer_email")
            target_email = extra.get("target_email")
            if not organizer_email:
                return (False, "organizer_email is required for Calendar test")
            if not target_email:
                return (False, "target_email is required for Calendar test")
            now = datetime.now(dt_timezone.utc)
            start = now + timedelta(hours=1)
            end = start + timedelta(minutes=30)
            event_body = {
                "summary": "Test Meeting (Corbi)",
                "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
                "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
                "attendees": [{"email": target_email}],
                "organizer": {"email": organizer_email},
            }
            resp = requests.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
                headers=headers,
                params={"sendUpdates": "all"},
                json=event_body,
                timeout=timeout,
            )
            ok = resp.status_code in (200, 201)
            snippet = resp.text[:400] if resp.text else ""
            if ok:
                eid = resp.json().get("id") if resp.text else None
                return (True, f"Event created for {target_email}. id={eid}")
            return (False, f"Google Calendar status {resp.status_code} for {organizer_email}: {snippet}")
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
        if provider == "openrouter":
            base_url = getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
            try:
                client = OpenAI(base_url=base_url, api_key=token)
                resp = client.models.list()
                count = len(getattr(resp, "data", []) or [])
                return (True, f"OpenRouter key valid; models available: {count}")
            except Exception as exc:  # noqa: BLE001
                return (False, f"OpenRouter test failed: {exc}")
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
        extra = _clean_redacted(request.data.get("extra") or {})

        from .models import Integration

        existing = Integration.objects.filter(organization=org, provider=provider, is_active=True).first()

        reason = None
        if provider == "google_calendar" and not token:
            token, extra, reason = _google_token(existing, extra)
            if not token and reason == "decrypt_failed":
                return Response(
                    {
                        "status": "error",
                        "ok": False,
                        "message": "Google Calendar tokens could not be decrypted. Ensure FERNET_KEY is unchanged and reconnect via OAuth.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not token:
                return Response(
                    {
                        "status": "error",
                        "ok": False,
                        "message": "Google Calendar not connected or tokens invalid. Please reconnect via OAuth.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if provider != "google_calendar" and not token:
            token = decrypt_token(existing.token_encrypted) if existing else None
            if not token:
                return Response({"status": "error", "ok": False, "message": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Merge stored extra with provided overrides (non-secret only)
        stored_extra = (existing.extra if existing else {}) or {}
        merged_extra = {**_clean_redacted(stored_extra), **extra}

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
