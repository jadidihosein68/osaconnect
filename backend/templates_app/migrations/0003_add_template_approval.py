from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("templates_app", "0002_add_organization"),
    ]

    operations = [
        migrations.AddField(
            model_name="messagetemplate",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="messagetemplate",
            name="approved_by",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
    ]
