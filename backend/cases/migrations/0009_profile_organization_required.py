from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cases', '0008_profile_cleanup_and_default'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='organization',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='profiles', to='cases.organization',
            ),
        ),
        migrations.AddConstraint(
            model_name='profile',
            constraint=models.UniqueConstraint(
                fields=('user', 'organization'), name='unique_user_organization',
            ),
        ),
    ]
