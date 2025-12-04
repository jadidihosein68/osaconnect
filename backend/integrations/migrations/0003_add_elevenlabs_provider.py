from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("integrations", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="integration",
            name="provider",
            field=models.CharField(
                choices=[
                    ("whatsapp", "WhatsApp Business"),
                    ("sendgrid", "SendGrid"),
                    ("telegram", "Telegram Bot"),
                    ("instagram", "Instagram Messaging"),
                    ("google_calendar", "Google Calendar"),
                    ("elevenlabs", "ElevenLabs Voice Agent"),
                ],
                max_length=64,
            ),
        ),
    ]
