from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0011_emailrecipient_provider_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailrecipient",
            name="signed_token",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
