from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("contacts", "0013_instagram_fields"),
        ("messaging", "0018_alter_telegrammessage_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="InstagramMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("direction", models.CharField(choices=[("INBOUND", "Inbound"), ("OUTBOUND", "Outbound")], max_length=16)),
                ("message_type", models.CharField(choices=[("TEXT", "Text"), ("IMAGE", "Image"), ("DOCUMENT", "Document"), ("OTHER", "Other")], default="TEXT", max_length=16)),
                ("text", models.TextField(blank=True, default="")),
                ("attachments", models.JSONField(blank=True, default=list)),
                ("provider_message_id", models.CharField(blank=True, default="", max_length=128)),
                ("status", models.CharField(choices=[("SENT", "Sent"), ("FAILED", "Failed"), ("RECEIVED", "Received")], default="SENT", max_length=16)),
                ("error_reason", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("contact", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="instagram_messages", to="contacts.contact")),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="instagram_messages", to="organizations.organization")),
            ],
        ),
        migrations.AddIndex(
            model_name="instagrammessage",
            index=models.Index(fields=["organization", "contact", "created_at"], name="ig_msg_org_contact_idx"),
        ),
    ]
