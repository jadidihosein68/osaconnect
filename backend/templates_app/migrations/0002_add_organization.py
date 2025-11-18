from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


def seed_default_org(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    MessageTemplate = apps.get_model("templates_app", "MessageTemplate")
    org, _ = Organization.objects.get_or_create(name="Default Org")
    MessageTemplate.objects.filter(organization__isnull=True).update(organization=org)


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("templates_app", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="messagetemplate",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="templates",
                to="organizations.organization",
                null=True,
            ),
        ),
        migrations.RunPython(seed_default_org, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="messagetemplate",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="templates",
                to="organizations.organization",
                null=False,
            ),
        ),
    ]
