from django.db import models
from django.db.models import Q


class Owner(models.Model):
    """
    Stores pet owner information.
    """

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

    class Meta:
        # Same email can't be registered twice in the same clinic, but can be registered in different clinics.
        # condition=~Q(email="") excludes blank emails, since Owner.email is optional (blank=True) and
        # multiple owners with no email shouldn't collide with each other.
        constraints = [
            models.UniqueConstraint(
                fields=["email", "clinic"],
                name="unique_email_per_clinic",
                condition=~Q(email=""),
            )
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"