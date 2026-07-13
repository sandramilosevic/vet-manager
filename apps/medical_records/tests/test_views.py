import pytest
from datetime import date

from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.owners.models import Owner
from apps.pets.models import Pet
from apps.medical_records.models import MedicalRecord


@pytest.fixture
def api_client():
    """Create API client for MedicalRecord API tests."""
    return APIClient()


@pytest.fixture
def clinic():
    """Create a clinic for API tests."""
    return "Clinic A"


@pytest.fixture
def other_clinic():
    """Create another clinic for permission tests."""
    return "Clinic B"


@pytest.fixture
def owner(clinic):
    """Create a valid owner for API tests."""

    return Owner.objects.create(
        first_name="Petar",
        last_name="Petrovic",
        phone_number="0612345678",
        email="pera@test.com",
        clinic=clinic,
    )


@pytest.fixture
def pet(owner):
    """Create a valid pet for API tests."""

    return Pet.objects.create(
        owner=owner,
        name="Maca",
        species=Pet.Species.DOG,
        gender=Pet.Gender.FEMALE,
    )


@pytest.fixture
def vet(clinic):
    """Create a veterinarian user for API tests."""

    return User.objects.create_user(
        username="vet",
        password="password",
        role="VET",
        clinic=clinic,
    )


@pytest.fixture
def admin(clinic):
    """Create an admin user for API tests."""

    return User.objects.create_user(
        username="admin",
        password="password",
        role="ADMIN",
        clinic=clinic,
    )


@pytest.fixture
def normal_user(clinic):
    """Create a normal authenticated user for API tests."""

    return User.objects.create_user(
        username="user",
        password="password",
        role="OWNER",
        clinic=clinic,
    )


@pytest.fixture
def medical_record(pet, vet):
    """Create a medical record for API tests."""

    return MedicalRecord.objects.create(
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


@pytest.mark.django_db
class TestMedicalRecordViews:

    def test_authenticated_user_can_list_medical_records(
        self,
        api_client,
        normal_user,
        medical_record,
    ):
        """Verify that authenticated users can view medical records."""

        api_client.force_authenticate(user=normal_user)

        response = api_client.get("/api/medical-records/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_vet_can_create_medical_record(
        self,
        api_client,
        vet,
        pet,
    ):
        """Verify that vets can create medical records."""

        api_client.force_authenticate(user=vet)

        response = api_client.post(
            "/api/medical-records/",
            {
                "pet": pet.id,
                "visit_date": "2026-01-10",
                "diagnosis": "Vaccination",
                "meds": "Medicine",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert MedicalRecord.objects.count() == 1

    def test_normal_user_cannot_create_medical_record(
        self,
        api_client,
        normal_user,
        pet,
    ):
        """Verify that users without permission cannot create records."""

        api_client.force_authenticate(user=normal_user)

        response = api_client.post(
            "/api/medical-records/",
            {
                "pet": pet.id,
                "visit_date": "2026-01-10",
                "diagnosis": "Checkup",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_authenticated_user_can_retrieve_medical_record(
        self,
        api_client,
        normal_user,
        medical_record,
    ):
        """Verify that users from the same clinic can view details."""

        api_client.force_authenticate(user=normal_user)

        response = api_client.get(f"/api/medical-records/{medical_record.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == medical_record.id

    def test_user_cannot_access_record_from_different_clinic(
        self,
        api_client,
        normal_user,
        medical_record,
        other_clinic,
    ):
        """Verify that users cannot access records from another clinic."""

        normal_user.clinic = other_clinic
        normal_user.save()

        api_client.force_authenticate(user=normal_user)

        response = api_client.get(f"/api/medical-records/{medical_record.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_vet_can_update_medical_record(
        self,
        api_client,
        vet,
        medical_record,
    ):
        """Verify that vets can update medical records."""

        api_client.force_authenticate(user=vet)

        response = api_client.patch(
            f"/api/medical-records/{medical_record.id}/",
            {
                "diagnosis": "Updated diagnosis",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        medical_record.refresh_from_db()

        assert medical_record.diagnosis == "Updated diagnosis"

    def test_normal_user_cannot_update_medical_record(
        self,
        api_client,
        normal_user,
        medical_record,
    ):
        """Verify that users without permission cannot update records."""

        api_client.force_authenticate(user=normal_user)

        response = api_client.patch(
            f"/api/medical-records/{medical_record.id}/",
            {
                "diagnosis": "Changed diagnosis",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_delete_medical_record(
        self,
        api_client,
        admin,
        medical_record,
    ):
        """Verify that admins can delete medical records."""

        api_client.force_authenticate(user=admin)

        response = api_client.delete(f"/api/medical-records/{medical_record.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT

        assert not MedicalRecord.objects.filter(id=medical_record.id).exists()

    def test_vet_cannot_delete_medical_record(
        self,
        api_client,
        vet,
        medical_record,
    ):
        """Verify that vets cannot delete medical records."""

        api_client.force_authenticate(user=vet)

        response = api_client.delete(f"/api/medical-records/{medical_record.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
