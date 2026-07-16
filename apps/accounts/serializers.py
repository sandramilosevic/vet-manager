from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Invitation
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializes user data including role and clinic assignment."""

    class Meta:
        model = User
        fields = ["id", "clinic", "email", "role"]
        read_only_fields = ["id", "clinic"]


class InvitationSerializer(serializers.ModelSerializer):
    """Serializes invitation data. Token, status, invited_by and expires_at are set by the system."""

    clinic_name = serializers.CharField(source="clinic.name", read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id",
            "email",
            "clinic_name",
            "role",
            "token",
            "status",
            "invited_by",
            "expires_at",
        ]
        read_only_fields = ["id", "token", "status", "invited_by", "expires_at"]


class InvitationResponseSerializer(serializers.ModelSerializer):
    """Used only as the API response after creating an invitation.
    Deliberately excludes `token` — the token is only ever sent via
    email, never echoed back in an HTTP response, so it can't leak
    through logs, proxies, or browser dev tools.
    """

    clinic_name = serializers.CharField(source="clinic.name", read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id",
            "email",
            "clinic_name",
            "role",
            "status",
            "invited_by",
            "expires_at",
        ]
        read_only_fields = fields


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["role"] = user.role
        token["clinic_id"] = str(user.clinic.id) if user.clinic else None
        token["email"] = user.email

        return token
