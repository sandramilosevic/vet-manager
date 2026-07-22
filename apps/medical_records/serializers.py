from rest_framework import serializers
from apps.common.history import build_history_serializer
from apps.pets.models import Pet
from .models import MedicalRecord


class MedicalRecordSerializer(serializers.ModelSerializer):
    pet_name = serializers.CharField(source="pet.name", read_only=True)
    # The model has always recorded WHO authored a record — it just wasn't
    # serialized, so clinical history appeared anonymous to any client. It stays
    # read-only: `perform_create` sets it from the request user, and letting it
    # be written would allow attributing a diagnosis to another vet.
    vet = serializers.PrimaryKeyRelatedField(read_only=True)
    vet_email = serializers.CharField(source="vet.email", read_only=True, default=None)

    class Meta:
        model = MedicalRecord
        fields = [
            "id",
            "pet",
            "pet_name",
            "visit_date",
            "diagnosis",
            "meds",
            "treatment_notes",
            "weight",
            "temperature",
            "warnings",
            "vet",
            "vet_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "pet_name",
            "vet",
            "vet_email",
            "created_at",
            "updated_at",
        ]

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


# Read-only audit trail for a record's revisions.
MedicalRecordHistorySerializer = build_history_serializer(
    MedicalRecord,
    fields=[
        "id",
        "pet",
        "visit_date",
        "diagnosis",
        "meds",
        "treatment_notes",
        "weight",
        "temperature",
        "warnings",
        "vet",
        "is_deleted",
    ],
)
