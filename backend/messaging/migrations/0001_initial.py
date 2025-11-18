from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("contacts", "0001_initial"),
        ("templates_app", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="OutboundMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel", models.CharField(max_length=32)),
                ("body", models.TextField()),
                ("variables", models.JSONField(blank=True, default=dict)),
                ("media_url", models.URLField(blank=True, null=True)),
                ("scheduled_for", models.DateTimeField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed"), ("retrying", "Retrying")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("error", models.TextField(blank=True, default="")),
                ("retry_count", models.PositiveIntegerField(default=0)),
                ("trace_id", models.CharField(blank=True, default="", max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "contact",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="outbound_messages",
                        to="contacts.contact",
                    ),
                ),
                (
                    "template",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="outbound_messages",
                        to="templates_app.messagetemplate",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="InboundMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel", models.CharField(max_length=32)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("media_url", models.URLField(blank=True, null=True)),
                ("received_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "contact",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="inbound_messages",
                        to="contacts.contact",
                    ),
                ),
            ],
            options={"ordering": ["-received_at"]},
        ),
    ]
