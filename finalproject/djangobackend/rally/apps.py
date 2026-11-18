from django.apps import AppConfig


class RallyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rally"

    def ready(self):
        from django.contrib import admin

        admin.site.site_header = "Daily Challenge"
        admin.site.site_title = "Daily Challenge admin"
        admin.site.index_title = "Daily challenges"
