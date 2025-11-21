from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from organizations.models import Organization
from templates_app.models import MessageTemplate


DEFAULT_NAME = "Default Email"
DEFAULT_SUBJECT = "Hello from Corbi"
DEFAULT_BODY = "<p>Hi {{first_name}},</p><p>Thanks for being with us.</p>"
DEFAULT_FOOTER = "<p style='font-size:12px;color:#6b7280;'>If you no longer wish to receive these emails, click here: {{unsubscribe_link}}</p>"
DEFAULT_VARS = ["first_name", "unsubscribe_link"]


class Command(BaseCommand):
    help = "Seed production-safe defaults (currently default email template per org). Idempotent."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        with transaction.atomic():
            for org in Organization.objects.all():
                tmpl, was_created = MessageTemplate.objects.get_or_create(
                    organization=org,
                    name=DEFAULT_NAME,
                    defaults={
                        "channel": MessageTemplate.CHANNEL_EMAIL,
                        "language": "en",
                        "subject": DEFAULT_SUBJECT,
                        "body": DEFAULT_BODY,
                        "footer": DEFAULT_FOOTER,
                        "variables": DEFAULT_VARS,
                        "approved": True,
                        "approved_by": "System",
                        "approved_at": None,
                        "is_default": True,
                    },
                )
                if not was_created:
                    tmpl.subject = DEFAULT_SUBJECT
                    tmpl.body = DEFAULT_BODY
                    tmpl.footer = DEFAULT_FOOTER
                    tmpl.variables = DEFAULT_VARS
                    tmpl.is_default = True
                    if not tmpl.approved_at:
                        from django.utils import timezone
                        tmpl.approved_at = timezone.now()
                    tmpl.approved = True
                    tmpl.approved_by = tmpl.approved_by or "System"
                    tmpl.save(update_fields=["subject", "body", "footer", "variables", "is_default", "approved", "approved_by", "approved_at", "updated_at"])
                    updated += 1
                else:
                    if not tmpl.approved_at:
                        from django.utils import timezone
                        tmpl.approved_at = timezone.now()
                        tmpl.save(update_fields=["approved_at"])
                    created += 1
                # ensure only one default per channel/org
                MessageTemplate.objects.filter(organization=org, channel=MessageTemplate.CHANNEL_EMAIL).exclude(pk=tmpl.pk).update(is_default=False)

        self.stdout.write(self.style.SUCCESS(f"Defaults seeded. Created: {created}, Updated: {updated}"))
