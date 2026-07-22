import django_filters
from .models import MedicalRecord


class MedicalRecordFilter(django_filters.FilterSet):
    class Meta:
        model = MedicalRecord
        fields = {
            "pet__name": ["icontains"],
            "visit_date": ["exact", "gte", "lte"],
        }
