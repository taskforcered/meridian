from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cases', '0006_case_organization_required'),
    ]

    operations = [
        # OneToOneField -> ForeignKey: a person may now belong to more than
        # one organization. related_name changes accordingly (user.profile
        # -> user.memberships, since it's no longer a single row).
        migrations.AlterField(
            model_name='profile',
            name='user',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='memberships', to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='profile',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='is_default',
            field=models.BooleanField(default=False),
        ),
    ]
