from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0021_campaign_fields"),
        ("messaging", "0019_instagram_messages"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailjob",
            name="campaign",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="email_jobs",
                to="messaging.campaign",
            ),
        ),
        migrations.AddField(
            model_name="emailrecipient",
            name="read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
