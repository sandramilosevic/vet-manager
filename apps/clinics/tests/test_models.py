import pytest
from django.db.utils import IntegrityError

from apps.clinics.models import ClinicGroup, Clinic


@pytest.fixture
def clinic_group():
    """Create a valid ClinicGroup for Clinic model tests."""
    return ClinicGroup.objects.create(name="VetCare Group")


@pytest.mark.django_db
class TestClinicGroupModel:

    def test_create_clinic_group(self):
        """Verify that a clinic group can be created successfully."""

        group = ClinicGroup.objects.create(name="VetCare Group")

        assert group.pk is not None
        assert group.name == "VetCare Group"
        assert group.created_at is not None
        assert group.updated_at is not None

    def test_string_representation(self):
        """Verify the string representation of the ClinicGroup model."""

        group = ClinicGroup.objects.create(name="VetCare Group")

        assert str(group) == "VetCare Group"

    def test_clinic_group_requires_name(self):
        """Verify that name field is required."""

        group = ClinicGroup()

        with pytest.raises(Exception):
            group.full_clean()


@pytest.mark.django_db
class TestClinicModel:

    def test_create_clinic(self, clinic_group):
        """Verify that a clinic can be created successfully and linked to its group."""

        clinic = Clinic.objects.create(
            group=clinic_group,
            name="VetCare Downtown",
            address="Knez Mihailova 1",
            city="Belgrade",
            phone_number="0611234567",
            email="downtown@vetcare.com",
        )

        assert clinic.pk is not None
        assert clinic.group == clinic_group
        assert clinic.name == "VetCare Downtown"
        assert clinic.city == "Belgrade"

    def test_string_representation(self, clinic_group):
        """Verify the string representation of the Clinic model."""

        clinic = Clinic.objects.create(
            group=clinic_group,
            name="VetCare Downtown",
            address="Knez Mihailova 1",
            city="Belgrade",
            phone_number="0611234567",
            email="downtown@vetcare.com",
        )

        assert str(clinic) == "VetCare Downtown (Belgrade)"

    def test_clinic_requires_group(self, clinic_group):
        """Verify that a clinic cannot exist without an associated ClinicGroup."""

        clinic = Clinic(
            name="VetCare Downtown",
            address="Knez Mihailova 1",
            city="Belgrade",
            phone_number="0611234567",
            email="downtown@vetcare.com",
        )

        with pytest.raises(Exception):
            clinic.full_clean()

        with pytest.raises(IntegrityError):
            Clinic.objects.create(
                name="VetCare Downtown",
                address="Knez Mihailova 1",
                city="Belgrade",
                phone_number="0611234567",
                email="downtown@vetcare.com",
            )

    def test_clinic_requires_email(self, clinic_group):
        """Verify that email field is required and validated."""

        clinic = Clinic(
            group=clinic_group,
            name="VetCare Downtown",
            address="Knez Mihailova 1",
            city="Belgrade",
            phone_number="0611234567",
            email="not-an-email",
        )

        with pytest.raises(Exception):
            clinic.full_clean()

    def test_deleting_group_cascades_to_clinics(self, clinic_group):
        """Verify that deleting a ClinicGroup deletes all of its Clinics (tenant cleanup)."""

        Clinic.objects.create(
            group=clinic_group,
            name="VetCare Downtown",
            address="Knez Mihailova 1",
            city="Belgrade",
            phone_number="0611234567",
            email="downtown@vetcare.com",
        )

        assert Clinic.objects.count() == 1

        clinic_group.delete()

        assert Clinic.objects.count() == 0

    def test_related_name_clinics_on_group(self, clinic_group):
        """Verify the reverse relation ClinicGroup.clinics works as expected."""

        clinic = Clinic.objects.create(
            group=clinic_group,
            name="VetCare Downtown",
            address="Knez Mihailova 1",
            city="Belgrade",
            phone_number="0611234567",
            email="downtown@vetcare.com",
        )

        assert list(clinic_group.clinics.all()) == [clinic]
