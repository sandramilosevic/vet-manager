import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, Invitation
from apps.clinics.models import ClinicGroup


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def clinic_a(db):
    return ClinicGroup.objects.create(name="Clinic A")


@pytest.fixture
def clinic_b(db):
    return ClinicGroup.objects.create(name="Clinic B")


@pytest.fixture
def admin_user(db, clinic_a):
    return User.objects.create_user(
        username="admin@clinic-a.com",
        email="admin@clinic-a.com",
        password="StrongPass123!",
        clinic=clinic_a,
        role="ADMIN",
    )


@pytest.fixture
def vet_user(db, clinic_a):
    return User.objects.create_user(
        username="vet@clinic-a.com",
        email="vet@clinic-a.com",
        password="StrongPass123!",
        clinic=clinic_a,
        role="VET",
    )


@pytest.fixture
def staff_user(db, clinic_a):
    return User.objects.create_user(
        username="staff@clinic-a.com",
        email="staff@clinic-a.com",
        password="StrongPass123!",
        clinic=clinic_a,
        role="STAFF",
    )


@pytest.fixture
def other_clinic_admin(db, clinic_b):
    return User.objects.create_user(
        username="admin@clinic-b.com",
        email="admin@clinic-b.com",
        password="StrongPass123!",
        clinic=clinic_b,
        role="ADMIN",
    )


@pytest.fixture
def pending_invitation(db, clinic_a, admin_user):
    return Invitation.objects.create(
        email="newuser@example.com",
        clinic=clinic_a,
        role="VET",
        invited_by=admin_user,
        expires_at=timezone.now() + timedelta(days=3),
    )


@pytest.fixture
def expired_invitation(db, clinic_a, admin_user):
    return Invitation.objects.create(
        email="expired@example.com",
        clinic=clinic_a,
        role="VET",
        invited_by=admin_user,
        expires_at=timezone.now() - timedelta(days=1),
    )
