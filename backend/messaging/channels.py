from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class SendResult:
    success: bool
    provider_message_id: str | None = None
    error: str | None = None


class ChannelSender(Protocol):
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult: ...


class WhatsAppSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        # TODO: integrate WhatsApp Business API
        return SendResult(success=True, provider_message_id=f"wa-{to}")


class EmailSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        # TODO: integrate SES/SendGrid
        return SendResult(success=True, provider_message_id=f"em-{to}")


class TelegramSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        # TODO: integrate Telegram Bot API
        return SendResult(success=True, provider_message_id=f"tg-{to}")


class InstagramSender:
    def send(self, *, to: str, body: str, media_url: str | None = None) -> SendResult:
        # TODO: integrate Instagram scoped messaging
        return SendResult(success=True, provider_message_id=f"ig-{to}")


CHANNEL_SENDERS: dict[str, ChannelSender] = {
    "whatsapp": WhatsAppSender(),
    "email": EmailSender(),
    "telegram": TelegramSender(),
    "instagram": InstagramSender(),
}


def get_sender(channel: str) -> ChannelSender:
    try:
        return CHANNEL_SENDERS[channel]
    except KeyError as exc:
        raise ValueError(f"Unsupported channel: {channel}") from exc
