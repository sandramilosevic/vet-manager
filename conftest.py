import pytest


@pytest.fixture
def clinic(db):
    from apps.clinics.models import ClinicGroup

    return ClinicGroup.objects.create(name="Clinic A")


@pytest.fixture
def other_clinic(db):
    from apps.clinics.models import ClinicGroup

    return ClinicGroup.objects.create(name="Clinic B")
