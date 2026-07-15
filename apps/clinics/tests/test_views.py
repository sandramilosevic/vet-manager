import pytest
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import User
from apps.clinics.models import ClinicGroup, Clinic
from apps.clinics.views import ClinicView, ClinicListCreateView, ClinicDetailView


@pytest.fixture
def factory():
    return APIRequestFactory()


@pytest.fixture
def group_a():
    """Tenant A - the group the 'own' users below belong to."""
    return ClinicGroup.objects.create(name="VetCare Group A")


@pytest.fixture
def group_b():
    """Tenant B - a completely separate group, used to prove isolation."""
    return ClinicGroup.objects.create(name="VetCare Group B")


@pytest.fixture
def admin_a(group_a):
    return User.objects.create_user(
        username="admin_a",
        email="admin_a@test.com",
        password="password",
        role="ADMIN",
        clinic=group_a,
    )


@pytest.fixture
def vet_a(group_a):
    return User.objects.create_user(
        username="vet_a",
        email="vet_a@test.com",
        password="password",
        role="VET",
        clinic=group_a,
    )


@pytest.fixture
def staff_a(group_a):
    return User.objects.create_user(
        username="staff_a",
        email="staff_a@test.com",
        password="password",
        role="STAFF",
        clinic=group_a,
    )


@pytest.fixture
def admin_b(group_b):
    return User.objects.create_user(
        username="admin_b",
        email="admin_b@test.com",
        password="password",
        role="ADMIN",
        clinic=group_b,
    )


@pytest.fixture
def user_without_clinic():
    return User.objects.create_user(
        username="no_clinic",
        email="no_clinic@test.com",
        password="password",
        role="VET",
        clinic=None,
    )


@pytest.fixture
def clinic_a(group_a):
    return Clinic.objects.create(
        group=group_a,
        name="VetCare Downtown",
        address="Knez Mihailova 1",
        city="Belgrade",
        phone_number="0611234567",
        email="downtown@vetcare.com",
    )


@pytest.fixture
def clinic_b(group_b):
    return Clinic.objects.create(
        group=group_b,
        name="VetCare Uptown",
        address="Bulevar Oslobodjenja 10",
        city="Novi Sad",
        phone_number="0619876543",
        email="uptown@vetcare.com",
    )


@pytest.mark.django_db
class TestClinicView:
    """GET/PUT/PATCH on the tenant (ClinicGroup) itself."""

    def test_get_returns_own_clinic_group(self, factory, admin_a, group_a):
        """Verify a user retrieves their own ClinicGroup, not any other."""

        request = factory.get("/clinic/")
        force_authenticate(request, user=admin_a)
        response = ClinicView.as_view()(request)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == group_a.pk
        assert response.data["name"] == group_a.name

    def test_get_any_authenticated_role_allowed(self, factory, staff_a, group_a):
        """Verify non-admin roles can still read the clinic group."""

        request = factory.get("/clinic/")
        force_authenticate(request, user=staff_a)
        response = ClinicView.as_view()(request)

        assert response.status_code == status.HTTP_200_OK

    def test_get_without_clinic_returns_404(self, factory, user_without_clinic):
        """Verify a user with no associated clinic gets a 404, not a crash."""

        request = factory.get("/clinic/")
        force_authenticate(request, user=user_without_clinic)
        response = ClinicView.as_view()(request)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_as_admin_updates_group(self, factory, admin_a, group_a):
        """Verify an admin can rename their own clinic group."""

        request = factory.patch("/clinic/", {"name": "Renamed Group"})
        force_authenticate(request, user=admin_a)
        response = ClinicView.as_view()(request)

        assert response.status_code == status.HTTP_200_OK
        group_a.refresh_from_db()
        assert group_a.name == "Renamed Group"

    def test_patch_as_non_admin_forbidden(self, factory, vet_a, group_a):
        """Verify a non-admin cannot rename the clinic group."""

        request = factory.patch("/clinic/", {"name": "Renamed Group"})
        force_authenticate(request, user=vet_a)
        response = ClinicView.as_view()(request)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        group_a.refresh_from_db()
        assert group_a.name != "Renamed Group"

    def test_patch_unauthenticated_denied(self, factory, group_a):
        """Verify an anonymous request cannot modify the clinic group."""

        request = factory.patch("/clinic/", {"name": "Renamed Group"})
        response = ClinicView.as_view()(request)

        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


