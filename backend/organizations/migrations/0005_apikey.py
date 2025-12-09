from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


def create_apikey_model(apps, schema_editor):
    # noop placeholder for potential data migrations
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_userprofile_display_name"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="ApiKey",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("key_hashed", models.CharField(max_length=128, unique=True)),
                ("prefix", models.CharField(db_index=True, max_length=32)),
                ("scopes", models.JSONField(blank=True, default=list)),
                (
                    "status",
                    models.CharField(
                        choices=[("active", "Active"), ("revoked", "Revoked")],
                        default="active",
                        max_length=16,
                    ),
                ),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="api_keys",
                        to="organizations.organization",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="api_keys",
                        to="auth.user",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"], "unique_together": {("organization", "name")}},
        ),
    ]
