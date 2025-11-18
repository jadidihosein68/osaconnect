from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


def seed_default_org(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    Contact = apps.get_model("contacts", "Contact")
    org, _ = Organization.objects.get_or_create(name="Default Org")
    Contact.objects.filter(organization__isnull=True).update(organization=org)


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("contacts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="contact",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="contacts",
                to="organizations.organization",
                null=True,
            ),
        ),
        migrations.RunPython(seed_default_org, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="contact",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="contacts",
                to="organizations.organization",
                null=False,
            ),
        ),
    ]
