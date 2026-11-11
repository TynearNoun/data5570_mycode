"""URL configuration for the plot log API."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("plots.urls")),
]
