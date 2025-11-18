from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0002_add_organization"),
    ]

    operations = [
        migrations.AddField(
            model_name="outboundmessage",
            name="provider_message_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="outboundmessage",
            name="provider_status",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
