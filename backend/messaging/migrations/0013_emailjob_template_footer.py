from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("templates_app", "0004_template_footer_default"),
        ("messaging", "0012_user_signing"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailjob",
            name="template",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, to="templates_app.messagetemplate"),
        ),
        migrations.AddField(
            model_name="emailjob",
            name="footer_html",
            field=models.TextField(blank=True, default=""),
        ),
    ]
