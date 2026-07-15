from django.db import models
from apps.owners.models import Owner
from django.core.exceptions import ValidationError
from simple_history.models import HistoricalRecords


class Pet(models.Model):
    """
    Stores pet information, linked to an Owner.
    """

    class Gender(models.TextChoices):
        FEMALE = "female"
        MALE = "male"

    class Species(models.TextChoices):
        DOG = "dog"
        CAT = "cat"
        RABBIT = "rabbit"
        BIRD = "bird"
        HAMSTER = "hamster"
        OTHER = "other"

    # Ownership
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name="pets")

    # Basic info
    name = models.CharField(max_length=100)
    species = models.CharField(max_length=15, choices=Species.choices)
    gender = models.CharField(max_length=6, choices=Gender.choices)
    breed = models.CharField(max_length=100, blank=True)

    # Date of birth — use date_of_birth if known, birth_year if only year is known
    date_of_birth = models.DateField(blank=True, null=True)
    birth_year = models.PositiveSmallIntegerField(null=True, blank=True)

    # Additional info
    description = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    diet = models.CharField(max_length=200, blank=True)

    # Tracking updates and history
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.owner})"

    def clean(self):
        super().clean()
        if (
            self.date_of_birth
            and self.birth_year
            and self.date_of_birth.year != self.birth_year
        ):
            raise ValidationError(
                {"birth_year": "birth_year must match the year in date_of_birth"}
            )


class Vaccination(models.Model):
    # Pet FK
    pet = models.ForeignKey(Pet, related_name="vaccinations", on_delete=models.PROTECT)

    # Vaccine info
    vaccine_name = models.CharField(max_length=100)
    date_given = models.DateField()
    next_due = models.DateField()

    # Saving history
    history = HistoricalRecords()

    class Meta:
        ordering = ["pet", "date_given"]

    def __str__(self):
        return f"{self.vaccine_name}, given: {self.date_given}, next vaccination: {self.next_due}"
