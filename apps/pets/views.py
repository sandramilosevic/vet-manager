from rest_framework import generics, permissions
from .models import Pet, Vaccination
from .serializers import PetSerializer, VaccinationSerializer
from apps.accounts.permissions import IsAdmin


class PetListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    # serializer for converting Python into JSON
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # filtering pets by clinic of current user (multi-tenant protection)
        return Pet.objects.filter(owner__clinic=self.request.user.clinic)

    def perform_create(self, serializer):
        # saving object into database
        serializer.save()


class PetDetailView(generics.RetrieveUpdateAPIView):
    """API for GET (single pet) and PUT/PATCH (update) methods."""

    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # multi-tenant protection, vet only sees pets from his clinic
        return Pet.objects.filter(owner__clinic=self.request.user.clinic)


class PetDestroyView(generics.DestroyAPIView):
    """API for DELETE method. Only admins can delete pets."""

    serializer_class = PetSerializer
    # only admins can delete pets
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # admin can only delete pets from his own clinic
        return Pet.objects.filter(owner__clinic=self.request.user.clinic)


class VaccinationListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = VaccinationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # filtering vaccinations through pet → owner → clinic chain
        return Vaccination.objects.filter(pet__owner__clinic=self.request.user.clinic)


class VaccinationDetailView(generics.RetrieveUpdateAPIView):
    """API for GET (single vaccination) and PUT/PATCH (update) methods."""

    serializer_class = VaccinationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # multi-tenant protection, vet only sees vaccinations from his clinic
        return Vaccination.objects.filter(pet__owner__clinic=self.request.user.clinic)


class VaccinationDestroyView(generics.DestroyAPIView):
    """API for DELETE method. Only admins can delete vaccinations."""

    serializer_class = VaccinationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # admin can only delete vaccinations from his own clinic
        return Vaccination.objects.filter(pet__owner__clinic=self.request.user.clinic)
