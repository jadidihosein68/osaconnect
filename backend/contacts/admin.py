from __future__ import annotations

from django.contrib import admin

from .models import Contact, IdentityConflict


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone_whatsapp", "status", "last_inbound_at", "last_outbound_at")
    search_fields = ("full_name", "email", "phone_whatsapp", "telegram_chat_id", "instagram_scoped_id")
    list_filter = ("status",)
    readonly_fields = ("created_at", "updated_at", "last_inbound_at", "last_outbound_at")


@admin.register(IdentityConflict)
class IdentityConflictAdmin(admin.ModelAdmin):
    list_display = ("contact", "field", "attempted_value", "created_at")
    search_fields = ("contact__full_name", "attempted_value")
    readonly_fields = ("created_at",)
