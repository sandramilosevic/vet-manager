from rest_framework import generics, permissions
from .models import Pet, Vaccination
from .serializers import PetSerializer, VaccinationSerializer
from apps.accounts.permissions import IsAdmin


class PetListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # filtering pets by clinic of current user (multi-tenant protection)
        return Pet.objects.select_related("owner").filter(
            owner__clinic=self.request.user.clinic
        )

    def perform_create(self, serializer):
        serializer.save()


class PetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = PetSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # multi-tenant protection, vet only sees pets from his clinic
        return Pet.objects.select_related("owner").filter(
            owner__clinic=self.request.user.clinic
        )


class VaccinationListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = VaccinationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # filtering vaccinations through pet → owner → clinic chain
        return Vaccination.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )


class VaccinationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = VaccinationSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # multi-tenant protection, vet only sees vaccinations from his clinic
        return Vaccination.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )
