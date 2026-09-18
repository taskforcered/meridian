from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from cases.models import Organization, Profile

SEED_USERS = [
    ('paralegal1@demo.meridian', '12345', Profile.ROLE_PARALEGAL),
    ('attorney1@demo.meridian', '12345', Profile.ROLE_ATTORNEY),
    ('admin1@demo.meridian', '12345', Profile.ROLE_ADMIN),
]

PLATFORM_ADMIN_EMAIL = 'platform1@meridian.internal'
PLATFORM_ADMIN_PASSWORD = 'platform1pass'


class Command(BaseCommand):
    help = 'Create one dev/demo user per role in a demo organization (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--org-slug', default='demo')
        parser.add_argument('--org-name', default='Demo Firm')
        parser.add_argument(
            '--superuser', action='store_true',
            help=f'Also create a platform-admin superuser ({PLATFORM_ADMIN_EMAIL}), '
                 f'not a member of any organization.',
        )

    def handle(self, *args, **options):
        org, _ = Organization.objects.get_or_create(
            slug=options['org_slug'], defaults={'name': options['org_name']},
        )
        for email, password, role in SEED_USERS:
            user, created = User.objects.get_or_create(username=email, defaults={'email': email})
            if created:
                user.set_password(password)
                user.save()
            Profile.objects.update_or_create(
                user=user, organization=org, defaults={'role': role, 'is_default': True},
            )
            self.stdout.write(
                self.style.SUCCESS(f'{"Created" if created else "Exists"}: {email} ({role} @ {org.slug})')
            )

        if options['superuser']:
            user, created = User.objects.get_or_create(
                username=PLATFORM_ADMIN_EMAIL,
                defaults={'email': PLATFORM_ADMIN_EMAIL, 'is_superuser': True, 'is_staff': True},
            )
            if created:
                user.set_password(PLATFORM_ADMIN_PASSWORD)
                user.save()
            self.stdout.write(
                self.style.SUCCESS(f'{"Created" if created else "Exists"}: {PLATFORM_ADMIN_EMAIL} (platform admin, no org)')
            )
