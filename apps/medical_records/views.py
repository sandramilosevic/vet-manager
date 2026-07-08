from rest_framework import generics, permissions
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from apps.accounts.permissions import IsAdmin
from .filters import MedicalRecordFilter
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.pagination import PageNumberPagination


class MedicalRecordListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = MedicalRecordFilter
    ordering_fields = ["visit_date", "clinic__name"]
    pagination_class = PageNumberPagination

    def get_queryset(self):
        # Return only medical records for pets whose owners belong to the current user's clinic.
        clinic = getattr(self.request.user, "clinic", None)
        if clinic is None:
            return MedicalRecord.objects.none()

        return MedicalRecord.objects.select_related(
            "pet__owner", "vet", "clinic"
        ).filter(pet__owner__clinic=clinic)

    def perform_create(self, serializer):
        # Automatically set the vet to the current user when creating a new medical record.
        if self.request.user.role == "STAFF":
            raise permissions.PermissionDenied(
                "Staff members are not allowed to create medical records."
            )
        serializer.save(vet=self.request.user)


class MedicalRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = MedicalRecordSerializer

    def get_permissions(self):
        # Only admins can delete medical records; all authenticated users can view and update them.
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Return only medical records for pets whose owners belong to the current user's clinic.
        clinic = getattr(self.request.user, "clinic", None)
        if clinic is None:
            return MedicalRecord.objects.none()

        return MedicalRecord.objects.select_related(
            "pet__owner", "vet", "clinic"
        ).filter(pet__owner__clinic=clinic)
