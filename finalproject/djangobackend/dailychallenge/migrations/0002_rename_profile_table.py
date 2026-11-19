from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("rally", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="profile",
            table="dailychallenge_profile",
        ),
    ]
