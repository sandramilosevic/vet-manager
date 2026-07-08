from rest_framework import generics, permissions
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from apps.accounts.permissions import IsAdmin, IsSameClinic, IsVetOrAdmin
from .filters import MedicalRecordFilter
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend


class MedicalRecordListCreateView(generics.ListCreateAPIView):
    """API for GET (list, all authenticated clinic members) and POST
    (create, VET/ADMIN only) methods."""

    serializer_class = MedicalRecordSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = MedicalRecordFilter
    ordering_fields = ["visit_date"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsVetOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        clinic = getattr(self.request.user, "clinic", None)
        if clinic is None:
            return MedicalRecord.objects.none()

        return MedicalRecord.objects.select_related("pet__owner", "vet").filter(
            pet__owner__clinic=clinic
        )

    def perform_create(self, serializer):
        serializer.save(vet=self.request.user)


class MedicalRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET (all clinic users), PUT/PATCH (vet/admin only) and
    DELETE (admin only) methods."""

    serializer_class = MedicalRecordSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin(), IsSameClinic()]
        if self.request.method in ("PUT", "PATCH"):
            return [permissions.IsAuthenticated(), IsVetOrAdmin(), IsSameClinic()]
        return [permissions.IsAuthenticated(), IsSameClinic()]

    def get_queryset(self):
        clinic = getattr(self.request.user, "clinic", None)
        if clinic is None:
            return MedicalRecord.objects.none()

        return MedicalRecord.objects.select_related("pet__owner", "vet").filter(
            pet__owner__clinic=clinic
        )
