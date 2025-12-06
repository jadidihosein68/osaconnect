from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("contacts", "0015_remove_contact_uniq_contact_email_per_org_and_more"),
        ("bookings", "0005_alter_booking_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="meeting_type",
            field=models.CharField(
                choices=[("custom", "Custom"), ("room", "Room/Device")],
                default="custom",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="booking",
            name="contact",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="bookings",
                to="contacts.contact",
            ),
        ),
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("confirmed", "Confirmed"),
                    ("cancelled", "Cancelled"),
                    ("rescheduled", "Rescheduled"),
                ],
                default="confirmed",
                max_length=20,
            ),
        ),
    ]
