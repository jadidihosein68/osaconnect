from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0008_email_attachments"),
        ("contacts", "0003_contact_groups"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContactEngagement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel", models.CharField(max_length=32)),
                ("subject", models.CharField(blank=True, default="", max_length=255)),
                ("status", models.CharField(max_length=32)),
                ("error", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "contact",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="engagements", to="contacts.contact"),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
