from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("contacts", "0010_telegram_fields"),
        ("messaging", "0013_emailjob_template_footer"),
    ]

    operations = [
        migrations.CreateModel(
            name="TelegramInviteToken",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("verification_token", models.CharField(max_length=255, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("USED", "Used"), ("EXPIRED", "Expired")], default="PENDING", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("contact", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="telegram_tokens", to="contacts.contact")),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="telegram_tokens", to="organizations.organization")),
            ],
            options={},
        ),
        migrations.AddIndex(
            model_name="telegraminvitetoken",
            index=models.Index(fields=["organization", "contact", "status"], name="telegram_token_idx"),
        ),
    ]
