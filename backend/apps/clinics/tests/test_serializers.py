import pytest

from apps.clinics.models import ClinicGroup, Clinic
from apps.clinics.serializers import ClinicGroupSerializer, ClinicSerializer


@pytest.fixture
def clinic_group():
    """Create a valid ClinicGroup for serializer tests."""
    return ClinicGroup.objects.create(name="VetCare Group")


@pytest.fixture
def other_clinic_group():
    """Create a second ClinicGroup, used to verify a client can't reassign tenancy."""
    return ClinicGroup.objects.create(name="Other Group")


@pytest.fixture
def clinic(clinic_group):
    """Create a valid clinic for serializer tests."""
    return Clinic.objects.create(
        group=clinic_group,
        name="VetCare Downtown",
        address="Knez Mihailova 1",
        city="Belgrade",
        phone_number="0611234567",
        email="downtown@vetcare.com",
    )


@pytest.mark.django_db
class TestClinicGroupSerializer:

    def test_serializes_expected_fields(self, clinic_group):
        """Verify the serialized output contains exactly the declared fields."""

        data = ClinicGroupSerializer(clinic_group).data

        assert set(data.keys()) == {"id", "name"}
        assert data["name"] == "VetCare Group"

    def test_id_is_read_only(self, clinic_group):
        """Verify that a client-supplied id is ignored on update (id is read-only)."""

        serializer = ClinicGroupSerializer(
            clinic_group, data={"id": 999, "name": "Renamed Group"}
        )

        assert serializer.is_valid(), serializer.errors
        assert "id" not in serializer.validated_data

        updated = serializer.save()

        assert updated.pk == clinic_group.pk
        assert updated.name == "Renamed Group"

    def test_name_is_required(self):
        """Verify that name is required for creation."""

        serializer = ClinicGroupSerializer(data={})

        assert not serializer.is_valid()
        assert "name" in serializer.errors


@pytest.mark.django_db
class TestClinicSerializer:

    def test_serializes_expected_fields(self, clinic, clinic_group):
        """Verify the serialized output contains exactly the declared fields."""

        data = ClinicSerializer(clinic).data

        assert set(data.keys()) == {
            "id",
            "group",
            "name",
            "address",
            "city",
            "phone_number",
            "email",
        }
        assert data["group"] == clinic_group.pk
        assert data["city"] == "Belgrade"

    def test_group_is_read_only(self, clinic, other_clinic_group):
        """
        Verify a client can't reassign a clinic to a different tenant by
        sending a different 'group' id in the payload (multi-tenant safety).
        """

        serializer = ClinicSerializer(
            clinic,
            data={
                "group": other_clinic_group.pk,
                "name": "VetCare Downtown",
                "address": "Knez Mihailova 1",
                "city": "Belgrade",
                "phone_number": "0611234567",
                "email": "downtown@vetcare.com",
            },
        )

        assert serializer.is_valid(), serializer.errors
        assert "group" not in serializer.validated_data

        updated = serializer.save()

        assert updated.group == clinic.group
        assert updated.group != other_clinic_group

    def test_id_is_read_only(self, clinic):
        """Verify that a client-supplied id is ignored on update."""

        serializer = ClinicSerializer(
            clinic,
            data={
                "id": 999,
                "name": "VetCare Renamed",
                "address": "Knez Mihailova 1",
                "city": "Belgrade",
                "phone_number": "0611234567",
                "email": "downtown@vetcare.com",
            },
        )

        assert serializer.is_valid(), serializer.errors
        assert "id" not in serializer.validated_data

        updated = serializer.save()

        assert updated.pk == clinic.pk
        assert updated.name == "VetCare Renamed"

    def test_missing_required_fields(self):
        """Verify required fields (e.g. name, city, email) are enforced on create."""

        serializer = ClinicSerializer(data={})

        assert not serializer.is_valid()
        assert "name" in serializer.errors
        assert "city" in serializer.errors
        assert "email" in serializer.errors

    def test_invalid_email_rejected(self, clinic_group):
        """Verify that an invalid email is rejected by the serializer."""

        serializer = ClinicSerializer(
            data={
                "name": "VetCare Downtown",
                "address": "Knez Mihailova 1",
                "city": "Belgrade",
                "phone_number": "0611234567",
                "email": "not-an-email",
            }
        )

        assert not serializer.is_valid()
        assert "email" in serializer.errors
