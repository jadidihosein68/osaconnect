from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("contacts", "0002_add_organization"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContactGroup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                (
                    "color",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("blue", "Blue"),
                            ("green", "Green"),
                            ("orange", "Orange"),
                            ("purple", "Purple"),
                            ("teal", "Teal"),
                            ("gray", "Gray"),
                        ],
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_contact_groups",
                        to="auth.user",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="contact_groups", to="organizations.organization"
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
                "unique_together": {("organization", "name")},
            },
        ),
        migrations.AddField(
            model_name="contact",
            name="groups",
            field=models.ManyToManyField(blank=True, related_name="contacts", to="contacts.contactgroup"),
        ),
    ]
