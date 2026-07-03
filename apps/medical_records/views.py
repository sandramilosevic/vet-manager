from rest_framework import generics, permissions
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from apps.accounts.permissions import IsAdmin
from .filters import MedicalRecordFilter
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend


class MedicalRecordListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = MedicalRecordFilter
    ordering_fields = ["visit_date"]

    def get_queryset(self):
        # filtering medical records through pet → owner → clinic chain
        clinic = getattr(self.request.user, "clinic", None)
        if clinic is None:
            return MedicalRecord.objects.none()

        return MedicalRecord.objects.select_related("pet__owner", "vet").filter(
            pet__owner__clinic=clinic
        )

    def perform_create(self, serializer):
        # automatically assign vet from current user on create
        serializer.save(vet=self.request.user)


class MedicalRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = MedicalRecordSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # multi-tenant protection, vet only sees records from his clinic
        clinic = getattr(self.request.user, "clinic", None)
        if clinic is None:
            return MedicalRecord.objects.none()

        return MedicalRecord.objects.select_related("pet__owner", "vet").filter(
            pet__owner__clinic=clinic
        )
