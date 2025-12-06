from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0006_meeting_type_contact_nullable"),
    ]

    operations = [
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
                default="pending",
                max_length=20,
            ),
        ),
    ]
