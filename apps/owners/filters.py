import django_filters
from .models import Owner


class OwnerFilter(django_filters.FilterSet):
    class Meta:
        model = Owner
        fields = {
            "first_name": ["icontains"],
            "last_name": ["icontains"],
            "email": ["icontains"],
        }
