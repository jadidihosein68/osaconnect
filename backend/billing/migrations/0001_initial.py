from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="BillingLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("timestamp", models.DateTimeField()),
                ("feature_tag", models.CharField(max_length=100)),
                ("model", models.CharField(max_length=150)),
                ("mode", models.CharField(blank=True, max_length=50)),
                ("tokens_prompt", models.IntegerField(blank=True, null=True)),
                ("tokens_completion", models.IntegerField(blank=True, null=True)),
                ("tokens_total", models.IntegerField(blank=True, null=True)),
                ("raw_cost", models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True)),
                ("billable_cost", models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True)),
                ("currency", models.CharField(default="USD", max_length=10)),
                ("request_id", models.CharField(blank=True, max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[("sent", "Sent"), ("succeeded", "Succeeded"), ("failed", "Failed"), ("canceled", "Canceled")],
                        default="sent",
                        max_length=20,
                    ),
                ),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "organization",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="billing_logs", to="organizations.organization"),
                ),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-timestamp", "-id"]},
        ),
        migrations.AddIndex(
            model_name="billinglog",
            index=models.Index(fields=["organization", "feature_tag", "timestamp"], name="billinglog_organiza_621753_idx"),
        ),
        migrations.AddIndex(
            model_name="billinglog",
            index=models.Index(fields=["request_id"], name="billinglog_request_79b6e5_idx"),
        ),
    ]
