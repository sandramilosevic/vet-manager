import django_filters
from .models import Invitation


class InvitationFilter(django_filters.FilterSet):
    """Filters for the invitation list.

    `pending` is a convenience for the common admin question — "who still owes
    me an answer?" — which `status=sent` alone can't express, because an
    invitation keeps that status after its `expires_at` has passed.
    """

    pending = django_filters.BooleanFilter(
        method="filter_pending",
        label="Only invitations that are still usable",
    )

    class Meta:
        model = Invitation
        fields = {
            "email": ["icontains"],
            "status": ["exact"],
            "role": ["exact"],
        }

    def filter_pending(self, queryset, name, value):
        from django.utils import timezone

        if value is None:
            return queryset
        if value:
            return queryset.filter(status="sent", expires_at__gt=timezone.now())
        return queryset.exclude(status="sent", expires_at__gt=timezone.now())
