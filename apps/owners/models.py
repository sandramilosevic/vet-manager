from django.db import models

class Owner(models.Model):
    """
    Stores pet owner information.
    """

    # clinic that owner belongs to (multi-tenant)
    clinic = models.ForeignKey(
        "clinics.ClinicGroup",
        on_delete=models.CASCADE,
        related_name="owners",
        null=True,
        blank=True,
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    registration_date = models.DateField(auto_now_add=True)
    email = models.EmailField(max_length=254, blank=True)
    address = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
