from rest_framework import serializers
from .models import Pet, Vaccination


class PetSerializer(serializers.ModelSerializer):
    """Serializes pet data including owner, species"""

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
            "allergies",
            "diet",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        owner = attrs.get("owner", getattr(self.instance, "owner", None))
        request = self.context.get("request")
        if owner and request and owner.clinic != request.user.clinic:
            raise serializers.ValidationError(
                {"owner": "Owner does not belong to your clinic."}
            )

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

    def validate(self, attrs):
        pet = attrs.get("pet", getattr(self.instance, "pet", None))
        request = self.context.get("request")
        if pet and request and pet.owner.clinic != request.user.clinic:
            raise serializers.ValidationError(
                {"pet": "Pet does not belong to your clinic."}
            )

        return attrs
