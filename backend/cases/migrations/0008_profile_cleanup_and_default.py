"""Every Profile row is now a real (user, organization) membership — there's
no more "platform staff with a null-org Profile" case, they simply have zero
Profile rows. Delete any that predate that rule, and mark exactly one
membership per user as their default (their only one, if they have just one).
"""
from django.db import migrations


def cleanup(apps, schema_editor):
    Profile = apps.get_model('cases', 'Profile')
    Profile.objects.filter(organization__isnull=True).delete()

    seen_users = set()
    for profile in Profile.objects.order_by('id'):
        if profile.user_id in seen_users:
            continue
        seen_users.add(profile.user_id)
        profile.is_default = True
        profile.save(update_fields=['is_default'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0007_profile_multi_tenant'),
    ]

    operations = [
        migrations.RunPython(cleanup, noop_reverse),
    ]
