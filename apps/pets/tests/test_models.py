import pytest
from datetime import date
from django.core.exceptions import ValidationError

from apps.owners.models import Owner
from apps.pets.models import Pet


@pytest.fixture
def owner():
    """Create a valid owner for Pet model tests."""
    return Owner.objects.create(
        first_name="Petar",
        last_name="Petrovic",
        phone_number="0612345678",
        email="pera@test.com",
    )


@pytest.mark.django_db
class TestPetModel:

    def test_create_pet(self, owner):
        """Verify that a pet can be created successfully."""

        pet = Pet.objects.create(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
        )

        assert pet.pk is not None
        assert pet.name == "Maca"
        assert pet.owner == owner
        assert pet.species == Pet.Species.DOG
        assert pet.gender == Pet.Gender.FEMALE

    def test_string_representation(self, owner):
        """Verify the string representation of the Pet model."""

        pet = Pet.objects.create(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
        )

        assert str(pet) == "Maca (Petar Petrovic)"

    def test_clean_accepts_matching_birth_year(self, owner):
        """Validation should pass when birth year matches date of birth."""

        pet = Pet(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
            date_of_birth=date(2022, 5, 10),
            birth_year=2022,
        )

        pet.full_clean()

    def test_clean_raises_error_for_mismatched_birth_year(self, owner):
        """Validation should fail when birth year does not match date of birth."""

        pet = Pet(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
            date_of_birth=date(2022, 5, 10),
            birth_year=2021,
        )

        with pytest.raises(ValidationError) as exc:
            pet.full_clean()

        assert "birth" in str(exc.value).lower()

    def test_birth_year_without_date_of_birth_is_valid(self, owner):
        """Validation should pass when only birth year is provided."""

        pet = Pet(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
            birth_year=2022,
        )

        pet.full_clean()

    def test_date_of_birth_without_birth_year_is_valid(self, owner):
        """Validation should pass when only date of birth is provided."""

        pet = Pet(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
            date_of_birth=date(2022, 5, 10),
        )

        pet.full_clean()

    def test_pet_without_birth_information_is_valid(self, owner):
        """Validation should pass when no birth information is provided."""

        pet = Pet(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
        )

        pet.full_clean()

    def test_is_deceased_defaults_to_false(self, owner):
        """Verify that is_deceased defaults to False."""

        pet = Pet.objects.create(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
        )

        assert pet.is_deceased is False

    def test_is_active_defaults_to_true(self, owner):
        """Verify that is_active defaults to True."""

        pet = Pet.objects.create(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
        )

        assert pet.is_active is True

    def test_notes_can_be_blank(self, owner):
        """Verify that notes can be left empty."""

        pet = Pet.objects.create(
            owner=owner,
            name="Maca",
            species=Pet.Species.DOG,
            gender=Pet.Gender.FEMALE,
            notes="",
        )

        assert pet.notes == ""
