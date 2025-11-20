from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .views import BillingLogViewSet

router = DefaultRouter()
router.register(r"billing/logs", BillingLogViewSet, basename="billing-log")
urlpatterns = router.urls
