from rest_framework import serializers
from .models import Pet


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
