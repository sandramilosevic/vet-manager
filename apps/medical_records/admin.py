from django.contrib import admin
from .models import MedicalRecord
from rangefilter.filters import DateRangeFilter


@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ["pet", "visit_date"]
    list_filter = [("visit_date", DateRangeFilter)]
    search_fields = ["pet__name", "diagnosis"]
