from __future__ import annotations

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("templates_app", "0004_template_footer_default"),
        ("templates_app", "0004_template_unique_per_org"),
    ]

    operations = []
