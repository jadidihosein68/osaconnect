from __future__ import annotations

from django.contrib import admin

from .models import InboundMessage, OutboundMessage


@admin.register(OutboundMessage)
class OutboundMessageAdmin(admin.ModelAdmin):
    list_display = ("contact", "channel", "status", "scheduled_for", "retry_count", "trace_id", "updated_at")
    list_filter = ("channel", "status")
    search_fields = ("contact__full_name", "contact__email", "trace_id")
    readonly_fields = ("created_at", "updated_at")


@admin.register(InboundMessage)
class InboundMessageAdmin(admin.ModelAdmin):
    list_display = ("contact", "channel", "received_at")
    list_filter = ("channel",)
    search_fields = ("contact__full_name", "contact__email")
    readonly_fields = ("created_at",)
