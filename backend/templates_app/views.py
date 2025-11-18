from __future__ import annotations

from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import MessageTemplate
from .serializers import MessageTemplateSerializer


class MessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "channel", "category"]

    @action(detail=True, methods=["post"])
    def render(self, request, pk=None):
        template = self.get_object()
        data = request.data or {}
        rendered = template.render(data)
        return Response({"rendered": rendered})
