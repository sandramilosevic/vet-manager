from django.contrib import admin
from .models import Clinic, ClinicGroup
from apps.accounts.admin import ClinicScopedAdminMixin


@admin.register(ClinicGroup)
class ClinicGroupAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]

    def get_queryset(self, request):
        # ClinicGroup IS the tenant itself (not a FK relation to one), so
        # it can't use ClinicScopedAdminMixin's clinic_lookup pattern
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(pk=request.user.clinic_id)


@admin.register(Clinic)
class ClinicAdmin(ClinicScopedAdminMixin, admin.ModelAdmin):
    clinic_lookup = "group"

    list_display = ["name", "address", "city", "phone_number", "email", "group"]
    search_fields = ["name", "city", "group__name"]
    list_filter = ["group"]
