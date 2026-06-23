from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Invitation

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializes user data including role and clinic assignment."""

    class Meta:
        model = User
        fields = ["id", "clinic", "email", "role"]
        read_only_fields = ["id"]


class InvitationSerializer(serializers.ModelSerializer):
    """Serializes invitation data. Token, status, invited_by and expires_at are set by the system."""

    class Meta:
        model = Invitation
        fields = [
            "id",
            "email",
            "clinic",
            "role",
            "token",
            "status",
            "invited_by",
            "expires_at",
        ]
        read_only_fields = ["id", "token", "status", "invited_by", "expires_at"]
