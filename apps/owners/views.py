from rest_framework import generics, permissions
from .models import Owner
from .serializers import OwnerSerializer
from apps.accounts.permissions import IsAdmin


class OwnerListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    # serializer for converting Python into JSON
    serializer_class = OwnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # filtering owners by clinic of current user (multi-tenant protection)
        return Owner.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )

    def perform_create(self, serializer):
        # automatically assign clinic from current user on create
        serializer.save(clinic=self.request.user.clinic)


class OwnerDetailView(generics.RetrieveUpdateAPIView):
    """API for GET (single owner) and PUT/PATCH (update) methods."""

    serializer_class = OwnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # multi-tenant protection, vet only sees owners from his clinic
        return Owner.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )


class OwnerDestroyView(generics.DestroyAPIView):
    """API for DELETE method. Only admins can delete owners."""

    serializer_class = OwnerSerializer
    # only admins can delete owners
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # admin can only delete owners from his own clinic
        return Owner.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )
