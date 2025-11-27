from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("organizations", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("type", models.CharField(choices=[("SYSTEM", "System"), ("CAMPAIGN", "Campaign"), ("OUTBOUND", "Outbound"), ("INBOUND", "Inbound"), ("BOOKINGS", "Bookings"), ("INTEGRATION", "Integration"), ("BILLING", "Billing"), ("MONITORING", "Monitoring")], default="SYSTEM", max_length=32)),
                ("severity", models.CharField(choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("CRITICAL", "Critical")], default="LOW", max_length=16)),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField(blank=True)),
                ("target_url", models.CharField(blank=True, max_length=500, null=True)),
                ("data", models.JSONField(blank=True, default=dict)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to="organizations.organization")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="NotificationRecipient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("notification", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipients", to="notifications.notification")),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_recipients", to="organizations.organization")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_recipients", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["organization", "created_at"], name="notifications_org_created_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["organization", "type"], name="notifications_org_type_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["organization", "severity"], name="notifications_org_sev_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationrecipient",
            index=models.Index(fields=["organization", "user", "read_at", "created_at"], name="notirec_org_user_read_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationrecipient",
            index=models.Index(fields=["organization", "user", "read_at"], name="notirec_org_user_read2_idx"),
        ),
    ]
