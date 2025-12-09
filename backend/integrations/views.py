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
from django.core import signing
from django.utils import timezone
from django.http import HttpResponseRedirect

from organizations.utils import get_current_org
from organizations.permissions import IsOrgAdmin
from .models import Integration
from .serializers import IntegrationSerializer
from .utils import encrypt_token, decrypt_token

audit_logger = logging.getLogger("corbi.audit")
logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS = {choice[0] for choice in Integration.PROVIDERS}


def _validate_provider(provider: str) -> None:
    normalized = (provider or "").strip().lower()
    # keep any new providers (e.g., openrouter) accepted even if choices get stale
    allowed = SUPPORTED_PROVIDERS | {"openrouter"}
    if normalized not in allowed:
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

        # encrypt client_secret for google_calendar if provided
        if provider == "google_calendar":
            client_secret = extra.pop("client_secret", None)
            if client_secret:
                extra["client_secret_encrypted"] = encrypt_token(client_secret)
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


class GoogleOAuthStartView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def post(self, request):
        org = get_current_org(request)
        client_id = request.data.get("client_id")
        client_secret = request.data.get("client_secret")
        calendar_id = request.data.get("calendar_id")
        organizer_email = request.data.get("organizer_email")

        existing = Integration.objects.filter(organization=org, provider="google_calendar").first()
        existing_extra = existing.extra if existing else {}
        if not client_id:
            client_id = existing_extra.get("client_id") or decrypt_token(existing_extra.get("client_id_encrypted", "")) or existing_extra.get("client_id_encrypted")
        if not client_secret:
            client_secret = existing_extra.get("client_secret") or decrypt_token(existing_extra.get("client_secret_encrypted", "")) or existing_extra.get("client_secret_encrypted")
        if not calendar_id:
            calendar_id = existing_extra.get("calendar_id") or "primary"
        if not organizer_email:
            organizer_email = existing_extra.get("organizer_email")

        if not all([client_id, client_secret, organizer_email]):
            return Response({"status": "error", "ok": False, "message": "client_id, client_secret, organizer_email are required"},
                            status=status.HTTP_400_BAD_REQUEST)
        redirect_uri = settings.SITE_URL.rstrip("/") + settings.GOOGLE_OAUTH_REDIRECT_PATH
        state = signing.dumps({"org": org.id, "provider": "google_calendar"})
        scope = " ".join(getattr(settings, "GOOGLE_OAUTH_SCOPES", ["https://www.googleapis.com/auth/calendar.events"]))
        auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            f"response_type=code&client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scope}"
            "&access_type=offline&prompt=consent"
            f"&state={state}"
        )
        # Upsert integration (store plaintext for debugging as requested)
        Integration.objects.update_or_create(
            organization=org,
            provider="google_calendar",
            defaults={
                "is_active": False,
                "extra": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "calendar_id": calendar_id,
                    "organizer_email": organizer_email,
                },
            },
        )
        return Response({"status": "ok", "ok": True, "auth_url": auth_url})


