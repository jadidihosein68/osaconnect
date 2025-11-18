from __future__ import annotations

from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from assistant.views import AssistantView
from bookings.views import BookingViewSet
from contacts.views import ContactViewSet
from messaging.views import InboundMessageViewSet, OutboundMessageViewSet
from monitoring.views import HealthcheckView, MetricsView
from templates_app.views import MessageTemplateViewSet
from messaging.webhooks import InboundWebhookView

router = routers.DefaultRouter()
router.register(r"contacts", ContactViewSet, basename="contact")
router.register(r"templates", MessageTemplateViewSet, basename="template")
router.register(r"outbound", OutboundMessageViewSet, basename="outbound")
router.register(r"inbound", InboundMessageViewSet, basename="inbound")
router.register(r"bookings", BookingViewSet, basename="booking")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/webhooks/<str:channel>/", InboundWebhookView.as_view(), name="inbound_webhook"),
    path("api/assistant/", AssistantView.as_view(), name="assistant"),
    path("health/", HealthcheckView.as_view(), name="healthcheck"),
    path("metrics/", MetricsView.as_view(), name="metrics"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
