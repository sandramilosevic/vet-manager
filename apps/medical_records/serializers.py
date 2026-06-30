from rest_framework import serializers
from .models import MedicalRecord


class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = [
            "id",
            "pet",
            "visit_date",
            "diagnosis",
            "meds",
            "treatment_notes",
            "weight",
            "temperature",
            "warnings",
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
