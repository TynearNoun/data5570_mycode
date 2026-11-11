from django.db import migrations


def seed_plots(apps, schema_editor):
    Plot = apps.get_model("plots", "Plot")
    Plot.objects.bulk_create(
        [
            Plot(
                site="Cedar Bend",
                species="American robin",
                count=6,
                note="Foraging along the gravel bar after the rain.",
                flagged=False,
            ),
            Plot(
                site="Mill Race",
                species="Painted turtle",
                count=2,
                note="Basking on the south log. Both looked like adults.",
                flagged=False,
            ),
            Plot(
                site="Oak Ridge",
                species="Monarch",
                count=11,
                note="Nectaring on milkweed along the west edge.",
                flagged=True,
            ),
        ]
    )


def unseed_plots(apps, schema_editor):
    Plot = apps.get_model("plots", "Plot")
    Plot.objects.filter(
        site__in=["Cedar Bend", "Mill Race", "Oak Ridge"],
        species__in=["American robin", "Painted turtle", "Monarch"],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("plots", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_plots, unseed_plots),
    ]
