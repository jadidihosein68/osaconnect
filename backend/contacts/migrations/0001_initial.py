from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Contact",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=255)),
                ("phone_whatsapp", models.CharField(blank=True, max_length=32, null=True, unique=True)),
                ("email", models.EmailField(blank=True, max_length=254, null=True, unique=True)),
                ("telegram_chat_id", models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ("instagram_scoped_id", models.CharField(blank=True, max_length=64, null=True, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("blocked", "Blocked"),
                            ("unsubscribed", "Unsubscribed"),
                            ("bounced", "Bounced"),
                        ],
                        default="active",
                        max_length=20,
                    ),
                ),
                ("segments", models.JSONField(blank=True, default=list)),
                ("tags", models.JSONField(blank=True, default=list)),
                ("notes", models.TextField(blank=True, default="")),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("last_inbound_at", models.DateTimeField(blank=True, null=True)),
                ("last_outbound_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="IdentityConflict",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("field", models.CharField(max_length=64)),
                ("attempted_value", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "contact",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="conflicts", to="contacts.contact"
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
