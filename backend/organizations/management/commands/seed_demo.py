from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from organizations.models import Organization, Membership
from contacts.models import Contact
from templates_app.models import MessageTemplate
from messaging.models import OutboundMessage, InboundMessage
from bookings.models import Booking


class Command(BaseCommand):
    help = "Seed a demo organization, user, and sample data for quick testing."

    def handle(self, *args, **options):
        with transaction.atomic():
            org, _ = Organization.objects.get_or_create(name="Demo Org", defaults={"domain": "demo.corbi.local"})

            User = get_user_model()
            user, created = User.objects.get_or_create(username="demo", defaults={"email": "demo@corbi.local"})
            if created:
                user.set_password("changeme123")
                user.is_staff = True
                user.save()

            Membership.objects.get_or_create(user=user, organization=org, defaults={"role": Membership.ROLE_ADMIN})

            contact, _ = Contact.objects.get_or_create(
                organization=org,
                full_name="Jane Doe",
                defaults={
                    "email": "jane@example.com",
                    "phone_whatsapp": "+12025550123",
                    "status": Contact.STATUS_ACTIVE,
                },
            )

            tmpl, _ = MessageTemplate.objects.get_or_create(
                organization=org,
                name="demo_welcome",
                defaults={
                    "channel": "email",
                    "language": "en",
                    "subject": "Welcome to Corbi",
                    "body": "Hi {{name}}, thanks for trying Corbi. Your org is {{org}}.",
                    "variables": ["name", "org"],
                    "approved": True,
                    "approved_by": "seed",
                },
            )

            now = timezone.now()
            OutboundMessage.objects.get_or_create(
                organization=org,
                contact=contact,
                channel="email",
                body="Welcome from Corbi demo.",
                defaults={
                    "status": OutboundMessage.STATUS_SENT,
                    "provider_message_id": "seed-email-1",
                },
            )

            InboundMessage.objects.get_or_create(
                organization=org,
                contact=contact,
                channel="email",
                payload={"text": "Thanks!"},
                defaults={"received_at": now},
            )

            Booking.objects.get_or_create(
                organization=org,
                contact=contact,
                title="Demo Consultation",
                start_time=now + timedelta(days=1),
                end_time=now + timedelta(days=1, hours=1),
                defaults={"status": Booking.STATUS_CONFIRMED, "location": "Video"},
            )

            self.stdout.write(self.style.SUCCESS("Demo data seeded. User: demo / changeme123"))
