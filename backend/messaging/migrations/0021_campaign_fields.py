from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0020_campaigns"),
    ]

    operations = [
        migrations.AddField(
            model_name="campaign",
            name="created_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="campaigns_created", to="auth.user"),
        ),
        migrations.AddField(
            model_name="campaign",
            name="group_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="campaign",
            name="upload_used",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="campaign",
            name="estimated_cost",
            field=models.DecimalField(decimal_places=4, default=0, max_digits=12),
        ),
    ]
