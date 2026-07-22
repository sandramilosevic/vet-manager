from rest_framework import generics, permissions
from .models import Pet, Vaccination
from .serializers import (
    PetHistorySerializer,
    PetSerializer,
    VaccinationHistorySerializer,
    VaccinationSerializer,
)
from apps.accounts.permissions import IsAdmin, IsSameClinic
from apps.common.history import BaseHistoryView
from .filters import PetFilter, VaccinationFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
import logging

logger = logging.getLogger(__name__)


class PetListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = PetFilter
    # No `ordering` default here: OrderingFilter then falls back to the model's
    # Meta.ordering, so existing clients see exactly the order they did before.
    ordering_fields = ["name", "species", "date_of_birth", "birth_year", "created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            # drf-spectacular introspects with an AnonymousUser, which has
            # no .clinic - short-circuit so schema generation doesn't crash.
            return Pet.objects.none()
        # filtering pets by clinic of current user (multi-tenant protection)
        return Pet.objects.select_related("owner").filter(
            owner__clinic=self.request.user.clinic
        )

    def perform_create(self, serializer):
        pet = serializer.save()
        logger.info(
            "Pet created: id=%s name=%s owner_id=%s by user_id=%s",
            pet.id,
            pet.name,
            pet.owner_id,
            self.request.user.id,
        )


class PetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = PetSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin(), IsSameClinic()]
        return [permissions.IsAuthenticated(), IsSameClinic()]

    def get_queryset(self):
        # multi-tenant protection, vet only sees pets from his clinic
        return Pet.objects.select_related("owner").filter(
            owner__clinic=self.request.user.clinic
        )

    def perform_update(self, serializer):
        pet = serializer.save()
        logger.info(
            "Pet updated: id=%s name=%s by user_id=%s",
            pet.id,
            pet.name,
            self.request.user.id,
        )

    def perform_destroy(self, instance):
        logger.warning(
            "Pet deleted: id=%s name=%s owner_id=%s by user_id=%s",
            instance.id,
            instance.name,
            instance.owner_id,
            self.request.user.id,
        )
        instance.delete()


class VaccinationListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = VaccinationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = VaccinationFilter
    ordering_fields = ["next_due", "date_given", "vaccine_name"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            # drf-spectacular introspects with an AnonymousUser, which has
            # no .clinic - short-circuit so schema generation doesn't crash.
            return Vaccination.objects.none()
        # filtering vaccinations through pet → owner → clinic chain
        return Vaccination.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )

    def perform_create(self, serializer):
        vaccination = serializer.save()
        logger.info(
            "Vaccination created: id=%s vaccine_name=%s pet_id=%s by user_id=%s",
            vaccination.id,
            vaccination.vaccine_name,
            vaccination.pet_id,
            self.request.user.id,
        )


class VaccinationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = VaccinationSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin(), IsSameClinic()]
        return [permissions.IsAuthenticated(), IsSameClinic()]

    def get_queryset(self):
        # multi-tenant protection, vet only sees vaccinations from his clinic
        return Vaccination.objects.select_related("pet__owner").filter(
            pet__owner__clinic=self.request.user.clinic
        )

    def perform_update(self, serializer):
        vaccination = serializer.save()
        logger.info(
            "Vaccination updated: id=%s vaccine_name=%s by user_id=%s",
            vaccination.id,
            vaccination.vaccine_name,
            self.request.user.id,
        )

    def perform_destroy(self, instance):
        logger.warning(
            "Vaccination deleted: id=%s vaccine_name=%s pet_id=%s by user_id=%s",
            instance.id,
            instance.vaccine_name,
            instance.pet_id,
            self.request.user.id,
        )
        instance.delete()


class PetHistoryView(BaseHistoryView):
    """Every recorded revision of one pet, newest first."""

    serializer_class = PetHistorySerializer

    def get_scoped_queryset(self):
        # Same clinic scoping as PetDetailView: a pet from another practice
        # 404s here rather than revealing that it exists.
        return Pet.objects.filter(owner__clinic=self.request.user.clinic)


class VaccinationHistoryView(BaseHistoryView):
    """Every recorded revision of one vaccination, newest first."""

    serializer_class = VaccinationHistorySerializer

    def get_scoped_queryset(self):
        return Vaccination.objects.filter(pet__owner__clinic=self.request.user.clinic)
