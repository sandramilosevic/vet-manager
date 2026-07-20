from django.utils import timezone
from rest_framework import generics, permissions
from .models import Owner
from .serializers import OwnerSerializer
from apps.accounts.permissions import IsAdmin, IsSameClinic
from .filters import OwnerFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
import logging

logger = logging.getLogger(__name__)


class OwnerListCreateView(generics.ListCreateAPIView):
    """API for GET (list) and POST (create) methods."""

    serializer_class = OwnerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = OwnerFilter
    ordering_fields = ["first_name", "last_name", "registration_date"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Owner.objects.none()
        return Owner.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic, is_deleted=False
        )

    def perform_create(self, serializer):
        owner = serializer.save(clinic=self.request.user.clinic)
        logger.info(
            "Owner created: id=%s clinic_id=%s by user_id=%s",
            owner.id,
            owner.clinic_id,
            self.request.user.id,
        )


class OwnerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH (all users) and DELETE (admin only) methods."""

    serializer_class = OwnerSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdmin(), IsSameClinic()]
        return [permissions.IsAuthenticated(), IsSameClinic()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Owner.objects.none()
        return Owner.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic, is_deleted=False
        )

    def perform_update(self, serializer):
        owner = serializer.save()
        logger.info(
            "Owner updated: id=%s by user_id=%s",
            owner.id,
            self.request.user.id,
        )

    def perform_destroy(self, instance):
        logger.warning(
            "Owner soft-deleted: id=%s clinic_id=%s by user_id=%s",
            instance.id,
            instance.clinic_id,
            self.request.user.id,
        )
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])
