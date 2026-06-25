from django.urls import path
from .views import SendInvitationView, AcceptInvitationView, RevokeInvitationView

urlpatterns = [
    path("invitations/", SendInvitationView.as_view(), name="send-invitation"),
    path(
        "invitations/accept/", AcceptInvitationView.as_view(), name="accept-invitation"
    ),
    path(
        "invitations/<int:invitation_id>/revoke/",
        RevokeInvitationView.as_view(),
        name="revoke-invitation",
    ),
]
