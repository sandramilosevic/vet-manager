from django.contrib import admin
from django_filters import DateRangeFilter
from .models import Owner


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "registration_date",
    )
    list_filter = (("registration_date", DateRangeFilter),)
    search_fields = ("first_name", "last_name", "email", "phone_number")

    def get_queryset(self, request):
        # multi-tenant protection - vet sees only owners from his own clinic
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(clinic=request.user.clinic)
