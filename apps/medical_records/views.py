from rest_framework import generics, permissions
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from apps.accounts.permissions import IsAdmin


class MedicalRecordListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

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


class MedicalRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = MedicalRecordSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # multi-tenant protection, vet only sees records from his clinic
        return MedicalRecord.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )
