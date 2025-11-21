from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from twilio.rest import Client as TwilioClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from telegram import Bot
import asyncio
import requests
import uuid


@dataclass
class SendResult:
    success: bool
    provider_message_id: str | None = None
    error: str | None = None


class ChannelSender(Protocol):
    def send(self, *, to: str, body: str, media_url: str | None = None, credentials: dict | None = None) -> SendResult: ...


class WhatsAppSender:
    def send(self, *, to: str, body: str, media_url: str | None = None, credentials: dict | None = None) -> SendResult:
        credentials = credentials or {}
        token = credentials.get("token")
        extra = credentials.get("extra") or {}
        account_sid = extra.get("account_sid")
        from_whatsapp = extra.get("from_whatsapp")
        if not token or not account_sid or not from_whatsapp:
            return SendResult(success=False, error="WhatsApp integration missing account_sid/from_whatsapp/token")
        if not to.startswith("+"):
            return SendResult(success=False, error="Invalid WhatsApp number")
        try:
            client = TwilioClient(account_sid, token)
            msg = client.messages.create(
                from_=f"whatsapp:{from_whatsapp}",
                to=f"whatsapp:{to}",
                body=body,
            )
            return SendResult(success=True, provider_message_id=msg.sid)
        except Exception as exc:
            return SendResult(success=False, error=str(exc))


class EmailSender:
    def send(
        self,
        *,
        to: str,
        body: str,
        media_url: str | None = None,
        credentials: dict | None = None,
        attachments: list | None = None,
    ) -> SendResult:
        credentials = credentials or {}
        token = credentials.get("token")
        extra = credentials.get("extra") or {}
        from_email = extra.get("from_email")
        subject = extra.get("subject") or "Corbi Notification"
        if not token or not from_email:
            return SendResult(success=False, error="SendGrid integration missing API key or from_email")
        if "@" not in to:
            return SendResult(success=False, error="Invalid email address")
        # Prefer HTML content (for unsubscribe button) but keep plain text fallback.
        html_body = body
        plain_body = body
        try:
            sg = SendGridAPIClient(api_key=token)
            mail = Mail(
                from_email=Email(from_email),
                to_emails=To(to),
                subject=subject,
                plain_text_content=Content("text/plain", plain_body),
                html_content=Content("text/html", html_body),
            ).get()
            if attachments:
                mail["attachments"] = attachments
            resp = sg.client.mail.send.post(request_body=mail)
            success = resp.status_code in (200, 202)
            provider_id = None
            if hasattr(resp, "headers") and resp.headers:
                provider_id = resp.headers.get("X-Message-Id") or resp.headers.get("x-message-id")
            if not provider_id:
                provider_id = str(uuid.uuid4())
            return SendResult(success=success, provider_message_id=provider_id, error=None if success else resp.body)
        except Exception as exc:
            return SendResult(success=False, error=str(exc))


class TelegramSender:
    def send(
        self,
        *,
        to: str,
        body: str = "",
        media_path: str | None = None,
        media_type: str | None = None,
        credentials: dict | None = None,
        caption: str | None = None,
    ) -> SendResult:
        """
        Send a Telegram message. If media_path is provided, will send as document/photo.
        media_type: "photo" or "document" determines method.
        """
        credentials = credentials or {}
        token = credentials.get("token")
        extra = credentials.get("extra") or {}
        chat_id = extra.get("chat_id") or to
        if not token or not chat_id:
            return SendResult(success=False, error="Telegram integration missing token/chat_id")
        if media_path:
            try:
                # ensure file exists/readable before async call
                open(media_path, "rb").close()
            except Exception as exc:  # noqa: BLE001
                return SendResult(success=False, error=f"Attachment not readable: {exc}")
        async def _send_text():
            bot = Bot(token=token)
            return await bot.send_message(chat_id=chat_id, text=body)

        async def _send_photo():
            bot = Bot(token=token)
            with open(media_path, "rb") as fh:
                return await bot.send_photo(chat_id=chat_id, photo=fh, caption=caption or body or None)

        async def _send_document():
            bot = Bot(token=token)
            with open(media_path, "rb") as fh:
                return await bot.send_document(chat_id=chat_id, document=fh, caption=caption or body or None)

        async def _runner():
            if media_path:
                if media_type == "photo":
                    return await _send_photo()
                return await _send_document()
            return await _send_text()

        # light retry/backoff for transient network timeouts
        last_err: str | None = None
        for attempt in range(3):
            try:
                message = asyncio.run(asyncio.wait_for(_runner(), timeout=10))
                return SendResult(success=True, provider_message_id=str(getattr(message, "message_id", "")))
            except Exception as exc:  # noqa: BLE001
                last_err = str(exc)
                if attempt < 2:
                    # short sleep before retry
                    try:
                        asyncio.run(asyncio.sleep(0.5))
                    except Exception:
                        pass
                    continue
                return SendResult(success=False, error=last_err or "send failed")


class InstagramSender:
    def send(self, *, to: str, body: str, media_url: str | None = None, credentials: dict | None = None) -> SendResult:
        credentials = credentials or {}
        token = credentials.get("token")
        extra = credentials.get("extra") or {}
        business_id = extra.get("instagram_scoped_id")
        if not token or not business_id:
            return SendResult(success=False, error="Instagram integration missing scoped id or token")
        if not to:
            return SendResult(success=False, error="Recipient instagram_scoped_id missing")
        try:
            resp = requests.post(
                f"https://graph.facebook.com/v20.0/{business_id}/messages",
                params={"access_token": token},
                json={"recipient": {"id": to}, "message": {"text": body}},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                return SendResult(success=True, provider_message_id=str(data.get("id")))
            return SendResult(success=False, error=f"Instagram status {resp.status_code}: {resp.text}")
        except Exception as exc:
            return SendResult(success=False, error=str(exc))


CHANNEL_SENDERS: dict[str, ChannelSender] = {
    "whatsapp": WhatsAppSender(),
    "email": EmailSender(),
    "telegram": TelegramSender(),
    "instagram": InstagramSender(),
}


def get_sender(channel: str, organization=None) -> ChannelSender:
    try:
        return CHANNEL_SENDERS[channel]
    except KeyError as exc:
        raise ValueError(f"Unsupported channel: {channel}") from exc
