from rest_framework import serializers
from apps.common.history import build_history_serializer
from apps.owners.models import Owner
from .models import Pet, Vaccination


class PetSerializer(serializers.ModelSerializer):
    """Serializes pet data including owner, species"""

    # `owner` is returned as a bare id, and there is no bulk-lookup endpoint, so
    # a client rendering a table had to fetch every owner just to label rows.
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            "id",
            "owner",
            "owner_name",
            "name",
            "species",
            "gender",
            "breed",
            "date_of_birth",
            "birth_year",
            "description",
            "allergies",
            "diet",
        ]
        read_only_fields = ["id", "owner_name"]

    def get_owner_name(self, obj) -> str:
        owner = obj.owner
        return f"{owner.first_name} {owner.last_name}".strip()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Scope the `owner` choices to the requesting user's clinic so that
        # an owner ID belonging to another clinic looks identical to a
        # non-existent ID ("does not exist"), instead of leaking existence
        # via a separate "not your clinic" validation error.
        request = self.context.get("request")
        clinic = getattr(getattr(request, "user", None), "clinic", None)
        if "owner" in self.fields:
            self.fields["owner"].queryset = (
                Owner.objects.filter(clinic=clinic) if clinic else Owner.objects.none()
            )

    def validate(self, attrs):
        date_of_birth = attrs.get(
            "date_of_birth", getattr(self.instance, "date_of_birth", None)
        )
        birth_year = attrs.get("birth_year", getattr(self.instance, "birth_year", None))
        if date_of_birth and birth_year and date_of_birth.year != birth_year:
            raise serializers.ValidationError(
                "birth_year must match the year in date_of_birth"
            )

        return attrs


class VaccinationSerializer(serializers.ModelSerializer):
    # Same reasoning as PetSerializer.owner_name: spare the client an extra
    # round trip just to print which animal the dose belongs to.
    pet_name = serializers.CharField(source="pet.name", read_only=True)

    class Meta:
        model = Vaccination
        fields = [
            "id",
            "pet",
            "pet_name",
            "vaccine_name",
            "date_given",
            "next_due",
        ]
        read_only_fields = ["id", "pet_name"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Same scoping as PetSerializer.owner: a pet from another clinic
        # should look like a non-existent pet, not a "not your clinic" error.
        request = self.context.get("request")
        clinic = getattr(getattr(request, "user", None), "clinic", None)
        if "pet" in self.fields:
            self.fields["pet"].queryset = (
                Pet.objects.filter(owner__clinic=clinic)
                if clinic
                else Pet.objects.none()
            )


# Read-only audit trails. `HistoricalRecords()` has always been on these models;
# these serializers are what finally make the versions reachable over the API.
PetHistorySerializer = build_history_serializer(
    Pet,
    fields=[
        "id",
        "owner",
        "name",
        "species",
        "gender",
        "breed",
        "date_of_birth",
        "birth_year",
        "description",
        "allergies",
        "diet",
    ],
)

VaccinationHistorySerializer = build_history_serializer(
    Vaccination,
    fields=["id", "pet", "vaccine_name", "date_given", "next_due"],
)
