from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("messaging", "0004_add_status_choices"),
    ]

    operations = [
        migrations.CreateModel(
            name="Suppression",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel", models.CharField(max_length=32)),
                ("identifier", models.CharField(max_length=255)),
                ("reason", models.CharField(max_length=255, blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="suppressions",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={"unique_together": {("organization", "channel", "identifier")}},
        ),
    ]
