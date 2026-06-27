from rest_framework import generics, permissions
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from apps.accounts.permissions import IsAdmin


class MedicalRecordListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    # serializer for converting Python into JSON
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # filtering medical records through pet → owner → clinic chain
        return MedicalRecord.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )

    def perform_create(self, serializer):
        # automatically assign vet from current user on create
        serializer.save(vet=self.request.user)


class MedicalRecordDetailView(generics.RetrieveUpdateAPIView):
    """API for GET (single record) and PUT/PATCH (update) methods."""

    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # multi-tenant protection, vet only sees records from his clinic
        return MedicalRecord.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )


class MedicalRecordDestroyView(generics.DestroyAPIView):
    """API for DELETE method. Only admins can delete medical records."""

    serializer_class = MedicalRecordSerializer
    # only admins can delete medical records
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # admin can only delete records from his own clinic
        return MedicalRecord.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )
