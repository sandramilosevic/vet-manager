from django.db import models
from apps.accounts.models import User
from apps.pets.models import Pet
from simple_history.models import HistoricalRecords
from datetime import timezone


class ActiveMedicalRecordManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class MedicalRecord(models.Model):

    # Pet info
    pet = models.ForeignKey(
        Pet, on_delete=models.PROTECT, related_name="medical_records"
    )

    # Date of visit or updating record
    visit_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Name of vet
    vet = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="medical_records"
    )

    # Diagnosis
    diagnosis = models.TextField()
    meds = models.TextField(blank=True)
    treatment_notes = models.TextField(blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    temperature = models.DecimalField(
        max_digits=3, decimal_places=1, blank=True, null=True
    )
    warnings = models.TextField(blank=True)

    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Saving history
    history = HistoricalRecords()

    objects = models.Manager()
    active_objects = ActiveMedicalRecordManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.pet} - {self.visit_date} ({self.vet})"

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])
