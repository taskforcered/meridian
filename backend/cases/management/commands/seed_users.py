from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from cases.models import Profile

SEED_USERS = [
    ('paralegal1', 'paralegal1pass', Profile.ROLE_PARALEGAL),
    ('attorney1', 'attorney1pass', Profile.ROLE_ATTORNEY),
    ('admin1', 'admin1pass', Profile.ROLE_ADMIN),
]


class Command(BaseCommand):
    help = 'Create one dev/demo user per role (idempotent).'

    def handle(self, *args, **options):
        for username, password, role in SEED_USERS:
            user, created = User.objects.get_or_create(username=username)
            if created:
                user.set_password(password)
                user.save()
            Profile.objects.get_or_create(user=user, defaults={'role': role})
            self.stdout.write(
                self.style.SUCCESS(f'{"Created" if created else "Exists"}: {username} ({role})')
            )
