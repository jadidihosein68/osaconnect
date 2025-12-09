from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("integrations", "0003_add_elevenlabs_provider"),
    ]

    operations = [
        migrations.AlterField(
            model_name="integration",
            name="provider",
            field=models.CharField(
                max_length=64,
                choices=[
                    ("whatsapp", "WhatsApp Business"),
                    ("sendgrid", "SendGrid"),
                    ("telegram", "Telegram Bot"),
                    ("instagram", "Instagram Messaging"),
                    ("google_calendar", "Google Calendar"),
                    ("elevenlabs", "ElevenLabs Voice Agent"),
                    ("openrouter", "OpenRouter"),
                ],
            ),
        ),
    ]
