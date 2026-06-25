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


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["role"] = user.role
        token["clinic_id"] = str(user.clinic.id) if user.clinic else None
        token["email"] = user.email

        return token
