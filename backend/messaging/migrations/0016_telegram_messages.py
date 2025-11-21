from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("contacts", "0010_telegram_fields"),
        ("messaging", "0015_alter_telegraminvitetoken_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="TelegramMessage",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("chat_id", models.CharField(max_length=64)),
                ("direction", models.CharField(choices=[("INBOUND", "Inbound"), ("OUTBOUND", "Outbound")], max_length=16)),
                ("message_type", models.CharField(choices=[("TEXT", "Text"), ("PHOTO", "Photo"), ("DOCUMENT", "Document"), ("VIDEO", "Video"), ("OTHER", "Other")], default="TEXT", max_length=16)),
                ("text", models.TextField(blank=True, default="")),
                ("attachments", models.JSONField(blank=True, default=list)),
                ("telegram_message_id", models.CharField(blank=True, default="", max_length=128)),
                ("status", models.CharField(blank=True, default="", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("contact", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="telegram_messages", to="contacts.contact")),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="telegram_messages", to="organizations.organization")),
            ],
        ),
        migrations.AddIndex(
            model_name="telegrammessage",
            index=models.Index(fields=["organization", "contact", "chat_id", "created_at"], name="tgmsg_org_contact_idx"),
        ),
    ]