@pytest.mark.django_db
class TestClinicListCreateView:
    """GET (list) / POST (create) on Clinic locations, tenant-scoped."""

    def test_list_only_returns_own_tenant_clinics(
        self, factory, admin_a, clinic_a, clinic_b
    ):
        """Verify tenant A never sees tenant B's clinics in the list."""

        request = factory.get("/clinics/")
        force_authenticate(request, user=admin_a)
        response = ClinicListCreateView.as_view()(request)

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [item["id"] for item in response.data["results"]]
        assert clinic_a.pk in returned_ids
        assert clinic_b.pk not in returned_ids

    def test_list_without_clinic_returns_empty(
        self, factory, user_without_clinic, clinic_a
    ):
        """Verify a user with no clinic gets an empty list, not everyone's data."""

        request = factory.get("/clinics/")
        force_authenticate(request, user=user_without_clinic)
        response = ClinicListCreateView.as_view()(request)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []

    def test_filter_by_city(self, factory, admin_a, clinic_a, group_a):
        """Verify ClinicFilter narrows results by city (icontains)."""

        Clinic.objects.create(
            group=group_a,
            name="VetCare North",
            address="Some Street 5",
            city="Novi Sad",
            phone_number="0611112222",
            email="north@vetcare.com",
        )

        request = factory.get("/clinics/", {"city__icontains": "belgrade"})
        force_authenticate(request, user=admin_a)
        response = ClinicListCreateView.as_view()(request)

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [item["id"] for item in response.data["results"]]
        assert returned_ids == [clinic_a.pk]

    def test_create_as_admin_forces_own_group(self, factory, admin_a, group_a, group_b):
        """
        Verify that even if a malicious/buggy client sends another tenant's
        group id, the created Clinic is always forced into the admin's own
        ClinicGroup.
        """

        payload = {
            "group": group_b.pk,
            "name": "New Clinic",
            "address": "Some Address 1",
            "city": "Belgrade",
            "phone_number": "0611234567",
            "email": "new@vetcare.com",
        }
        request = factory.post("/clinics/", payload)
        force_authenticate(request, user=admin_a)
        response = ClinicListCreateView.as_view()(request)

        assert response.status_code == status.HTTP_201_CREATED
        created = Clinic.objects.get(pk=response.data["id"])
        assert created.group == group_a
        assert created.group != group_b

    def test_create_as_non_admin_forbidden(self, factory, vet_a):
        """Verify only admins can create new clinic locations."""

        payload = {
            "name": "New Clinic",
            "address": "Some Address 1",
            "city": "Belgrade",
            "phone_number": "0611234567",
            "email": "new@vetcare.com",
        }
        request = factory.post("/clinics/", payload)
        force_authenticate(request, user=vet_a)
        response = ClinicListCreateView.as_view()(request)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not Clinic.objects.filter(name="New Clinic").exists()


@pytest.mark.django_db
class TestClinicDetailView:
    """GET/PUT/PATCH (all roles) / DELETE (admin only) on a single Clinic."""

    def test_retrieve_own_tenant_clinic(self, factory, admin_a, clinic_a):
        """Verify a user can retrieve a clinic belonging to their own tenant."""

        request = factory.get(f"/clinics/{clinic_a.pk}/")
        force_authenticate(request, user=admin_a)
        response = ClinicDetailView.as_view()(request, pk=clinic_a.pk)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == clinic_a.pk

    def test_retrieve_other_tenant_clinic_returns_404(self, factory, admin_a, clinic_b):
        """
        Verify a user from tenant A cannot see a clinic belonging to tenant
        B, even by guessing its id — the queryset scoping means the object
        is never even found.
        """

        request = factory.get(f"/clinics/{clinic_b.pk}/")
        force_authenticate(request, user=admin_a)
        response = ClinicDetailView.as_view()(request, pk=clinic_b.pk)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_allowed_for_non_admin_roles(self, factory, staff_a, clinic_a):
        """Verify PATCH is not restricted to admins (only DELETE is)."""

        request = factory.patch(f"/clinics/{clinic_a.pk}/", {"city": "Novi Sad"})
        force_authenticate(request, user=staff_a)
        response = ClinicDetailView.as_view()(request, pk=clinic_a.pk)

        assert response.status_code == status.HTTP_200_OK
        clinic_a.refresh_from_db()
        assert clinic_a.city == "Novi Sad"

    def test_update_other_tenant_clinic_returns_404(self, factory, admin_a, clinic_b):
        """Verify tenant A cannot modify tenant B's clinic even via PATCH."""

        request = factory.patch(f"/clinics/{clinic_b.pk}/", {"city": "Belgrade"})
        force_authenticate(request, user=admin_a)
        response = ClinicDetailView.as_view()(request, pk=clinic_b.pk)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        clinic_b.refresh_from_db()
        assert clinic_b.city == "Novi Sad"

    def test_delete_as_admin_same_tenant_succeeds(self, factory, admin_a, clinic_a):
        """Verify an admin can delete a clinic belonging to their own tenant."""

        request = factory.delete(f"/clinics/{clinic_a.pk}/")
        force_authenticate(request, user=admin_a)
        response = ClinicDetailView.as_view()(request, pk=clinic_a.pk)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Clinic.objects.filter(pk=clinic_a.pk).exists()

    def test_delete_as_non_admin_forbidden(self, factory, vet_a, clinic_a):
        """Verify non-admin roles cannot delete a clinic."""

        request = factory.delete(f"/clinics/{clinic_a.pk}/")
        force_authenticate(request, user=vet_a)
        response = ClinicDetailView.as_view()(request, pk=clinic_a.pk)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Clinic.objects.filter(pk=clinic_a.pk).exists()

    def test_delete_other_tenant_clinic_returns_404(self, factory, admin_a, clinic_b):
        """
        Verify an admin from tenant A cannot delete tenant B's clinic, even
        though they are an admin — queryset scoping blocks it before the
        IsSameClinic object-level check is even reached.
        """

        request = factory.delete(f"/clinics/{clinic_b.pk}/")
        force_authenticate(request, user=admin_a)
        response = ClinicDetailView.as_view()(request, pk=clinic_b.pk)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Clinic.objects.filter(pk=clinic_b.pk).exists()
