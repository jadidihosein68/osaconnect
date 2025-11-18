from __future__ import annotations

from django.contrib import admin

from .models import MessageTemplate


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "channel", "approved", "updated_at")
    search_fields = ("name", "channel", "category")
    list_filter = ("channel", "approved")
    readonly_fields = ("created_at", "updated_at")