class GoogleOAuthCallbackView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        code = request.GET.get("code")
        state = request.GET.get("state")
        if not code or not state:
            return Response({"status": "error", "ok": False, "message": "Missing code or state"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = signing.loads(state, max_age=600)
            org_id = payload.get("org")
        except Exception:
            return Response({"status": "error", "ok": False, "message": "Invalid state"}, status=status.HTTP_400_BAD_REQUEST)
        integration = Integration.objects.filter(organization_id=org_id, provider="google_calendar").first()
        if not integration:
            return Response({"status": "error", "ok": False, "message": "Integration not found"}, status=status.HTTP_404_NOT_FOUND)

        extra = integration.extra or {}
        client_id = extra.get("client_id") or decrypt_token(extra.get("client_id_encrypted", "")) or extra.get("client_id_encrypted")
        client_secret = extra.get("client_secret") or decrypt_token(extra.get("client_secret_encrypted", "")) or extra.get("client_secret_encrypted")
        redirect_uri = settings.SITE_URL.rstrip("/") + settings.GOOGLE_OAUTH_REDIRECT_PATH
        if not client_id or not client_secret:
            return Response({"status": "error", "ok": False, "message": "Missing client credentials"}, status=status.HTTP_400_BAD_REQUEST)
        import requests

        resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        if resp.status_code != 200:
            logger.warning("google.callback_failed", extra={"org": org_id, "status": resp.status_code, "body": resp.text[:200]})
            return Response({"status": "error", "ok": False, "message": "Token exchange failed"}, status=status.HTTP_400_BAD_REQUEST)
        data = resp.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)
        now_ts = timezone.now().timestamp()
        extra.update(
            {
                "access_token": access_token,
                "refresh_token": refresh_token or extra.get("refresh_token"),
                "access_expires_at": now_ts + int(expires_in),
            }
        )
        integration.extra = extra
        integration.is_active = True
        integration.save(update_fields=["extra", "is_active", "updated_at"])
        # redirect to frontend settings
        redirect_to = settings.FRONTEND_URL.rstrip("/") + "/settings?google=connected"
        return HttpResponseRedirect(redirect_to)

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

        existing = Integration.objects.filter(organization=org, provider=provider).first()

        def _clean_redacted(data: dict) -> dict:
            cleaned = {}
            for k, v in data.items():
                if isinstance(v, str) and "••••" in v:
                    continue
                cleaned[k] = v
            return cleaned

        extra = _clean_redacted(extra)

        reason = None
        # For Google, attempt refresh and use stored token if not provided
        if provider == "google_calendar" and not token:
            token, extra, reason = self._google_token(org, existing, extra)
            if not token:
                return Response(
                    {
                        "status": "error",
                        "ok": False,
                        "message": "Google Calendar not connected or tokens invalid. Please reconnect via OAuth."
                        if reason != "decrypt_failed"
                        else "Google Calendar tokens could not be decrypted. Ensure FERNET_KEY is unchanged and reconnect via OAuth.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        # For other providers, if no token provided, try stored token
        if provider != "google_calendar" and not token and existing:
            token = decrypt_token(existing.token_encrypted or "")
            stored_extra = existing.extra or {}
            merged = {**_clean_redacted(stored_extra), **extra}
            extra = merged

        # If we failed to decrypt Google secrets, surface that instead of a generic token error
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
            return Response({"status": "error", "ok": False, "message": "token is required"}, status=status.HTTP_400_BAD_REQUEST)
        if provider == "elevenlabs":
            return self._test_elevenlabs(token, extra, org, request)
        if provider == "google_calendar":
            return self._test_google_calendar(token, extra, org)
        if provider == "openrouter":
            return self._test_openrouter(token, extra, org)

        # Stub/placeholder success for other providers
        return Response({"status": "ok", "ok": True, "message": "Test succeeded."})

    def _google_token(self, org, integration, extra: dict):
        """
        Return a valid access token, refreshing if expired.
        """
        if not integration:
            return (None, extra, None)
        stored = integration.extra or {}
        # Drop any masked placeholders sent from UI
        cleaned = {k: v for k, v in stored.items() if not (isinstance(v, str) and "•" in v)}
        access_enc = cleaned.get("access_token_encrypted", "") or ""
        refresh_enc = cleaned.get("refresh_token_encrypted", "") or ""
        client_id_enc = cleaned.get("client_id_encrypted", "") or ""
        client_secret_enc = cleaned.get("client_secret_encrypted", "") or ""
        had_encrypted = bool(access_enc or refresh_enc or client_id_enc or client_secret_enc)

        # Plain tokens (no encryption as requested)
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
            # Merge non-secret fields for downstream use
            merged_extra = {**{k: v for k, v in cleaned.items() if k not in ["access_token_encrypted", "refresh_token_encrypted", "client_id_encrypted", "client_secret_encrypted", "access_expires_at"]}, **extra}
            reason = "invalid_tokens" if had_encrypted else None
            return (None, merged_extra, reason)
        # refresh if expired or missing access_token
        if (expires_at and now_ts >= float(expires_at) - 60) and refresh_token and client_id and client_secret:
            try:
                import requests

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
                    logger.warning("google.refresh_failed", extra={"org": org.id, "status": resp.status_code})
            except Exception:
                logger.exception("google.refresh_exception", extra={"org": org.id})
        # merge non-secret extras
        base_extra = {
            k: v
            for k, v in (integration.extra or {}).items()
            if k not in ["access_token_encrypted", "refresh_token_encrypted", "client_id_encrypted", "client_secret_encrypted", "access_expires_at"]
        }
        extra_merged = {**base_extra, **extra}
        return (access_token, extra_merged, None)

    def _test_google_calendar(self, token: str, extra: dict, org):
        organizer_email = extra.get("organizer_email")
        target_email = extra.get("target_email")
        calendar_id = extra.get("calendar_id", "primary")
        if not organizer_email:
            return Response({"status": "error", "ok": False, "message": "organizer_email is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not target_email:
            return Response({"status": "error", "ok": False, "message": "target_email is required"}, status=status.HTTP_400_BAD_REQUEST)
        import requests
        from datetime import datetime, timedelta, timezone as dt_timezone

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
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
            timeout=10,
        )
        if resp.status_code == 200 or resp.status_code == 201:
            data = resp.json()
            return Response(
                {
                    "status": "ok",
                    "ok": True,
                    "message": f"Test event created for {target_email}",
                    "event_id": data.get("id"),
                }
            )
        return Response(
            {"status": "error", "ok": False, "message": f"Google status {resp.status_code}: {resp.text[:200]}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

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

    def _test_openrouter(self, token: str, extra: dict, org):
        """
        Validate OpenRouter API key using OpenAI SDK hitting OpenRouter base_url.
        """
        from openai import OpenAI

        base_url = getattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        try:
            client = OpenAI(base_url=base_url, api_key=token)
            resp = client.models.list()
            count = len(getattr(resp, "data", []) or [])
            return Response({"status": "ok", "ok": True, "message": f"OpenRouter key valid; models available: {count}"})
        except Exception as exc:  # noqa: BLE001
            logger.exception("openrouter.test.failed", extra={"org": org.id})
            return Response({"status": "error", "ok": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
