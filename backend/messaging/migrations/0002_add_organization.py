from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


def seed_default_org(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    Contact = apps.get_model("contacts", "Contact")
    OutboundMessage = apps.get_model("messaging", "OutboundMessage")
    InboundMessage = apps.get_model("messaging", "InboundMessage")
    org, _ = Organization.objects.get_or_create(name="Default Org")
    # infer org from contact if available
    for model in (OutboundMessage, InboundMessage):
        objs = model.objects.filter(organization__isnull=True)
        for obj in objs.select_related("contact"):
            obj.organization = getattr(obj, "contact", None).organization if getattr(obj, "contact", None) else org
            obj.save(update_fields=["organization"])


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("messaging", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="inboundmessage",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="inbound_messages",
                to="organizations.organization",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="outboundmessage",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="outbound_messages",
                to="organizations.organization",
                null=True,
            ),
        ),
        migrations.RunPython(seed_default_org, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="inboundmessage",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="inbound_messages",
                to="organizations.organization",
                null=False,
            ),
        ),
        migrations.AlterField(
            model_name="outboundmessage",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="outbound_messages",
                to="organizations.organization",
                null=False,
            ),
        ),
    ]
