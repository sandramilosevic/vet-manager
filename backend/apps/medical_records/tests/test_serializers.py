import pytest
from rest_framework import serializers

from apps.accounts.models import User
from apps.owners.models import Owner
from apps.pets.models import Pet
from apps.medical_records.serializers import MedicalRecordSerializer


@pytest.fixture
def owner(clinic):
    """Create a valid owner for serializer tests."""
    return Owner.objects.create(
        first_name="Petar",
        last_name="Petrovic",
        phone_number="0612345678",
        email="pera@test.com",
        clinic=clinic,
    )


@pytest.fixture
def pet(owner):
    """Create a valid pet for serializer tests."""
    return Pet.objects.create(
        owner=owner,
        name="Maca",
        species=Pet.Species.DOG,
        gender=Pet.Gender.FEMALE,
    )


@pytest.fixture
def vet(clinic):
    """Create a veterinarian for serializer tests."""
    return User.objects.create_user(
        username="vet",
        password="password",
        email="vet@test.com",
        role="VET",
        clinic=clinic,
    )


@pytest.mark.django_db
class TestMedicalRecordSerializer:

    def test_serializer_accepts_valid_data(self, pet, vet):
        """Verify that serializer accepts valid medical record data."""

        request = type(
            "Request",
            (),
            {"user": vet},
        )()

        serializer = MedicalRecordSerializer(
            data={
                "pet": pet.id,
                "visit_date": "2026-01-10",
                "diagnosis": "Checkup",
                "meds": "Medicine",
                "treatment_notes": "Regular examination",
                "weight": 5.5,
                "temperature": 38.5,
                "warnings": "None",
            },
            context={"request": request},
        )

        assert serializer.is_valid()

    def test_serializer_rejects_pet_from_different_clinic(
        self,
        pet,
        vet,
        other_clinic,
    ):
        """Verify that serializer rejects pets from another clinic."""

        vet.clinic = other_clinic
        vet.save()

        request = type(
            "Request",
            (),
            {"user": vet},
        )()

        serializer = MedicalRecordSerializer(
            data={
                "pet": pet.id,
                "visit_date": "2026-01-10",
                "diagnosis": "Checkup",
            },
            context={"request": request},
        )

        assert serializer.is_valid() is False
        assert "pet" in serializer.errors

    def test_serializer_allows_optional_fields_to_be_empty(
        self,
        pet,
        vet,
    ):
        """Verify that optional medical record fields can be empty."""

        request = type(
            "Request",
            (),
            {"user": vet},
        )()

        serializer = MedicalRecordSerializer(
            data={
                "pet": pet.id,
                "visit_date": "2026-01-10",
                "diagnosis": "Checkup",
            },
            context={"request": request},
        )

        assert serializer.is_valid()

    def test_serializer_updates_existing_record(
        self,
        pet,
        vet,
    ):
        """Verify that existing medical records can be updated."""

        from apps.medical_records.models import MedicalRecord

        record = MedicalRecord.objects.create(
            pet=pet,
            vet=vet,
            visit_date="2026-01-10",
            diagnosis="Old diagnosis",
        )

        request = type(
            "Request",
            (),
            {"user": vet},
        )()

        serializer = MedicalRecordSerializer(
            instance=record,
            data={
                "diagnosis": "New diagnosis",
            },
            partial=True,
            context={"request": request},
        )

        assert serializer.is_valid()
        updated_record = serializer.save()

        assert updated_record.diagnosis == "New diagnosis"
