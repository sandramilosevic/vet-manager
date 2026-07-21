from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics, permissions
from rest_framework.exceptions import ValidationError
from django.db.models import ProtectedError
from .serializers import (
    InvitationSerializer,
    InvitationResponseSerializer,
    UserSerializer,
    ErrorResponseSerializer,
    MessageResponseSerializer,
    AcceptInvitationRequestSerializer,
    LogoutRequestSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmRequestSerializer,
)
from .services import (
    send_invitation,
    accept_invitation,
    revoke_invitation,
    request_password_reset,
    confirm_password_reset,
)
from .permissions import IsAdmin, IsSameClinic
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.throttling import ScopedRateThrottle
import logging

logger = logging.getLogger(__name__)


class UserListView(generics.ListAPIView):
    """API for GET (list) method. Only admins can see all users in their clinic."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        return User.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH and DELETE methods. Only admins can manage users."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin, IsSameClinic]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        return User.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )

    def perform_update(self, serializer):
        user = serializer.save()
        logger.info(
            "User updated: id=%s by user_id=%s",
            user.id,
            self.request.user.id,
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        logger.warning(
            "User deactivated: id=%s clinic_id=%s by user_id=%s",
            instance.id,
            instance.clinic_id,
            self.request.user.id,
        )


class SendInvitationView(APIView):
    """Admin sends an invitation to a new user."""

    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invite-send"

    @extend_schema(
        request=InvitationSerializer,
        responses={
            201: InvitationResponseSerializer,
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        serializer = InvitationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            invitation = send_invitation(
                email=serializer.validated_data["email"],
                clinic=request.user.clinic,
                role=serializer.validated_data["role"],
                invited_by=request.user,
            )
            logger.info(
                "Invitation sent: id=%s email=%s role=%s clinic_id=%s by user_id=%s",
                invitation.id,
                serializer.validated_data["email"],
                serializer.validated_data["role"],
                request.user.clinic_id,
                request.user.id,
            )
            return Response(
                InvitationResponseSerializer(invitation).data,
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            logger.warning(
                "Invitation send failed: email=%s by user_id=%s error=%s",
                serializer.validated_data.get("email"),
                request.user.id,
                str(e),
            )
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AcceptInvitationView(APIView):
    """New user accepts an invitation using a token and sets their password."""

    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invite-accept"

    @extend_schema(
        request=AcceptInvitationRequestSerializer,
        responses={
            201: MessageResponseSerializer,
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        token = request.data.get("token")
        password = request.data.get("password")

        if not token or not password:
            return Response(
                {"error": "Token and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = accept_invitation(token=token, password=password)
            logger.info(
                "Invitation accepted: user_id=%s email=%s",
                user.id,
                user.email,
            )
            return Response(
                {"message": f"Account created for {user.email}"},
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            logger.warning("Invitation accept failed: error=%s", str(e))
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RevokeInvitationView(APIView):
    """Admin revokes a pending invitation."""

    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(
        request=None,
        responses={
            200: MessageResponseSerializer,
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request, invitation_id):
        try:
            revoke_invitation(
                invitation_id=invitation_id,
                requested_by=request.user,
            )
            logger.info(
                "Invitation revoked: invitation_id=%s by user_id=%s",
                invitation_id,
                request.user.id,
            )
            return Response(
                {"message": "Invitation revoked."}, status=status.HTTP_200_OK
            )
        except ValueError as e:
            logger.warning(
                "Invitation revoke failed: invitation_id=%s by user_id=%s error=%s",
                invitation_id,
                request.user.id,
                str(e),
            )
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Blacklists the given refresh token so it can no longer be used to obtain new access tokens."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "logout"

    @extend_schema(
        request=LogoutRequestSerializer,
        responses={
            205: None,
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"error": "Refresh token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            logger.warning(
                "Logout failed: invalid/blacklisted token, user_id=%s",
                request.user.id,
            )
            return Response(
                {"error": "Invalid or already blacklisted token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info("User logged out: user_id=%s", request.user.id)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "token-refresh"


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """View for login, protected with throttling against rapid requests."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class PasswordResetRequestView(APIView):
    """Starts the password reset flow: accepts an email and always
    responds the same way, whether or not that email is registered.

    See services.request_password_reset for why this doesn't check
    or report existence directly.
    """

    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password-reset-request"

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={
            200: MessageResponseSerializer,
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        logger.info("Password reset requested: email=%s", email)
        request_password_reset(email)
        return Response(
            {
                "message": "If an account exists for this email, a reset link has been sent."
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Finishes the password reset flow: validates the uid/token from the
    email link and sets the new password."""

    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password-reset-confirm"

    @extend_schema(
        request=PasswordResetConfirmRequestSerializer,
        responses={
            200: MessageResponseSerializer,
            400: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("password")

        if not all([uidb64, token, new_password]):
            return Response(
                {"error": "uid, token and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            confirm_password_reset(uidb64, token, new_password)
            logger.info("Password reset confirmed: uid=%s", uidb64)
            return Response(
                {"message": "Password has been reset successfully."},
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            logger.warning(
                "Password reset confirm failed: uid=%s error=%s", uidb64, str(e)
            )
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
