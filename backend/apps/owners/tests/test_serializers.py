from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.owners.models import Owner
from apps.owners.serializers import OwnerSerializer
from apps.clinics.models import ClinicGroup


class OwnerSerializerTests(TestCase):

    def setUp(self):
        self.clinic_a = ClinicGroup.objects.create(name="Clinic A")
        self.clinic_b = ClinicGroup.objects.create(name="Clinic B")
        self.existing_owner = Owner.objects.create(
            first_name="Jane",
            last_name="Doe",
            phone_number="987654321",
            email="jane@example.com",
            clinic=self.clinic_a,
        )

    def test_serializer_validation_fails_with_duplicate_email_same_clinic(self):
        """Test serializer validation fails when the email already exists within the same clinic context."""
        data = {
            "first_name": "Duplicate",
            "last_name": "Email",
            "phone_number": "123456",
            "email": "jane@example.com",
        }
        serializer = OwnerSerializer(data=data)

        class MockRequest:
            def __init__(self, clinic):
                self.user = type("User", (object,), {"clinic": clinic})

        serializer.context["request"] = MockRequest(self.clinic_a)
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_serializer_validation_passes_with_duplicate_email_different_clinic(self):
        """Test serializer validation passes when the same email is used in a different clinic."""
        data = {
            "first_name": "Duplicate",
            "last_name": "Email",
            "phone_number": "123456",
            "email": "jane@example.com",
        }
        serializer = OwnerSerializer(data=data)

        class MockRequest:
            def __init__(self, clinic):
                self.user = type("User", (object,), {"clinic": clinic})

        serializer.context["request"] = MockRequest(self.clinic_b)
        self.assertTrue(serializer.is_valid())
