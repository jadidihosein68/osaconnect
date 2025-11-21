from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0003_contact_groups"),
    ]

    operations = [
        migrations.AddField(
            model_name="contact",
            name="telegram_invited",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="contact",
            name="telegram_last_invite_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contact",
            name="telegram_linked",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="contact",
            name="telegram_onboarded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contact",
            name="telegram_status",
            field=models.CharField(
                choices=[
                    ("not_linked", "Not Linked"),
                    ("invited", "Invited"),
                    ("onboarded", "Onboarded"),
                    ("blocked", "Blocked"),
                ],
                default="not_linked",
                max_length=32,
            ),
        ),
    ]
