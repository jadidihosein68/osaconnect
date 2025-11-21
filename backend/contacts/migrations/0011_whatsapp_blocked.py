from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0010_telegram_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="contact",
            name="whatsapp_blocked",
            field=models.BooleanField(default=False),
        ),
    ]
