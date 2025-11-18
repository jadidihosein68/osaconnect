from __future__ import annotations

from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

from assistant.views import AssistantView
from bookings.views import BookingViewSet
from contacts.views import ContactViewSet
from messaging.views import InboundMessageViewSet, OutboundMessageViewSet
from monitoring.views import HealthcheckView
from templates_app.views import MessageTemplateViewSet

router = routers.DefaultRouter()
router.register(r"contacts", ContactViewSet, basename="contact")
router.register(r"templates", MessageTemplateViewSet, basename="template")
router.register(r"outbound", OutboundMessageViewSet, basename="outbound")
router.register(r"inbound", InboundMessageViewSet, basename="inbound")
router.register(r"bookings", BookingViewSet, basename="booking")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/assistant/", AssistantView.as_view(), name="assistant"),
    path("health/", HealthcheckView.as_view(), name="healthcheck"),
]
