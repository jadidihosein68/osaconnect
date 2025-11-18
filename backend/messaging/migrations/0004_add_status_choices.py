from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0003_add_provider_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="outboundmessage",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("sent", "Sent"),
                    ("failed", "Failed"),
                    ("retrying", "Retrying"),
                    ("delivered", "Delivered"),
                    ("read", "Read"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
