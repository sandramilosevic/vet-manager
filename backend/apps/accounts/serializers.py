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


class MeSerializer(serializers.ModelSerializer):
    """The signed-in user's own profile.

    Clients previously had to decode the JWT payload to learn who they were,
    because nothing exposed the current user. Everything here is read-only:
    changing a role or a clinic assignment is an admin action and goes through
    the user-detail endpoint.
    """

    clinic_name = serializers.CharField(
        source="clinic.name", read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "clinic",
            "clinic_name",
        ]
        read_only_fields = fields


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
    """Used as the API response after creating an invitation, and for the
    invitation list.

    Deliberately excludes `token` — the token is only ever sent via
    email, never echoed back in an HTTP response, so it can't leak
    through logs, proxies, or browser dev tools. That is also why listing
    invitations is safe: an admin can see who was invited and revoke a
    pending invite without ever being able to accept it on someone's behalf.
    """

    clinic_name = serializers.CharField(source="clinic.name", read_only=True)
    invited_by_email = serializers.CharField(
        source="invited_by.email", read_only=True, default=None
    )
    # `status` stays "sent" until someone accepts it, so a client cannot tell a
    # live invite from a lapsed one without this.
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id",
            "email",
            "clinic_name",
            "role",
            "status",
            "is_expired",
            "invited_by",
            "invited_by_email",
            "created_at",
            "expires_at",
        ]
        read_only_fields = fields


class ErrorResponseSerializer(serializers.Serializer):
    """Generic {"error": "..."} shape returned by the plain APIViews below.
    Used only for schema documentation, not for actual validation.
    """

    error = serializers.CharField()


class MessageResponseSerializer(serializers.Serializer):
    """Generic {"message": "..."} shape returned by several APIViews.
    Used only for schema documentation, not for actual validation.
    """

    message = serializers.CharField()


class AcceptInvitationRequestSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True)


class LogoutRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmRequestSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["role"] = user.role
        token["clinic_id"] = str(user.clinic.id) if user.clinic else None
        token["email"] = user.email

        return token
