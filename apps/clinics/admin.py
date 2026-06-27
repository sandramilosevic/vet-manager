from django.contrib import admin
from .models import Clinic, ClinicGroup, WorkingHours

admin.site.register(Clinic)
admin.site.register(ClinicGroup)
admin.site.register(WorkingHours)
