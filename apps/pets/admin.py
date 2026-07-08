from django.contrib import admin
from .models import Pet, Vaccination
from rangefilter.filters import DateRangeFilter
from apps.accounts.admin import ClinicScopedAdminMixin


@admin.register(Pet)
class PetAdmin(ClinicScopedAdminMixin, admin.ModelAdmin):
    clinic_lookup = "owner__clinic"
    clinic_scoped_fk_fields = {"owner": "clinic"}

    list_display = ["name", "owner", "species", "gender"]
    list_filter = ["species", "gender"]
    search_fields = ["name", "owner__first_name", "owner__last_name"]


@admin.register(Vaccination)
class VaccinationAdmin(ClinicScopedAdminMixin, admin.ModelAdmin):
    clinic_lookup = "pet__owner__clinic"
    clinic_scoped_fk_fields = {"pet": "owner__clinic"}

    list_display = ["pet", "vaccine_name", "date_given", "next_due"]
    list_filter = [
        "vaccine_name",
        ("date_given", DateRangeFilter),
        ("next_due", DateRangeFilter),
    ]
