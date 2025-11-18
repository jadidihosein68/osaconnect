from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Integration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(choices=[("whatsapp", "WhatsApp Business"), ("sendgrid", "SendGrid"), ("telegram", "Telegram Bot"), ("instagram", "Instagram Messaging"), ("google_calendar", "Google Calendar")], max_length=64)),
                ("token_encrypted", models.TextField(blank=True, default="")),
                ("extra", models.JSONField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="integrations", to="organizations.organization")),
            ],
            options={
                "ordering": ["provider"],
                "unique_together": {("organization", "provider")},
            },
        ),
    ]
