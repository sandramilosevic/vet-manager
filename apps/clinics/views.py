from rest_framework import generics, permissions
from .models import Clinic, ClinicGroup, WorkingHours
from .serializers import ClinicSerializer, ClinicGroupSerializer, WorkingHoursSerializer
from apps.accounts.permissions import IsAdmin


class ClinicDetailView(generics.RetrieveAPIView):
    """API for GET (single clinic) method. All authenticated users can view their clinic."""

    serializer_class = ClinicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # return the clinic of the current user directly
        return self.request.user.clinic


class ClinicUpdateView(generics.RetrieveUpdateAPIView):
    """API for GET and PUT/PATCH (update) methods. Only admins can update clinic info."""

    serializer_class = ClinicSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # admin can only update his own clinic
        return Clinic.objects.filter(id=self.request.user.clinic.id)


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


class WorkingHoursDetailView(generics.RetrieveUpdateAPIView):
    """API for GET and PUT/PATCH (update) methods. Only admins can update working hours."""

    serializer_class = WorkingHoursSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # admin can only update working hours of his own clinic
        return WorkingHours.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )


class WorkingHoursDestroyView(generics.DestroyAPIView):
    """API for DELETE method. Only admins can delete working hours."""

    serializer_class = WorkingHoursSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # admin can only delete working hours of his own clinic
        return WorkingHours.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )
