from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0010_emailjob_exclusions"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailrecipient",
            name="provider_message_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
