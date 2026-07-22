from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clinics.models import ClinicGroup
from apps.owners.models import Owner
from apps.pets.models import Pet, Vaccination

User = get_user_model()


class PetAndVaccinationApiTests(APITestCase):

    def setUp(self):
        """
        Set up the testing environment with two clinics, clinic-specific users
        (standard vets and administrators), owners, pets, and vaccination records.
        """
        self.clinic_a = ClinicGroup.objects.create(name="Clinic A")
        self.clinic_b = ClinicGroup.objects.create(name="Clinic B")

        self.vet_clinic_a = User.objects.create_user(
            username="vet_a",
            password="password123",
            email="vet_a@example.com",
            clinic=self.clinic_a,
            role="VET",
        )
        self.admin_clinic_a = User.objects.create_user(
            username="admin_a",
            password="password123",
            email="admin_a@example.com",
            clinic=self.clinic_a,
            role="ADMIN",
        )

        self.vet_clinic_b = User.objects.create_user(
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
            clinic=self.clinic_a,
        )
        self.owner_b = Owner.objects.create(
            first_name="Jovan",
            last_name="Jovanovic",
            phone_number="065333444",
            clinic=self.clinic_b,
        )

        self.pet_a = Pet.objects.create(
            owner=self.owner_a,
            name="Bobi",
            species=Pet.Species.DOG,
            gender=Pet.Gender.MALE,
            birth_year=2020,
        )
        self.pet_b = Pet.objects.create(
            owner=self.owner_b,
            name="Luna",
            species=Pet.Species.CAT,
            gender=Pet.Gender.FEMALE,
            birth_year=2021,
        )

        self.vaccination_a = Vaccination.objects.create(
            pet=self.pet_a,
            vaccine_name="Rabies",
            date_given="2026-01-01",
            next_due="2027-01-01",
        )
        self.vaccination_b = Vaccination.objects.create(
            pet=self.pet_b,
            vaccine_name="Feline Distemper",
            date_given="2026-02-01",
            next_due="2027-02-01",
        )

        self.pet_list_url = reverse("pets")
        self.pet_detail_url = lambda pk: reverse("pet-details", kwargs={"pk": pk})
        self.vaccination_list_url = reverse("vaccinations")
        self.vaccination_detail_url = lambda pk: reverse(
            "vaccinations-details", kwargs={"pk": pk}
        )

    def test_get_pets_list_multi_tenant(self):
        """Verify that a vet from Clinic A can only see pets belonging to their clinic."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        response = self.client.get(self.pet_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Bobi")

    def test_create_pet_success(self):
        """Verify that a pet can be successfully created under a valid clinic owner."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        data = {
            "owner": self.owner_a.id,
            "name": "Dzeki",
            "species": "dog",
            "gender": "male",
            "birth_year": 2022,
        }
        response = self.client.post(self.pet_list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pet.objects.filter(owner__clinic=self.clinic_a).count(), 2)

    def test_get_pet_detail_same_clinic(self):
        """Verify that a clinic user can successfully retrieve a pet from their own clinic."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        url = self.pet_detail_url(self.pet_a.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Bobi")

    def test_get_pet_detail_different_clinic_returns_404(self):
        """Verify that accessing a pet from another clinic returns a 404 response for security boundaries."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        url = self.pet_detail_url(self.pet_b.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_pet_non_admin_forbidden(self):
        """Verify that standard vets without administrative privileges are restricted from deleting pets."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        url = self.pet_detail_url(self.pet_a.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_pet_admin_success(self):
        """Verify that an authorized clinic administrator is allowed to delete a pet record."""
        # Use a pet with no vaccinations attached — Vaccination.pet uses
        # on_delete=PROTECT, so a pet with vaccinations can't be deleted at all,
        # which would test the FK protection instead of the delete permission.
        pet_no_vaccinations = Pet.objects.create(
            owner=self.owner_a,
            name="Reks",
            species=Pet.Species.DOG,
            gender=Pet.Gender.MALE,
            birth_year=2019,
        )

        self.client.force_authenticate(user=self.admin_clinic_a)
        url = self.pet_detail_url(pet_no_vaccinations.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Pet.objects.filter(id=pet_no_vaccinations.id).exists())

    def test_get_vaccinations_list_multi_tenant(self):
        """Verify that vets can only query vaccination records bound to their clinic."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        response = self.client.get(self.vaccination_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["vaccine_name"], "Rabies")

    def test_get_vaccination_detail_different_clinic_returns_404(self):
        """Verify that accessing a vaccination record from another clinic returns a 404 response."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        url = self.vaccination_detail_url(self.vaccination_b.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_vaccination_admin_success(self):
        """Verify that an authorized clinic administrator can delete a vaccination record within their clinic."""
        self.client.force_authenticate(user=self.admin_clinic_a)
        url = self.vaccination_detail_url(self.vaccination_a.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Vaccination.objects.filter(id=self.vaccination_a.id).exists())

    def test_delete_vaccination_non_admin_forbidden(self):
        """Verify that critical operations on vaccination records are restricted for standard users."""
        self.client.force_authenticate(user=self.vet_clinic_a)
        url = self.vaccination_detail_url(self.vaccination_a.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_blocked(self):
        """Verify that unauthenticated requests to protected endpoints are denied with a 401 response."""
        self.client.logout()

        response_pets = self.client.get(self.pet_list_url)
        response_vaccinations = self.client.get(self.vaccination_list_url)

        self.assertEqual(response_pets.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response_vaccinations.status_code, status.HTTP_401_UNAUTHORIZED
        )
