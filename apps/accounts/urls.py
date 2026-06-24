from django.urls import path
from .views import SendInvitationView, AcceptInvitationView, RevokeInvitationView

urlpatterns = [
    path("invitations/", SendInvitationView.as_view()),
    path("invitations/accept/", AcceptInvitationView.as_view()),
    path("invitations/<int:invitation_id>/revoke/", RevokeInvitationView.as_view()),
]
