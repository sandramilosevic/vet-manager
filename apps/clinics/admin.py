from django.contrib import admin
from .models import Clinic, ClinicGroup


@admin.register(ClinicGroup)
class ClinicGroupAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ["name", "address", "city", "phone_number", "email", "group"]
    search_fields = ["name", "city", "group__name"]
    list_filter = ["group"]
