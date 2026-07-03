from rest_framework import generics, permissions
from .models import Clinic
from .serializers import ClinicGroupSerializer
from apps.accounts.permissions import IsAdmin
from .filters import ClinicFilter
from django_filters.rest_framework import DjangoFilterBackend


class ClinicView(generics.RetrieveUpdateAPIView):
    """API for GET (all users) and PUT/PATCH (admin only) methods."""

    serializer_class = ClinicGroupSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ClinicFilter

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH"]:
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        return self.request.user.clinic
