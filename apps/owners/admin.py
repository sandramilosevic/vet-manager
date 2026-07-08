from django.contrib import admin
from rangefilter.filters import DateRangeFilter
from .models import Owner
from apps.accounts.admin import ClinicScopedAdminMixin


@admin.register(Owner)
class OwnerAdmin(ClinicScopedAdminMixin, admin.ModelAdmin):
    clinic_lookup = "clinic"

    list_display = [
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "registration_date",
    ]
    list_filter = [("registration_date", DateRangeFilter)]
    search_fields = ["first_name", "last_name", "email", "phone_number"]
