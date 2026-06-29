from django.db import models

class ClinicGroup(models.Model):
    """Represents a group of clinics (e.g. a hospital chain or franchise)."""

    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Clinic(models.Model):
    """A single clinic belonging to a ClinicGroup."""

    group = models.ForeignKey(
        ClinicGroup, 
        on_delete=models.CASCADE, 
        related_name='clinics',
        )
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=254)

    def __str__(self):
        return f'{self.name} ({self.city})'
