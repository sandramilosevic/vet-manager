from rest_framework import serializers
from .models import Pet, Vaccination


class PetSerializer(serializers.ModelSerializer):
    """Serializes pet data including owner, species, and optional image."""

    class Meta:
        model = Pet
        fields = [
            "id",
            "owner",
            "name",
            "species",
            "gender",
            "breed",
            "date_of_birth",
            "birth_year",
            "description",
            "image",
        ]
        read_only_fields = ["id"]


class VaccinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vaccination
        fields = [
            "id",
            "pet",
            "vaccine_name",
            "date_given",
            "next_due",
        ]
        read_only_fields = ["id"]
