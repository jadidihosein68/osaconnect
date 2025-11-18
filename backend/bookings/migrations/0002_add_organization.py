from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


def seed_default_org(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    Booking = apps.get_model("bookings", "Booking")
    org, _ = Organization.objects.get_or_create(name="Default Org")
    for booking in Booking.objects.filter(organization__isnull=True).select_related("contact"):
        booking.organization = booking.contact.organization if booking.contact else org
        booking.save(update_fields=["organization"])


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("bookings", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bookings",
                to="organizations.organization",
                null=True,
            ),
        ),
        migrations.RunPython(seed_default_org, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="booking",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bookings",
                to="organizations.organization",
                null=False,
            ),
        ),
    ]
