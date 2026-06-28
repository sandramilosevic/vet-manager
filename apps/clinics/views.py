from rest_framework import generics, permissions
from .models import Clinic, WorkingHours
from .serializers import ClinicSerializer, WorkingHoursSerializer
from apps.accounts.permissions import IsAdmin


class ClinicView(generics.RetrieveUpdateAPIView):
    """API for GET (all users) and PUT/PATCH (admin only) methods."""

    serializer_class = ClinicSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH"]:
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        return self.request.user.clinic


class WorkingHoursListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = WorkingHoursSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # return working hours only for the current user's clinic
        return WorkingHours.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )

    def perform_create(self, serializer):
        # automatically assign clinic from current user on create
        serializer.save(clinic=self.request.user.clinic)


class WorkingHoursDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH and DELETE methods. Only admins can update and delete."""

    serializer_class = WorkingHoursSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return WorkingHours.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )
