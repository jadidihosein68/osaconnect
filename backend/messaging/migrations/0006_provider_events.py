from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("messaging", "0005_add_suppression"),
    ]

    operations = [
        migrations.AddField(
            model_name="outboundmessage",
            name="delivered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="outboundmessage",
            name="failed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="outboundmessage",
            name="sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="ProviderEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider_message_id", models.CharField(blank=True, default="", max_length=128)),
                ("channel", models.CharField(max_length=32)),
                ("status", models.CharField(max_length=64)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("latency_ms", models.PositiveIntegerField(default=0)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="provider_events", to="organizations.organization")),
                ("outbound", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="provider_events", to="messaging.outboundmessage")),
            ],
            options={
                "ordering": ["-received_at"],
            },
        ),
    ]
