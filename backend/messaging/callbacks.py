from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OutboundMessage


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
            return Response({"status": "failed"})

        return Response({"status": "ignored", "reason": "unhandled status"}, status=202)
