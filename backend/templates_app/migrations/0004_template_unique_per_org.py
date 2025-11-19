from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("templates_app", "0003_add_template_approval"),
    ]

    operations = [
        migrations.AlterField(
            model_name="messagetemplate",
            name="name",
            field=models.CharField(max_length=120),
        ),
        migrations.AlterUniqueTogether(
            name="messagetemplate",
            unique_together={("organization", "name")},
        ),
    ]
