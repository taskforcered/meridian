from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0005_backfill_default_organization'),
    ]

    operations = [
        # Profile.organization stays nullable permanently — null means
        # platform staff (is_superuser) who aren't a member of any tenant.
        migrations.AlterField(
            model_name='case',
            name='organization',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='cases', to='cases.organization',
            ),
        ),
    ]
