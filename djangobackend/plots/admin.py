from django.contrib import admin

from .models import Plot


@admin.register(Plot)
class PlotAdmin(admin.ModelAdmin):
    list_display = ("species", "site", "count", "flagged", "created_at")
    list_filter = ("flagged",)
    search_fields = ("species", "site", "note")
