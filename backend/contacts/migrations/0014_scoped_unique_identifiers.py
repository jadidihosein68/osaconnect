from django.db import migrations, models
import django.db.models.expressions


class Migration(migrations.Migration):
    dependencies = [
        ("contacts", "0013_instagram_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contact",
            name="email",
            field=models.EmailField(blank=True, null=True, max_length=254, db_index=True),
        ),
        migrations.AlterField(
            model_name="contact",
            name="phone_whatsapp",
            field=models.CharField(blank=True, null=True, max_length=32, db_index=True),
        ),
        migrations.AlterField(
            model_name="contact",
            name="telegram_chat_id",
            field=models.CharField(blank=True, null=True, max_length=64, db_index=True),
        ),
        migrations.AlterField(
            model_name="contact",
            name="instagram_scoped_id",
            field=models.CharField(blank=True, null=True, max_length=64, db_index=True),
        ),
        migrations.AlterField(
            model_name="contact",
            name="instagram_user_id",
            field=models.CharField(blank=True, null=True, max_length=64, db_index=True),
        ),
        migrations.AddConstraint(
            model_name="contact",
            constraint=models.UniqueConstraint(
                condition=django.db.models.expressions.Q(("email__isnull", False)),
                fields=("organization", "email"),
                name="uniq_contact_email_per_org",
            ),
        ),
        migrations.AddConstraint(
            model_name="contact",
            constraint=models.UniqueConstraint(
                condition=django.db.models.expressions.Q(("phone_whatsapp__isnull", False)),
                fields=("organization", "phone_whatsapp"),
                name="uniq_contact_whatsapp_per_org",
            ),
        ),
        migrations.AddConstraint(
            model_name="contact",
            constraint=models.UniqueConstraint(
                condition=django.db.models.expressions.Q(("telegram_chat_id__isnull", False)),
                fields=("organization", "telegram_chat_id"),
                name="uniq_contact_telegram_per_org",
            ),
        ),
        migrations.AddConstraint(
            model_name="contact",
            constraint=models.UniqueConstraint(
                condition=django.db.models.expressions.Q(("instagram_scoped_id__isnull", False)),
                fields=("organization", "instagram_scoped_id"),
                name="uniq_contact_instagram_scoped_per_org",
            ),
        ),
        migrations.AddConstraint(
            model_name="contact",
            constraint=models.UniqueConstraint(
                condition=django.db.models.expressions.Q(("instagram_user_id__isnull", False)),
                fields=("organization", "instagram_user_id"),
                name="uniq_contact_instagram_user_per_org",
            ),
        ),
    ]
