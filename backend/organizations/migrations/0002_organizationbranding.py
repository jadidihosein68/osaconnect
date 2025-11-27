from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrganizationBranding",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company_name", models.CharField(blank=True, default="", max_length=255)),
                ("address", models.CharField(blank=True, default="", max_length=500)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                ("email", models.CharField(blank=True, default="", max_length=255)),
                ("logo", models.ImageField(blank=True, null=True, upload_to="branding/")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("organization", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="branding", to="organizations.organization")),
            ],
        ),
    ]
