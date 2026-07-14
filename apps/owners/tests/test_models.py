from django.test import TestCase
from apps.owners.models import Owner
from apps.clinics.models import ClinicGroup


class OwnerModelTests(TestCase):

    def setUp(self):
        self.clinic = ClinicGroup.objects.create(name="Clinic A")

    def test_owner_creation(self):
        """Test that an owner is successfully created with correct attributes and string representation."""
        owner = Owner.objects.create(
            first_name="John",
            last_name="Doe",
            phone_number="123456789",
            email="john.doe@example.com",
            clinic=self.clinic,
        )
        self.assertEqual(owner.first_name, "John")
        self.assertEqual(owner.last_name, "Doe")
        self.assertEqual(str(owner), "John Doe")
