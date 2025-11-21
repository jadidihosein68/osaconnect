from __future__ import annotations

from django.db import migrations, models


def clear_existing_defaults(apps, schema_editor):
    Template = apps.get_model("templates_app", "MessageTemplate")
    # reset all defaults to False to avoid multiple defaults per channel/org
    Template.objects.update(is_default=False)


class Migration(migrations.Migration):

    dependencies = [
        ("templates_app", "0003_add_template_approval"),
    ]

    operations = [
        migrations.AddField(
            model_name="messagetemplate",
            name="footer",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="messagetemplate",
            name="is_default",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="messagetemplate",
            index=models.Index(fields=["organization", "channel", "is_default"], name="template_default_idx"),
        ),
        migrations.RunPython(clear_existing_defaults, reverse_code=migrations.RunPython.noop),
    ]
