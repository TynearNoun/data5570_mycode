from django.apps import AppConfig


class DailyChallengeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dailychallenge"
    # The Python package moved. Existing databases still use this label,
    # so the applied migration history still matches. Table names are set on each model.
    label = "rally"

    def ready(self):
        from django.contrib import admin

        admin.site.site_header = "Daily Challenge"
        admin.site.site_title = "Daily Challenge admin"
        admin.site.index_title = "Daily challenges"
