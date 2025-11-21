from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("contacts", "0011_whatsapp_blocked"),
        ("messaging", "0016_telegram_messages"),
    ]

    operations = [
        migrations.CreateModel(
            name="WhatsAppMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("direction", models.CharField(choices=[("INBOUND", "Inbound"), ("OUTBOUND", "Outbound")], max_length=16)),
                ("message_type", models.CharField(choices=[("TEXT", "Text"), ("IMAGE", "Image"), ("DOCUMENT", "Document"), ("AUDIO", "Audio"), ("VIDEO", "Video"), ("OTHER", "Other")], default="TEXT", max_length=16)),
                ("text", models.TextField(blank=True, default="")),
                ("attachments", models.JSONField(blank=True, default=list)),
                ("twilio_message_sid", models.CharField(blank=True, default="", max_length=128)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("SENT", "Sent"), ("DELIVERED", "Delivered"), ("FAILED", "Failed"), ("RECEIVED", "Received")], default="PENDING", max_length=16)),
                ("error_reason", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("contact", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="whatsapp_messages", to="contacts.contact")),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="whatsapp_messages", to="organizations.organization")),
            ],
        ),
        migrations.AddIndex(
            model_name="whatsappmessage",
            index=models.Index(fields=["organization", "contact", "created_at"], name="wa_msg_org_contact_idx"),
        ),
    ]
