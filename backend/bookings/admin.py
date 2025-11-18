from __future__ import annotations

from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("title", "contact", "start_time", "end_time", "status")
    list_filter = ("status",)
    search_fields = ("title", "contact__full_name", "contact__email")
    readonly_fields = ("created_at", "updated_at")
