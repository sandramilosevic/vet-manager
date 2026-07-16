from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics, permissions
from .serializers import (
    InvitationSerializer,
    InvitationResponseSerializer,
    UserSerializer,
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
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.throttling import ScopedRateThrottle


class UserListView(generics.ListAPIView):
    """API for GET (list) method. Only admins can see all users in their clinic."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH and DELETE methods. Only admins can manage users."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin, IsSameClinic]

    def get_queryset(self):
        return User.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )


class SendInvitationView(APIView):
    """Admin sends an invitation to a new user."""

    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invite-send"

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
            return Response(
                InvitationResponseSerializer(invitation).data,
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AcceptInvitationView(APIView):
    """New user accepts an invitation using a token and sets their password."""

    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invite-accept"

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
            return Response(
                {"message": f"Account created for {user.email}"},
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RevokeInvitationView(APIView):
    """Admin revokes a pending invitation."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, invitation_id):
        try:
            revoke_invitation(
                invitation_id=invitation_id,
                requested_by=request.user,
            )
            return Response(
                {"message": "Invitation revoked."}, status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Blacklists the given refresh token so it can no longer be used to obtain new access tokens."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "logout"

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
            return Response(
                {"error": "Invalid or already blacklisted token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_205_RESET_CONTENT)


class ThrottledTokenObtainPairView(TokenObtainPairView):
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

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
            )

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
            return Response(
                {"message": "Password has been reset successfully."},
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
