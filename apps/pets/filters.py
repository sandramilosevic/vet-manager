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
            # Listing one owner's animals previously meant paging through the
            # whole practice and filtering client-side.
            "owner": ["exact"],
            "owner__last_name": ["icontains"],
        }


class VaccinationFilter(django_filters.FilterSet):
    class Meta:
        model = Vaccination
        # Define the fields that can be filtered and the types of filtering allowed
        fields = {
            "pet__name": ["icontains"],
            "vaccine_name": ["icontains"],
            "date_given": ["exact", "lte", "gte"],
            # Exact `pet` makes one animal's vaccination card a single query,
            # instead of a name search that also matches other animals.
            "pet": ["exact"],
            # `next_due` is what "which boosters are coming up?" needs; without
            # it a dashboard has to scan every record it can reach.
            "next_due": ["exact", "lte", "gte"],
        }
