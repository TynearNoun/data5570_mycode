from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        'first_name',
        'last_name',
        'email',
        'company',
        'status',
        'created_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'company')
    ordering = ('last_name', 'first_name')
    readonly_fields = ('created_at', 'updated_at')
