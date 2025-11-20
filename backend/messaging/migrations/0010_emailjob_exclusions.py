from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0009_contact_engagement"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailjob",
            name="exclusions",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
