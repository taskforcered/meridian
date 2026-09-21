from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from cases.models import Organization, PlatformSettings, Profile


class Command(BaseCommand):
    help = "Provision a new tenant organization and its first Org Admin."

    def add_arguments(self, parser):
        parser.add_argument('name', help='Display name, e.g. "Acme Injury Law"')
        parser.add_argument('slug', help='Subdomain label, e.g. "acme" for acme.meridianapp.com')
        parser.add_argument('admin_email')
        parser.add_argument('admin_password')

    def handle(self, *args, **options):
        slug = options['slug'].strip().lower()
        if not slug.replace('-', '').isalnum():
            raise CommandError('slug must be alphanumeric (hyphens allowed).')

        org, org_created = Organization.objects.get_or_create(
            slug=slug,
            defaults={
                'name': options['name'],
                'is_active': PlatformSettings.load().default_new_org_active,
            },
        )
        if not org_created:
            self.stdout.write(self.style.WARNING(f"Organization '{org.slug}' already exists — reusing it."))

        # Email doubles as login identity — same person may already exist on
        # the platform via a different organization; this just adds a second
        # membership for them rather than erroring.
        email = options['admin_email'].strip().lower()
        user, user_created = User.objects.get_or_create(username=email, defaults={'email': email})
        if user_created:
            user.set_password(options['admin_password'])
            user.save()

        is_default = not Profile.objects.filter(user=user).exists()
        profile, profile_created = Profile.objects.get_or_create(
            user=user, organization=org,
            defaults={'role': Profile.ROLE_ADMIN, 'is_default': is_default},
        )
        if not profile_created:
            self.stdout.write(self.style.WARNING(f"'{email}' is already a member of '{org.slug}'."))

        self.stdout.write(self.style.SUCCESS(
            f"Organization '{org.name}' ({org.slug}) ready. Admin login: {email}"
        ))
