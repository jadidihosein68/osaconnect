from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_userprofile"),
    ]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="display_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
