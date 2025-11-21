from __future__ import annotations

from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from assistant.views import AssistantView
from bookings.views import BookingViewSet
from contacts.views import ContactViewSet, ContactGroupViewSet
from messaging.views import InboundMessageViewSet, OutboundMessageViewSet, EmailJobViewSet, EmailAttachmentViewSet, unsubscribe, TelegramOnboardingViewSet, TelegramOnboardWebhook, TelegramMessageViewSet
from monitoring.views import HealthcheckView, MetricsView, MonitoringSummaryView, SettingsView, MonitoringDetailView, MonitoringEventsView, MonitoringAlertsView
from organizations.views import MembershipViewSet
from templates_app.views import MessageTemplateViewSet
from messaging.webhooks import InboundWebhookView
from messaging.callbacks import ProviderCallbackView, SendGridEventView
from integrations.views import IntegrationListView, IntegrationConnectView, IntegrationDisconnectView
from integrations.test import IntegrationTestView
from billing.views import BillingLogViewSet

router = routers.DefaultRouter()
router.register(r"contacts", ContactViewSet, basename="contact")
router.register(r"contact-groups", ContactGroupViewSet, basename="contact-group")
router.register(r"templates", MessageTemplateViewSet, basename="template")
router.register(r"outbound", OutboundMessageViewSet, basename="outbound")
router.register(r"inbound", InboundMessageViewSet, basename="inbound")
router.register(r"email-jobs", EmailJobViewSet, basename="email-job")
router.register(r"email-attachments", EmailAttachmentViewSet, basename="email-attachment")
router.register(r"telegram/attachments", EmailAttachmentViewSet, basename="telegram-attachment")
router.register(r"bookings", BookingViewSet, basename="booking")
router.register(r"memberships", MembershipViewSet, basename="membership")
router.register(r"billing/logs", BillingLogViewSet, basename="billing-log")
router.register(r"telegram/onboarding", TelegramOnboardingViewSet, basename="telegram-onboarding")
router.register(r"telegram/messages", TelegramMessageViewSet, basename="telegram-messages")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/webhooks/<str:channel>/", InboundWebhookView.as_view(), name="inbound_webhook"),
    path("api/callbacks/<str:channel>/", ProviderCallbackView.as_view(), name="provider_callback"),
    path("api/callbacks/sendgrid/", SendGridEventView.as_view(), name="sendgrid_events"),
    path("api/webhooks/telegram/onboard/", TelegramOnboardWebhook.as_view(), name="telegram_onboard_webhook"),
    path("api/assistant/", AssistantView.as_view(), name="assistant"),
    path("unsubscribe/", unsubscribe, name="unsubscribe"),
    path("health/", HealthcheckView.as_view(), name="healthcheck"),
    path("api/metrics/", MetricsView.as_view(), name="metrics"),
    path("api/monitoring/summary/", MonitoringSummaryView.as_view(), name="monitoring-summary"),
    path("api/monitoring/details/", MonitoringDetailView.as_view(), name="monitoring-details"),
    path("api/monitoring/events/", MonitoringEventsView.as_view(), name="monitoring-events"),
    path("api/monitoring/alerts/", MonitoringAlertsView.as_view(), name="monitoring-alerts"),
    path("api/settings/", SettingsView.as_view(), name="settings"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/integrations/", IntegrationListView.as_view(), name="integrations"),
    path("api/integrations/<str:provider>/connect/", IntegrationConnectView.as_view(), name="integration-connect"),
    path("api/integrations/<str:provider>/", IntegrationDisconnectView.as_view(), name="integration-disconnect"),
    path("api/integrations/<str:provider>/test/", IntegrationTestView.as_view(), name="integration-test"),
]
