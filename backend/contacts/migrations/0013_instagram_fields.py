from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0012_contact_whatsapp_opt_in"),
    ]

    operations = [
        migrations.AddField(
            model_name="contact",
            name="instagram_user_id",
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="contact",
            name="instagram_opt_in",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="contact",
            name="instagram_blocked",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="contact",
            name="instagram_last_inbound_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contact",
            name="instagram_last_outbound_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
