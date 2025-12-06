from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0004_userprofile_display_name"),
        ("bookings", "0003_booking_owner"),
    ]

    operations = [
        migrations.CreateModel(
            name="Resource",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=180)),
                ("resource_type", models.CharField(choices=[("room", "Room"), ("device", "Device")], default="room", max_length=20)),
                ("capacity", models.PositiveIntegerField(blank=True, null=True)),
                ("description", models.TextField(blank=True, default="")),
                ("gcal_calendar_id", models.CharField(blank=True, default="", max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "organization",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="resources", to="organizations.organization"),
                ),
            ],
            options={
                "ordering": ["name"],
                "unique_together": {("organization", "name")},
            },
        ),
        migrations.AddField(
            model_name="booking",
            name="attendees",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="booking",
            name="gcal_calendar_id",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="booking",
            name="gcal_etag",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="booking",
            name="gcal_event_id",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="booking",
            name="gcal_ical_uid",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="booking",
            name="gcal_sequence",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="hangout_link",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="booking",
            name="organizer_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="booking",
            name="recurrence",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="booking",
            name="resource",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="bookings", to="bookings.resource"
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="timezone",
            field=models.CharField(blank=True, default="UTC", max_length=64),
        ),
        migrations.CreateModel(
            name="BookingChangeLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("change_type", models.CharField(max_length=32)),
                ("actor_type", models.CharField(blank=True, default="", max_length=32)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("booking", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="change_logs", to="bookings.booking")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
