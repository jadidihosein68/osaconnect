from __future__ import annotations

from django.contrib import admin

from .models import Booking, Resource, BookingChangeLog


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("title", "contact", "resource", "start_time", "end_time", "status")
    list_filter = ("status", "resource")
    search_fields = ("title", "contact__full_name", "contact__email", "resource__name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("name", "resource_type", "organization", "is_active", "gcal_calendar_id")
    list_filter = ("resource_type", "is_active")
    search_fields = ("name", "gcal_calendar_id")


@admin.register(BookingChangeLog)
class BookingChangeLogAdmin(admin.ModelAdmin):
    list_display = ("booking", "change_type", "actor_type", "created_at")
    list_filter = ("change_type",)
    search_fields = ("booking__title", "actor_type")
