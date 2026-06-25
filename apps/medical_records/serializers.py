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
