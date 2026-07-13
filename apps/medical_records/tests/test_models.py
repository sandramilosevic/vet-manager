import pytest
from datetime import date

from apps.accounts.models import User
from apps.owners.models import Owner
from apps.pets.models import Pet
from apps.medical_records.models import MedicalRecord


@pytest.fixture
def owner():
    """Create a valid owner for MedicalRecord model tests."""
    return Owner.objects.create(
        first_name="Petar",
        last_name="Petrovic",
        phone_number="0612345678",
        email="pera@test.com",
    )


@pytest.fixture
def vet():
    """Create a valid veterinarian for MedicalRecord model tests."""
    return User.objects.create_user(
        username="vet",
        password="password",
        role="VET",
    )


@pytest.fixture
def pet(owner):
    """Create a valid pet for MedicalRecord model tests."""
    return Pet.objects.create(
        owner=owner,
        name="Maca",
        species=Pet.Species.DOG,
        gender=Pet.Gender.FEMALE,
    )


@pytest.mark.django_db
class TestMedicalRecordModel:

    def test_create_medical_record(self, pet, vet):
        """Verify that a medical record can be created successfully."""

        record = MedicalRecord.objects.create(
            pet=pet,
            vet=vet,
            visit_date=date(2026, 1, 10),
            diagnosis="Checkup",
            meds="Medicine",
            treatment_notes="Regular checkup",
            weight=5.5,
            temperature=38.5,
            warnings="None",
        )

        assert record.pk is not None
        assert record.pet == pet
        assert record.vet == vet
        assert record.diagnosis == "Checkup"
        assert record.meds == "Medicine"

    def test_string_representation(self, pet, vet):
        """Verify the string representation of the MedicalRecord model."""

        record = MedicalRecord.objects.create(
            pet=pet,
            vet=vet,
            visit_date=date(2026, 1, 10),
            diagnosis="Checkup",
        )

        assert str(record) == (f"{pet} - 2026-01-10 ({vet})")

    def test_history_tracking(self, pet, vet):
        """Verify that historical records are generated after changes."""

        record = MedicalRecord.objects.create(
            pet=pet,
            vet=vet,
            visit_date=date(2026, 1, 10),
            diagnosis="Checkup",
        )

        assert record.history.count() == 1

        record.diagnosis = "Updated diagnosis"
        record.save()

        assert record.history.count() == 2
        assert record.history.most_recent().diagnosis == "Updated diagnosis"

    def test_medical_record_requires_diagnosis(self, pet, vet):
        """Verify that diagnosis field is required."""

        record = MedicalRecord(
            pet=pet,
            vet=vet,
            visit_date=date(2026, 1, 10),
        )

        with pytest.raises(Exception):
            record.full_clean()
