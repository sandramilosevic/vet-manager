from rest_framework import serializers
from apps.pets.models import Pet
from .models import MedicalRecord


from rest_framework import serializers
from apps.pets.models import Pet
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Scope `pet` choices to the requesting user's clinic so a pet ID
        # from another clinic looks like a non-existent ID, not a leak.
        request = self.context.get("request")
        clinic = getattr(getattr(request, "user", None), "clinic", None)
        if "pet" in self.fields:
            self.fields["pet"].queryset = (
                Pet.objects.filter(owner__clinic=clinic)
                if clinic
                else Pet.objects.none()
            )
