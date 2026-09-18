from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from cases.models import Profile


SEED_USERS = [
    {
        "username": "paralegal1",
        "password": "12345",
        "role": Profile.ROLE_PARALEGAL,
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "attorney1",
        "password": "12345",
        "role": Profile.ROLE_ATTORNEY,
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "admin1",
        "password": "12345",
        "role": Profile.ROLE_ADMIN,
        "is_staff": True,
        "is_superuser": True,
    },
]


class Command(BaseCommand):
    help = "Seed development/demo data (idempotent)."

    def handle(self, *args, **options):
        self.stdout.write("Seeding development data...")

        for seed in SEED_USERS:
            username = seed["username"]

            user, created = User.objects.get_or_create(
                username=username
            )

            if created:
                user.set_password(seed["password"])

            user.is_staff = seed["is_staff"]
            user.is_superuser = seed["is_superuser"]
            user.save()

            profile, profile_created = Profile.objects.get_or_create(
                user=user,
                defaults={
                    "role": seed["role"],
                },
            )

            if profile.role != seed["role"]:
                profile.role = seed["role"]
                profile.save(update_fields=["role"])

            status = "Created" if created else "Exists"

            self.stdout.write(
                self.style.SUCCESS(
                    f"{status}: {username} ({seed['role']})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS("Seed data complete.")
        )