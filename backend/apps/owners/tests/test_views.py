from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from apps.owners.models import Owner
from apps.clinics.models import ClinicGroup

User = get_user_model()


class OwnerViewTests(APITestCase):

    def setUp(self):
        self.clinic_a = ClinicGroup.objects.create(name="Clinic A")
        self.clinic_b = ClinicGroup.objects.create(name="Clinic B")

        self.vet_a = User.objects.create_user(
            username="vet_a",
            password="password123",
            email="vet_a@example.com",
            clinic=self.clinic_a,
            role="VET",
        )
        self.admin_a = User.objects.create_user(
            username="admin_a",
            password="password123",
            email="admin_a@example.com",
            clinic=self.clinic_a,
            role="ADMIN",
        )
        self.vet_b = User.objects.create_user(
            username="vet_b",
            password="password123",
            email="vet_b@example.com",
            clinic=self.clinic_b,
            role="VET",
        )

        self.owner_a = Owner.objects.create(
            first_name="Marko",
            last_name="Markovic",
            phone_number="064111222",
            email="marko@example.com",
            clinic=self.clinic_a,
        )
        self.owner_b = Owner.objects.create(
            first_name="Jovan",
            last_name="Jovanovic",
            phone_number="065333444",
            email="jovan@example.com",
            clinic=self.clinic_b,
        )

        self.list_url = reverse("owners-list")
        self.detail_url = lambda pk: reverse("owners-detail", kwargs={"pk": pk})

    def test_get_owners_list_multi_tenant_isolation(self):
        """Test that users can only retrieve owners associated with their specific clinic."""
        self.client.force_authenticate(user=self.vet_a)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "marko@example.com")

    def test_create_owner_auto_assigns_clinic(self):
        """Test that owner creation automatically links the model to the clinic of the logged-in user."""
        self.client.force_authenticate(user=self.vet_a)
        data = {
            "first_name": "Nikola",
            "last_name": "Nikolic",
            "phone_number": "063777888",
            "email": "nikola@example.com",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        owner = Owner.objects.get(email="nikola@example.com")
        self.assertEqual(owner.clinic, self.clinic_a)

    def test_get_owner_detail_unauthorized_clinic_returns_404(self):
        """Test that looking up a detail record belonging to another clinic triggers a 404."""
        self.client.force_authenticate(user=self.vet_a)
        url = self.detail_url(self.owner_b.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_owner_as_non_admin_fails(self):
        """Test that deleting owners is restricted for standard non-staff/non-admin users."""
        self.client.force_authenticate(user=self.vet_a)
        url = self.detail_url(self.owner_a.id)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_owner_as_admin_succeeds(self):
        """Test that clinic administrators can successfully delete owners within their clinic."""
        self.client.force_authenticate(user=self.admin_a)
        url = self.detail_url(self.owner_a.id)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_anonymous_requests_are_unauthorized(self):
        """Test that unauthenticated requests to protected API endpoints are rejected."""
        self.client.logout()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
