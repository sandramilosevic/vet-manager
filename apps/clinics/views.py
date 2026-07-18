from rest_framework import generics, permissions
from .models import Clinic
from .serializers import ClinicGroupSerializer, ClinicSerializer
from apps.accounts.permissions import IsAdmin, IsSameClinic
from .filters import ClinicFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import NotFound


class ClinicView(generics.RetrieveUpdateAPIView):
    """API for GET (all users) and PUT/PATCH (admin only) methods on the
    tenant itself (ClinicGroup) — e.g. renaming the overall practice/franchise.
    """

    serializer_class = ClinicGroupSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH"]:
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        if self.request.user.clinic is None:
            raise NotFound("User does not have an associated clinic.")
        return self.request.user.clinic


class ClinicListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) on individual Clinic locations
    belonging to the current user's ClinicGroup. Filtering (name/city) uses
    ClinicFilter, which matches this view's model.
    """

    serializer_class = ClinicSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ClinicFilter

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        group = getattr(self.request.user, "clinic", None)
        if group is None:
            return Clinic.objects.none()
        return Clinic.objects.filter(group=group)

    def perform_create(self, serializer):
        # Force the new location into the admin's own tenant, regardless of
        # what the client sends in the "group" field, to prevent an admin
        # from creating a Clinic under a different ClinicGroup's id.
        serializer.save(group=self.request.user.clinic)


class ClinicDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET (all users) and PUT/PATCH/DELETE (admin only) on a single
    Clinic location. Tenant-scoped: only locations under the current user's
    ClinicGroup are visible or editable.
    """

    serializer_class = ClinicSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [permissions.IsAuthenticated(), IsAdmin(), IsSameClinic()]
        return [permissions.IsAuthenticated(), IsSameClinic()]

    def get_queryset(self):
        group = getattr(self.request.user, "clinic", None)
        if group is None:
            return Clinic.objects.none()
        return Clinic.objects.filter(group=group)
