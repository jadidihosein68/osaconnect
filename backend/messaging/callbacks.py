from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OutboundMessage, Suppression


class ProviderCallbackView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, channel: str):
        payload = request.data if isinstance(request.data, dict) else {}
        provider_message_id = payload.get("message_id") or payload.get("id")
        status = (payload.get("status") or "").lower()

        if not provider_message_id or not status:
            return Response({"status": "ignored", "reason": "missing message_id or status"}, status=400)

        msg = OutboundMessage.objects.filter(provider_message_id=provider_message_id).first()
        if not msg:
            return Response({"status": "ignored", "reason": "message not found"}, status=202)

        if status in ("delivered", "read"):
            msg.status = OutboundMessage.STATUS_DELIVERED if status == "delivered" else OutboundMessage.STATUS_READ
            msg.provider_status = status
            msg.save(update_fields=["status", "provider_status", "updated_at"])
            return Response({"status": "updated"})

        if status in ("failed", "bounced"):
            msg.status = OutboundMessage.STATUS_FAILED
            msg.provider_status = status
            msg.error = payload.get("error") or msg.error
            msg.save(update_fields=["status", "provider_status", "error", "updated_at"])
            # record suppression on hard failure/bounce
            identifier = (
                msg.contact.phone_whatsapp
                or msg.contact.email
                or msg.contact.telegram_chat_id
                or msg.contact.instagram_scoped_id
                or ""
            )
            if identifier:
                Suppression.objects.get_or_create(
                    organization=msg.organization,
                    channel=msg.channel,
                    identifier=identifier,
                    defaults={"reason": status},
                )
            return Response({"status": "failed"})

        return Response({"status": "ignored", "reason": "unhandled status"}, status=202)
