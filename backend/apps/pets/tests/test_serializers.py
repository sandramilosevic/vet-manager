from django.test import TestCase
from apps.pets.serializers import PetSerializer


class PetSerializerTests(TestCase):

    def test_serializer_with_invalid_species_fails(self):
        """Verify that the serializer raises a validation error for invalid species choice."""
        invalid_data = {
            "name": "Rex",
            "species": "dinosaur",  # Not in Pet.Species choices
            "gender": "male",
        }
        serializer = PetSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("species", serializer.errors)
