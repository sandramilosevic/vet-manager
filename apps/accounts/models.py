import uuid
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models import Q


class User(AbstractUser):
    """
    User tied to one clinic (multi-tenant).
    Role is set by whoever sends the invite.
    """

    # left value is stored in DB, right value is shown in forms/admin
    ROLES = [
        ("ADMIN", "Admin"),
        ("VET", "Vet"),
        ("STAFF", "Staff"),
    ]

    # Links every user to exactly one clinic (multi-tenant boundary).
    # String reference 'clinics.ClinicGroup' avoids a circular import,
    # since ClinicGroup lives in a different app.
    clinic = models.ForeignKey(
        "clinics.ClinicGroup",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLES, default="VET")

    def __str__(self):
        return self.username


class Invitation(models.Model):
    STATUS = [
        ("sent", "Sent"),
        ("accepted", "Accepted"),
        ("expired", "Expired"),
        ("revoked", "Revoked"),
    ]

    email = models.EmailField()
    clinic = models.ForeignKey(
        "clinics.ClinicGroup", on_delete=models.CASCADE, related_name="invitations"
    )
    role = models.CharField(max_length=20, choices=User.ROLES, default="VET")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=10, choices=STATUS, default="sent")
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_invitations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()

    class Meta:
        """
        Same email can't be invited twice in the same clinic, but can be invited in different clinics
        """

        constraints = [
            models.UniqueConstraint(
                fields=["email", "clinic"],
                condition=Q(status="sent"),
                name="unique_pending_invitation_per_email_per_clinic",
            )
        ]

    def __str__(self):
        return f"{self.clinic.name}, {self.email}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def is_valid(self):
        """
        Combines status check (not already used/revoked) with the
        time-based check above, so callers never have to check both manually
        """
        return self.status == "sent" and not self.is_expired
