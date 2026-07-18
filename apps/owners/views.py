from rest_framework import generics, permissions
from .models import Owner
from .serializers import OwnerSerializer
from apps.accounts.permissions import IsAdmin, IsSameClinic
from .filters import OwnerFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter


class OwnerListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = OwnerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = OwnerFilter
    ordering_fields = ["first_name", "last_name", "registration_date"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            # drf-spectacular introspects with an AnonymousUser, which has
            # no .clinic - short-circuit so schema generation doesn't crash.
            return Owner.objects.none()
        # filtering owners by clinic of current user (multi-tenant protection)
        return Owner.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )

    def perform_create(self, serializer):
        # automatically assign clinic from current user on create
        serializer.save(clinic=self.request.user.clinic)


class OwnerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = OwnerSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin(), IsSameClinic()]
        return [permissions.IsAuthenticated(), IsSameClinic()]

    def get_queryset(self):
        # multi-tenant protection, vet only sees owners from his clinic
        return Owner.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )
