from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("contacts", "0013_instagram_fields"),
        ("messaging", "0019_instagram_messages"),
        ("templates_app", "0006_rename_template_default_idx_templates_a_organiz_8e2b87_idx"),
    ]

    operations = [
        migrations.CreateModel(
            name="Campaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("channel", models.CharField(max_length=32)),
                ("target_count", models.PositiveIntegerField(default=0)),
                ("sent_count", models.PositiveIntegerField(default=0)),
                ("delivered_count", models.PositiveIntegerField(default=0)),
                ("read_count", models.PositiveIntegerField(default=0)),
                ("failed_count", models.PositiveIntegerField(default=0)),
                ("unsubscribed_count", models.PositiveIntegerField(default=0)),
                ("estimated_cost", models.DecimalField(decimal_places=4, default=0, max_digits=10)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("queued", "Queued"), ("sending", "Sending"), ("completed", "Completed"), ("failed", "Failed")], default="draft", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="campaigns", to="organizations.organization")),
                ("template", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="templates_app.messagetemplate")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="CampaignRecipient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("queued", "Queued"), ("sent", "Sent"), ("delivered", "Delivered"), ("read", "Read"), ("failed", "Failed"), ("unsubscribed", "Unsubscribed")], default="queued", max_length=16)),
                ("provider_message_id", models.CharField(blank=True, default="", max_length=128)),
                ("error_message", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("campaign", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipients", to="messaging.campaign")),
                ("contact", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="campaign_recipients", to="contacts.contact")),
            ],
        ),
    ]
