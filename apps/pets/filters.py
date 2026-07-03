import django_filters
from .models import Pet, Vaccination


class PetFilter(django_filters.FilterSet):
    class Meta:
        model = Pet
        # Define the fields that can be filtered and the types of filtering allowed
        fields = {
            "name": ["icontains"],
            "species": ["exact", "icontains"],
            "gender": ["exact"],
            "breed": ["icontains"],
            "date_of_birth": ["exact", "lte", "gte"],
            "birth_year": ["exact", "lte", "gte"],
        }


class VaccinationFilter(django_filters.FilterSet):
    class Meta:
        model = Vaccination
        # Define the fields that can be filtered and the types of filtering allowed
        fields = {
            "pet__name": ["icontains"],
            "vaccine_name": ["icontains"],
            "date_given": ["exact", "lte", "gte"],
        }
