from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MessageTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, unique=True)),
                (
                    "channel",
                    models.CharField(
                        choices=[
                            ("whatsapp", "WhatsApp"),
                            ("email", "Email"),
                            ("telegram", "Telegram"),
                            ("instagram", "Instagram"),
                        ],
                        max_length=32,
                    ),
                ),
                ("language", models.CharField(default="en", max_length=10)),
                ("subject", models.CharField(blank=True, default="", max_length=180)),
                ("body", models.TextField()),
                ("variables", models.JSONField(blank=True, default=list)),
                ("category", models.CharField(blank=True, default="", max_length=64)),
                ("approved", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["name"]},
        ),
    ]
