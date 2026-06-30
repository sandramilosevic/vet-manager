from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics, permissions
from .serializers import InvitationSerializer, UserSerializer
from .services import send_invitation, accept_invitation, revoke_invitation
from .permissions import IsAdmin
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


class UserListView(generics.ListAPIView):
    """API for GET (list) method. Only admins can see all users in their clinic."""

    serializer_class = UserSerializer
    # only admins can see list of users
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # return only users from the current user's clinic
        return User.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API for GET, PUT/PATCH and DELETE methods. Only admins can manage users."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.select_related("clinic").filter(
            clinic=self.request.user.clinic
        )


class SendInvitationView(APIView):
    """Admin sends an invitation to a new user."""

    permission_classes = [IsAuthenticated, IsAdmin]

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
                InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AcceptInvitationView(APIView):
    """New user accepts an invitation using a token and sets their password."""

    permission_classes = []  # no auth required, user doesn't have account yet

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
