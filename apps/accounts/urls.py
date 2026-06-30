from django.urls import path
from . import views

urlpatterns = [
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("invitations/", views.SendInvitationView.as_view(), name="send-invitation"),
    path(
        "invitations/accept/",
        views.AcceptInvitationView.as_view(),
        name="accept-invitation",
    ),
    path(
        "invitations/<int:invitation_id>/revoke/",
        views.RevokeInvitationView.as_view(),
        name="revoke-invitation",
    ),
    path("logout/", views.LogoutView.as_view(), name="logout"),
]
