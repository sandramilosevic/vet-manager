from django.contrib import admin
from .models import MedicalRecord
from rangefilter.filters import DateRangeFilter
from apps.accounts.admin import ClinicScopedAdminMixin


@admin.register(MedicalRecord)
class MedicalRecordAdmin(ClinicScopedAdminMixin, admin.ModelAdmin):
    clinic_lookup = "pet__owner__clinic"
    clinic_scoped_fk_fields = {"pet": "owner__clinic", "vet": "clinic"}

    list_display = ["pet", "vet", "visit_date"]
    list_filter = [("visit_date", DateRangeFilter), "pet", "vet"]
    search_fields = ["pet__name", "diagnosis"]
