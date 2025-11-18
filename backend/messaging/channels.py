from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from django.conf import settings


@dataclass
class SendResult:
    success: bool
    provider_message_id: str | None = None
    error: str | None = None


class ChannelSender(Protocol):
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult: ...


class WhatsAppSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        token = getattr(settings, "WHATSAPP_API_TOKEN", "")
        if not token:
            return SendResult(success=False, error="WHATSAPP_API_TOKEN missing")
        if not to.startswith("+"):
            return SendResult(success=False, error="Invalid WhatsApp number")
        # TODO: swap for real WhatsApp Business API call
        return SendResult(success=True, provider_message_id=f"wa-{to}")


class EmailSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        api_key = getattr(settings, "EMAIL_API_KEY", "")
        if not api_key:
            return SendResult(success=False, error="EMAIL_API_KEY missing")
        if "@" not in to:
            return SendResult(success=False, error="Invalid email address")
        # TODO: swap for real email provider integration
        return SendResult(success=True, provider_message_id=f"em-{to}")


class TelegramSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
        if not bot_token:
            return SendResult(success=False, error="TELEGRAM_BOT_TOKEN missing")
        # TODO: swap for real Telegram Bot API call
        return SendResult(success=True, provider_message_id=f"tg-{to}")


class InstagramSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        token = getattr(settings, "INSTAGRAM_APP_TOKEN", "")
        if not token:
            return SendResult(success=False, error="INSTAGRAM_APP_TOKEN missing")
        # TODO: swap for Instagram scoped messaging implementation
        return SendResult(success=True, provider_message_id=f"ig-{to}")


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
