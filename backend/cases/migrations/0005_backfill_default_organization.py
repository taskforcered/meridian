"""Backfill pre-existing Profiles/Cases into one default Organization.

Anything created before multi-tenancy existed (e.g. the seed_users fixture
accounts and any cases made against them) gets grouped into a single
'default' tenant rather than left orphaned. Real tenants are provisioned
going forward via `manage.py create_organization`.
"""
from django.db import migrations


DEFAULT_ORG_SLUG = 'default'
DEFAULT_ORG_NAME = 'Default Organization'


def backfill(apps, schema_editor):
    Organization = apps.get_model('cases', 'Organization')
    Profile = apps.get_model('cases', 'Profile')
    Case = apps.get_model('cases', 'Case')

    needs_org = Profile.objects.filter(organization__isnull=True).exists() or \
        Case.objects.filter(organization__isnull=True).exists()
    if not needs_org:
        return

    org, _ = Organization.objects.get_or_create(
        slug=DEFAULT_ORG_SLUG, defaults={'name': DEFAULT_ORG_NAME},
    )
    Profile.objects.filter(organization__isnull=True).update(organization=org)
    Case.objects.filter(organization__isnull=True).update(organization=org)


def noop_reverse(apps, schema_editor):
    # Nothing to undo — leaving rows pointed at the default org on rollback
    # is harmless and safer than trying to guess which were "really" unset.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0004_organization'),
    ]

    operations = [
        migrations.RunPython(backfill, noop_reverse),
    ]
