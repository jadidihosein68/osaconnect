from __future__ import annotations

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("bookings", "0002_add_organization"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="created_by_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_bookings",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
