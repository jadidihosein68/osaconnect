from __future__ import annotations

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from contacts.models import Contact
from .models import InboundMessage


class InboundWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, channel: str):
        payload = request.data if isinstance(request.data, dict) else {}

        contact = self._match_contact(payload)
        inbound = InboundMessage.objects.create(
            contact=contact,
            channel=channel,
            payload=payload,
            media_url=payload.get("media_url"),
            received_at=timezone.now(),
        )
        self._process_opt_out(contact, payload)
        return Response({"id": inbound.id, "contact": contact.id if contact else None, "status": "logged"})

    def _match_contact(self, payload: dict):
        contact = None
        lookup_fields = {
            "phone_whatsapp": payload.get("phone") or payload.get("wa_id"),
            "email": payload.get("email"),
            "telegram_chat_id": payload.get("telegram_chat_id"),
            "instagram_scoped_id": payload.get("instagram_scoped_id"),
        }
        for field, value in lookup_fields.items():
            if value:
                contact = Contact.objects.filter(**{field: value}).first()
                if contact:
                    break
        return contact

    def _process_opt_out(self, contact: Contact | None, payload: dict) -> None:
        if not contact:
            return
        text = (payload.get("text") or payload.get("message") or "").strip().lower()
        opt_out_keywords = {"stop", "unsubscribe", "cancel", "optout", "opt-out"}
        if text and any(keyword in text for keyword in opt_out_keywords):
            contact.status = Contact.STATUS_UNSUBSCRIBED
            contact.save(update_fields=["status", "updated_at"])
