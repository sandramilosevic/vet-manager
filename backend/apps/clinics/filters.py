import django_filters
from .models import Clinic


class ClinicFilter(django_filters.FilterSet):
    class Meta:
        model = Clinic
        fields = {
            "name": ["icontains"],
            "city": ["icontains"],
        }
