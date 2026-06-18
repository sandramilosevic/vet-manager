from django.db import models
from imagekit.models import ProcessedImageField
from imagekit.processors import ResizeToFill
from apps.owners.models import Owner

class Pet(models.Model):
    """
    Stores pet information, linked to an Owner.
    """
    class Gender(models.TextChoices):
        FEMALE = 'female'
        MALE = 'male'

    class Species(models.TextChoices):
        DOG = 'dog'
        CAT = 'cat'
        RABBIT = 'rabbit'
        BIRD = 'bird'
        HAMSTER = 'hamster'
        OTHER = 'other'

    # Ownership
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE)
    
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
    
    # Profile image, resized to 400x400 on upload
    image = ProcessedImageField(
        upload_to='pets/',
        processors=[ResizeToFill(400, 400)],
        format='JPEG',
        options={'quality':85},
        null=True,
        blank=True
    )

    def __str__(self):
        return f'{self.name} ({self.owner})'
    